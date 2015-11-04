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

  this.modules = [];
  this.emitModules = [];
  this.dependencies = [];
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
  var context = this.context;

  function create(callback) {
    mkdirp(directory, callback);
  }

  // 读取缓存日志
  function load(made, callback) {
    fs.readFile(path.resolve(directory, 'miaow.cache.json'), {encoding: 'utf-8'}, function(err, data) {
      var modules = [];
      var emitModules = [];
      var dependencies = [];

      try {
        var info = JSON.parse(data || '{"modules": {}}');

        if (
          info.version === pkg.version &&
          info.key === key
        ) {
          modules = info.modules || [];
          emitModules = info.emitModules || [];
          dependencies = info.dependencies || [];
        }
      } catch (err) {
      }

      callback(null, modules, emitModules, dependencies);
    });
  }

  // 筛选掉那些失效的缓存
  function filter(modules, emitModules, dependencies, callback) {
    function filterModules(modules, cacheKey, moduleKey, callback) {
      async.filter(
        modules,
        function(module, callback) {
          if (module[cacheKey]) {
            fs.readFile(path.resolve(directory, module[cacheKey]), function(err, data) {
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
          cache[moduleKey] = modules;
          callback();
        });
    }

    function filterDependencies(callback) {
      async.filter(
        dependencies,
        function(dependency, callback) {
          fs.readFile(path.resolve(context, dependency.src), function(err, data) {
            callback(!err && mutil.hash(data) === dependency.srcHash);
          });
        },

        function(dependencies) {
          cache.dependencies = dependencies;
          callback();
        }
      );
    }

    async.parallel([
      filterModules.bind(filterModules, modules, 'cached', 'modules'),
      filterModules.bind(filterModules, emitModules, 'emitCached', 'emitModules'),
      filterDependencies
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
      var cachedModule = _.find(cachedModules, {src: module.src, srcHash: module.srcHash});

      // 如果没有查询到
      if (!cachedModule) {
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
          var module = _.find(modules, {src: dependency});
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
                return {src: src, contents: _.find(cache.emitModules, {src: src}).contents};
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

  var modules = _.filter(compilation.modules, {cacheable: true});
  var emitModules = compilation.emitModules;

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
      doWrite.bind(doWrite, _.filter(modules, {cached: null}), 'cached', 'contents'),// 保存模块
      doWrite.bind(doWrite, emitModules, 'emitCached', 'srcContents')// 保存创建的模块
    ], callback);
  }

  // 保存缓存日志
  function save(callback) {
    var info = {
      version: pkg.version,
      key: key,
      modules: _.map(_.sortBy(modules, 'src'), function(module) {
        return _.pick(
          module,
          ['src', 'srcHash', 'dest', 'destHash', 'dependencies', 'emitModules', 'emitFiles', 'cached', 'url', 'extra']
        );
      }),

      emitModules: _.map(_.sortBy(emitModules, 'src'), function(module) {
        return _.pick(module, ['src', 'emitCached']);
      })
    };

    fs.writeFile(path.resolve(directory, 'miaow.cache.json'), JSON.stringify(info, null, '  '), callback);
  }

  // 清理多余的缓存文件
  function clean(callback) {
    fs.readdir(directory, function(err, files) {
      files = _.filter(files || [], function(file) {
        return file !== 'miaow.cache.json' && !_.find(modules, {cached: file}) && !_.find(emitModules, {emitCached: file});
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
