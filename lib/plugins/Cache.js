var _ = require('lodash');
var async = require('async');
var fs = require('fs');
var mkdirp = require('mkdirp');
var mutil = require('miaow-util');
var console = mutil.console;
var path = require('path');
var uuid = require('uuid');

var pkg = require('../../package.json');

function emitModuleTask(options, callback) {
  var context = this;

  async.each(options.modules || [], function(module, callback) {
    context.emitModule(module.src, module.contents, callback);
  }, callback);
}

function assignTask(options, callback) {
  _.assign(
    this,
    _.pick(
      options.module,
      ['src', 'srcHash', 'dest', 'destHash', 'contents', 'dependencies', 'emitModules', 'emitFiles', 'url', 'extra']
    )
  );
  callback();
}

function Cache(key, directory, context, output) {
  this.key = key;
  this.directory = path.resolve(directory);
  this.context = context;
  this.output = path.resolve(output);

  this.modules = {};
  this.emitModules = {};
}

Cache.prototype.apply = function(compiler) {
  var cache = this;

  compiler.plugin('run', this.prepare.bind(this));
  compiler.plugin('watch', this.prepare.bind(this));

  compiler.plugin('compile', function(compilation, callback) {
    compilation.plugin('build-module', function(module, taskContext, callback) {
      cache.inject(module, taskContext, compilation, callback);
    });

    callback();
  });

  compiler.plugin('compile-success', this.save.bind(this));
};

// 读取缓存结果
Cache.prototype.prepare = function(callback) {
  var cache = this;
  var key = this.key;
  var directory = this.directory;

  function create(callback) {
    mkdirp(directory, callback);
  }

  // 读取缓存日志
  function load(made, callback) {
    fs.readFile(path.resolve(directory, 'miaow.cache.json'), {encoding: 'utf-8'}, function(err, data) {
      var modules = {};
      var emitModules = {};

      try {
        var info = JSON.parse(data || '{"modules": {}}');

        if (
          info.version === pkg.version &&
          info.key === key
        ) {
          modules = info.modules || {};
          emitModules = info.emitModules || {};
        }
      } catch (err) {
      }

      callback(null, modules, emitModules);
    });
  }

  // 筛选掉那些失效的缓存
  function filter(modules, emitModules, callback) {
    function filterModules(modules, cacheKey, moduleKey, callback) {
      var result = {};

      async.forEachOf(
        modules,
        function(module, src, callback) {
          if (module[cacheKey]) {
            fs.readFile(path.resolve(directory, module[cacheKey]), function(err, data) {
              if (!err) {
                module.contents = data;
                result[src] = module;
              }

              callback();
            });
          } else {
            callback();
          }
        },

        function() {
          cache[moduleKey] = result;
          callback();
        });
    }

    async.parallel([
      filterModules.bind(filterModules, modules, 'cached', 'modules'),
      filterModules.bind(filterModules, emitModules, 'emitCached', 'emitModules')
    ], callback);
  }

  async.waterfall([create, load, filter], callback);
};

// 注入缓存结果
Cache.prototype.inject = function(module, taskContext, compilation, callback) {
  var cache = this;
  var cachedModules = this.modules;

  function inject(module, callback) {
    var modules = compilation.modules;

    if (!_.isUndefined(module.cached)) {
      return callback(!!module.cached);
    }

    function detect(callback) {
      var cachedModule = cachedModules[module.src];

      // 如果没有查询到, 或是内容发生了变化
      if (!cachedModule || cachedModule.srcHash !== module.srcHash) {
        return callback();
      }

      // 如果没有依赖
      if (cachedModule.dependencies.length === 0) {
        return callback(cachedModule);
      }

      async.everyLimit(
        cachedModule.dependencies, 1,
        function(dependency, callback) {
          // 如果是已有的模块，那就递归判断是否已修改
          var module = modules[dependency];
          if (module) {
            return inject(module, callback);
          }

          compilation.resolveModule(compilation.context, './' + dependency, function(err, module) {
            if (err) {
              return callback(false);
            }

            inject(module, callback);
          });
        },

        function(cached) {
          callback(cached ? cachedModule : null);
        });
    }

    detect(function(cachedModule) {
      if (cachedModule) {
        // 只保留创建模块和属性拷贝任务
        module.tasks = [
          {
            task: emitModuleTask,
            options: {
              modules: cachedModule.emitModules.map(function(src) {
                return {src: src, contents: cache.emitModules[src].contents};
              })
            }
          },
          {
            task: assignTask,
            options: {module: cachedModule}
          }
        ];

        // 设置缓存标志
        module.cached = cachedModule.cached;
      } else {
        // 设置缓存标志
        module.cached = null;
      }

      callback(!!module.cached);
    });
  }

  inject(module, function() {
    callback();
  });
};

// 缓存编译结果
Cache.prototype.save = function(compilation, callback) {
  console.log('缓存编译结果');

  var key = this.key;
  var directory = this.directory;

  var modules = {};
  var modulesArray = [];
  _.each(compilation.modules, function(module, src) {
    if (module.cacheable) {
      modules[src] = module;
      modulesArray.push(module);
    }
  });

  var emitModules = compilation.emitModules;
  var emitModulesArray = _.values(emitModules);

  this.modules = modules;
  this.emitModules = emitModules;

  // 保存编译结果
  function write(callback) {
    function doWrite(modules, cacheKey, contentsKey, callback) {
      async.each(modules, function(module, callback) {
        module[cacheKey] = uuid.v1();

        fs.writeFile(path.resolve(directory, module[cacheKey]), module[contentsKey], callback);
      }, callback);
    }

    async.parallel([
      doWrite.bind(doWrite, _.filter(modulesArray, {cached: null}), 'cached', 'contents'),// 保存模块
      doWrite.bind(doWrite, emitModulesArray, 'emitCached', 'srcContents')// 保存创建的模块
    ], callback);
  }

  // 保存缓存日志
  function save(callback) {
    var info = {
      version: pkg.version,
      key: key,
      modules: {},
      emitModules: {}
    };

    _.each(modules, function(module, src) {
      info.modules[src] = _.pick(
        module,
        ['src', 'srcHash', 'dest', 'destHash', 'dependencies', 'emitModules', 'emitFiles', 'cached', 'url', 'extra']
      );
    });

    _.each(emitModules, function(module, src) {
      info.emitModules[src] = _.pick(module, ['src', 'emitCached']);
    });

    fs.writeFile(path.resolve(directory, 'miaow.cache.json'), JSON.stringify(info, null, '  '), callback);
  }

  // 清理多余的缓存文件
  function clean(callback) {
    fs.readdir(directory, function(err, files) {
      files = _.filter(files || [], function(file) {
        var notCacheFile = file !== 'miaow.cache.json';
        var notCacheModule = !_.find(modulesArray, {cached: file});
        var notCacheEmit = !_.find(emitModulesArray, {emitCached: file});

        return notCacheFile && notCacheModule && notCacheEmit;
      }).map(function(file) {
        return path.resolve(directory, file);
      });

      async.each(files, fs.unlink.bind(fs), callback);
    });
  }

  async.series([write, save, clean], function(err) {
    if (err) {
      console.warn('缓存编译结果失败');
      console.warn(err);
    }

    callback();
  });
};

module.exports = Cache;
