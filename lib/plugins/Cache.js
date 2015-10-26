var _ = require('lodash');
var async = require('async');
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var uuid = require('uuid');

var pkg = require('../../package.json');
var destTask = require('../tasks/dest');

function emitModuleTask(options, callback) {
  var context = this;

  async.each(options.modules || [], function(module, callback) {
    context.emitModule(module.src, module.contents, callback);
  }, callback);
}

function Cache(directory) {
  this.directory = path.resolve(directory);
  this.modules = [];
}

Cache.prototype.apply = function(compiler) {
  var cache = this;

  compiler.plugin('run', this.prepare.bind(this));
  compiler.plugin('watch', this.prepare.bind(this));

  compiler.plugin('compile', function(compilation, callback) {
    compilation.plugin('build-module', function(module, callback) {
      cache.inject(module, compilation.modules, callback);
    });

    callback();
  });

  compiler.plugin('compile-success', this.save.bind(this));
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
      var emitModules = [];

      try {
        var info = JSON.parse(data || '{"modules": {}}');

        if (info.version === pkg.version) {
          modules = info.modules || [];
          emitModules = info.emitModules || [];
        }
      } catch (err) {
      }

      callback(null, modules, emitModules);
    });
  }

  function filter(modules, emitModules, callback) {
    function doFilter(modules, cacheKey, moduleKey, callback) {
      async.filter(
        modules,
        function(module, callback) {
          fs.readFile(path.resolve(directory, module[cacheKey]), function(err, data) {
            if (!err) {
              module.contents = data;
            }

            callback(!err);
          });
        },

        function(modules) {
          cache[moduleKey] = modules;
          callback();
        });
    }

    async.parallel([
      doFilter.bind(doFilter, modules, 'cached', 'modules'),
      doFilter.bind(doFilter, emitModules, 'emitCached', 'emitModules')
    ], callback);
  }

  async.waterfall([create, load, filter], callback);
};

Cache.prototype.inject = function(module, modules, callback) {
  var cache = this;
  var cachedModules = this.modules;

  function inject(module) {
    if (!_.isUndefined(module.cached)) {
      return !!module.cached;
    }

    var cachedModule = _.find(cachedModules, {src: module.src});

    function detectFileDependencies() {
      return cachedModule.fileDependencies.length === 0 ||
        _.every(cachedModule.fileDependencies, function(fileDependency) {
          var dependency = _.find(modules, {src: fileDependency});
          return dependency && !!inject(dependency);
        });
    }

    if (
      cachedModule &&
      cachedModule.srcHash === module.srcHash &&
      cachedModule.tasksSerialization === module.tasksSerialization &&
      detectFileDependencies()
    ) {
      // 使用缓存的内容
      module.contents = cachedModule.contents;

      // 只保留输出任务
      module.tasks = [{task: destTask, options: {}}];

      if (cachedModule.emitModules.length > 0) {
        module.tasks.unshift({
          task: emitModuleTask,
          options: {
            modules: cachedModule.emitModules.map(function(src) {
              return {
                src: src,
                contents: _.find(cache.emitModules, {src: src}).contents
              };
            })
          }
        });
      }

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

  var modules = _.filter(compilation.modules, {cacheable: true});
  var emitModules = compilation.emitModules;

  var newModules = _.filter(modules, {cached: null});

  this.modules = modules;

  function writeModules(callback) {
    async.each(newModules, function(module, callback) {
      module.cached = uuid.v1();

      fs.writeFile(path.resolve(directory, module.cached), module.contents, callback);
    }, callback);
  }

  function writeEmitModules(callback) {
    async.each(emitModules, function(module, callback) {
      module.emitCached = uuid.v1();

      fs.writeFile(path.resolve(directory, module.emitCached), module.srcContents, callback);
    }, callback);
  }

  function save(callback) {
    var info = {
      version: pkg.version,
      modules: _.map(modules, function(module) {
        return _.pick(
          module,
          ['src', 'srcHash', 'dest', 'destHash', 'tasksSerialization', 'fileDependencies', 'emitModules', 'cached']
        );
      }),

      emitModules: _.map(emitModules, function(module) {
        return _.pick(
          module,
          ['src', 'emitCached']
        );
      })
    };

    fs.writeFile(path.resolve(directory, 'miaow.cache.json'), JSON.stringify(info, null, '  '), callback);
  }

  function clean(callback) {
    fs.readdir(directory, function(err, files) {
      files = _.filter(files || [], function(file) {
        return file !== 'miaow.cache.json' && !_.find(modules, {cached: file}) && !_.find(emitModules, {emitCached: file});
      }).map(function(file) {
        return path.resolve(directory, file);
      });

      async.each(files, fs.unlink.bind(fs), function() {
        callback();
      });
    });
  }

  async.series([writeModules, writeEmitModules, save, clean], callback);
};

module.exports = Cache;
