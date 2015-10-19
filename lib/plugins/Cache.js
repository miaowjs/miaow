var _ = require('lodash');
var async = require('async');
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var uuid = require('uuid');

var pkg = require('../../package.json');

function Cache(directory) {
  _.bindAll(this);

  this.directory = path.resolve(directory);
  this.modules = [];
}

Cache.prototype.apply = function(compiler) {
  var cache = this;

  compiler.plugin('run', this.prepare);
  compiler.plugin('watch', this.prepare);

  compiler.plugin('compile', function(compilation, callback) {
    compilation.plugin('build-module', function(module, callback) {
      cache.inject(module, compilation.modules, callback);
    });
    callback();
  });

  compiler.plugin('compile-success', cache.save);
};

Cache.prototype.prepare = function(callback) {
  var cache = this;
  var directory = this.directory;

  function create(callback) {
    mkdirp(directory, callback);
  }

  function load(made, callback) {
    fs.readFile(path.resolve(directory, 'miaow.cache.json'), {encoding: 'utf-8'}, function(err, data) {
      var modules = [];

      try {
        var info = JSON.parse(data || '{"modules": {}}');

        if (info.version === pkg.version) {
          modules = info.modules;
        }
      } catch (err) {
      }

      callback(null, modules);
    });
  }

  function filter(modules, callback) {
    async.filter(
      modules,
      function(module, callback) {
        if (module.cached) {
          fs.readFile(path.resolve(directory, module.cached), function(err, data) {
            if (!err) {
              module.contents = data;
            }

            callback(!err);
          });
        } else {
          callback(false);
        }
      },

      function(modules) {
        cache.modules = modules;
        callback();
      });
  }

  async.waterfall([create, load, filter], callback);
};

Cache.prototype.inject = function(module, modules, callback) {
  var cachedModules = this.modules;

  function inject(module) {
    if (!_.isUndefined(module.cached)) {
      return !!module.cached;
    }

    var cachedModule = _.find(cachedModules, {src: module.src});

    if (
      cachedModule &&
      cachedModule.srcHash === module.srcHash &&
      cachedModule.tasksSerialization === module.tasksSerialization &&
      (cachedModule.fileDependencies.length === 0 ||
      _.every(cachedModule.fileDependencies, function(fileDependency) {
        var dependency = _.find(modules, {src: fileDependency});
        return dependency && !!inject(dependency);
      }))
    ) {
      // 使用缓存的内容
      module.contents = cachedModule.contents;

      // 只保留输出任务
      module.tasks = module.tasks.slice(-1);

      // 设置缓存标志
      module.cached = cachedModule.cached;
    } else {
      // 设置缓存标志
      module.cached = null;
    }

    return module.cached;
  }

  inject(module);

  callback(null);
};

Cache.prototype.save = function(compilation, callback) {
  var directory = this.directory;
  var console = this.console;

  console.log('缓存编译结果');

  var modules = _.filter(compilation.modules, {cacheable: true});

  var newModules = _.filter(modules, {cached: null});

  this.modules = modules;

  function write(callback) {
    async.each(newModules, function(module, callback) {
      module.cached = uuid.v1();

      fs.writeFile(path.resolve(directory, module.cached), module.contents, callback);
    }, callback);
  }

  function save(callback) {
    var info = {
      version: pkg.version,
      modules: _.map(modules, function(module) {
        return _.pick(
          module,
          ['src', 'srcHash', 'dest', 'destHash', 'tasksSerialization', 'fileDependencies', 'cached']
        );
      })
    };

    fs.writeFile(path.resolve(directory, 'miaow.cache.json'), JSON.stringify(info, null, '  '), callback);
  }

  function clean(callback) {
    fs.readdir(directory, function(err, files) {
      files = _.filter(files || [], function(file) {
        return file !== 'miaow.cache.json' && !_.find(modules, {cached: file});
      }).map(function(file) {
        return path.resolve(directory, file);
      });

      async.each(files, fs.unlink.bind(fs), function() {
        callback();
      });
    });
  }

  async.series([write, save, clean], callback);
};

module.exports = Cache;
