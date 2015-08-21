var _ = require('lodash');
var async = require('async');
var chalk = require('chalk');
var events = require('events');
var fs = require('fs-extra');
var mutil = require('miaow-util');
var path = require('path');
var Promise = require('promise');
var temp = require('temp');
var url = require('url');
var util = require('util');

temp.track();

/**
 * 模块
 *
 * 模块是处理文件的单元,每个文件都被抽象成模块
 *
 * @param {String} srcPath 待处理的文件对象或是路径
 * @param {Object} config 配置信息
 * @param {Cache} cache 缓存组件
 * @param {Buffer} [contents] 文件内容
 * @constructor
 */
function Module(srcPath, config, cache, contents) {
  // 绑定所有上下文
  _.bindAll(this);

  this.config = config;
  this.cache = cache;

  this.srcPath = mutil.relative('', srcPath);
  this.contents = contents || fs.readFileSync(this.srcAbsPath);

  // 依赖的模块列表
  this.dependList = [];

  // 需要打包的模块列表
  this.packList = [];

  // 钩子, 会在生成文件前执行
  this.hooks = [];

  // 获取一些模块配置
  var moduleOptions = this.moduleOptions = {};
  _.each(['road', 'tasks'], function (name) {
    moduleOptions[name] = getModuleOption(config, 'module.' + name, srcPath);
  });

  function getModuleOption(config, path, relativeFilePath) {
    return _.find(_.result(config, path) || [], function (item) {
        return item.test.test(relativeFilePath);
      }) || {};
  }

  // 监听变化
  this.cache.on('change', this.detectChange);

  // 取消事件监听的个数限制
  this.setMaxListeners(0);
}

Module.getInstance = function (srcPath, config, cache, contents) {
  var module = cache.get(srcPath);
  if (!module) {
    module = new Module(srcPath, config, cache, contents);

    // 添加缓存
    cache.add(module);
  }

  return module;
};

util.inherits(Module, events.EventEmitter);

/**
 * 执行任务
 */
Module.prototype.runTasks = function (cb) {
  var tasks = this.moduleOptions.tasks.plugins;

  if (tasks) {
    mutil.execPlugins(this, tasks, {timeout: 120e3}, cb);
  } else {
    cb();
  }
};

Module.prototype.getContents = function (cb) {
  var cache = this.cache;
  // 获取产出的内容
  function getAllPackModules(module) {
    var result = [];

    module.packList.forEach(function (packSrcPath) {
      var packModule = cache.get(packSrcPath);
      result = result.concat(getAllPackModules(packModule)).concat(packModule);
    });

    return result;
  }

  var module = this;
  async.eachSeries(this.hooks, function (hook, cb) {
    hook(cb);
  }, function (err) {
    if (err) {
      return cb(err);
    }

    if (module.packList.length) {
      cb(_.uniq(getAllPackModules(module))
        .map(function (packModule) {
          return packModule.atomContents.toString();
        })
        .concat(module.contents.toString())
        .join('\n'));
    } else {
      cb(module.contents);
    }
  });
};

/**
 * 生成文件
 */
Module.prototype.dest = function (cb) {
  var module = this;

  // 设置hash值
  this.hash = mutil.hash(this.contents);

  this.getContents(function (contents) {
    // 默认生成不带hash的文件
    var writePathList = _.uniq([
      module.destAbsPath,
      module.destAbsPathWithHash
    ]);

    // 生成文件
    return async.each(writePathList, function (writePath, cb) {
      mutil.dest(writePath, contents, module.charset, cb);
    }, function (err) {
      if (err) {
        return cb(err);
      }

      // 生成原子文件
      if (module.packList.length) {
        fs.writeFileSync(module.atomPath, module.contents);
      }

      // 删除contents的内容引用,改为生成路径,节省内容占用
      module.contents = writePathList[0];

      cb();
    });
  });
};

/**
 * 追加钩子
 *
 * @param {Function} hook
 */
Module.prototype.addHook = function (hook) {
  this.hooks.push(hook);
};

/**
 * 获取缓存
 *
 * @param {String} plugin 插件标示
 * @param hash
 */
Module.prototype.getCache = function (plugin, hash) {
  return this.cache.getCache(this.srcPath, plugin, hash);
};

/**
 * 添加缓存
 *
 * @param {String} plugin 插件标示
 * @param hash
 * @param {Buffer|String} contents 缓存内容
 */
Module.prototype.addCache = function (plugin, hash, contents) {
  return this.cache.addCache(this.srcPath, plugin, hash, contents);
};

Module.prototype.compile = function (force) {
  // 强制编译
  if (force) {
    this.compilePromise = null;
  }

  if (this.compilePromise) {
    return this.compilePromise;
  }

  var module = this;

  this.compilePromise = new Promise(function (resolve, reject) {
    if (module.verbase) {
      mutil.log('编译开始 ' + chalk.green.underline.bold(module.srcPath));
    }

    async.eachSeries([
      'runTasks',
      'dest'
    ], function (task, cb) {
      module[task](cb);
    }, function (err) {
      if (err) {
        if (!err.fileName) {
          err.fileName = module.srcAbsPath;
        }

        if (module.verbase) {
          mutil.log('编译失败 ' + chalk.red.underline.bold(module.srcPath));
        }

        return reject(err);
      }

      if (module.verbase) {
        mutil.log('编译成功 ' + chalk.green.underline.bold(module.srcPath));
      }

      resolve(module);
    });
  });

  return this.compilePromise;
};

/**
 * 检测变化
 *
 * @param srcPath
 * @param token
 */
Module.prototype.detectChange = function (srcPath, token) {
  if (this.dependList.indexOf(srcPath) !== -1) {
    this.handleChange(token);
  }
};

/**
 * 当文件内容出现变化时触发
 *
 * @param token 时间令牌
 * @returns {*}
 */
Module.prototype.handleChange = function (token) {
  this.changePromises = this.changePromises || {};
  var promise = this.changePromises[token];

  if (promise) {
    return promise;
  }

  if (!this.changeQueue) {
    this.changeQueue = async.queue(function (token, cb) {
      // 清理操作
      // 清除打包信息
      this.packed = false;
      this.packList = [];

      // 清除钩子
      this.hooks = [];

      // 清除依赖关系
      var dependList = this.dependList;
      this.dependList = [];

      // 重新获取内容
      this.contents = fs.readFileSync(this.srcAbsPath);

      // 强制重新编译
      this.compile(true).then(function (module) {
        // 触发事件
        module.emit('change', token);

        cb();
      }, function (err) {
        // 恢复依赖关系
        module.dependList = dependList;

        cb(err);
      });

    }.bind(this), 1);
  }

  var changeQueue = this.changeQueue;
  promise = new Promise(function (resolve, reject) {
    changeQueue.push(token, function (err) {
      if (err) {
        return reject(err);
      }

      resolve();
    });
  });

  this.changePromises[token] = promise;

  return this.changePromises[token];
};

/**
 * 删除自己
 *
 * 主要是删除自己产生的文件, 并删除缓存中的信息
 */
Module.prototype.handleRemove = function () {
  try {
    fs.removeSync(this.destAbsPath);
    fs.removeSync(this.destAbsPathWithHash);
  } catch (e) {
  }

  this.emit('remove', this);
};

/**
 * 获取对应路径的已编译好的模块
 *
 * @param {String} relative 相对路径
 * @param {Function} cb
 */
Module.prototype.getModule = function (relative, cb) {
  var resolve = {};
  var basedir = path.dirname(this.srcAbsPath);
  if (_.isObject(relative)) {
    resolve = relative.resolve;
    basedir = relative.basedir || basedir;
    relative = relative.relative;
  }

  var srcPath;
  try {
    srcPath = mutil.resolve(
      relative,
      basedir,
      _.extend({}, this.config.resolve, resolve)
    );
  } catch (err) {
    return cb(err);
  }

  srcPath = mutil.relative(this.cwd, srcPath);

  var cycleError;
  if ((cycleError = this.checkCycleDepend(srcPath))) {
    return cb(cycleError);
  }

  var module = Module.getInstance(srcPath, this.config, this.cache);

  // 添加依赖信息
  this.addDependency(module);

  module.compile().then(_.partial(cb, null), cb);
};

/**
 * 创建模块
 *
 * @param {String} relativePath 相对路径
 * @param {Buffer} contents 内容
 * @param cb
 */
Module.prototype.createModule = function (relativePath, contents, cb) {
  var srcAbsPath = path.resolve(path.dirname(this.srcAbsPath), relativePath);
  var srcPath = mutil.relative(this.cwd, srcAbsPath);

  var cycleError;
  if ((cycleError = this.checkCycleDepend(srcPath))) {
    return cb(cycleError);
  }

  var module = Module.getInstance(srcPath, this.config, this.cache, contents);

  // 添加依赖信息
  this.addDependency(module);

  module.compile().then(_.partial(cb, null), cb);
};

/**
 * 检查循环依赖
 *
 * @param srcPath 要检查的目录模块
 * @returns {Error} [result] 如果出现循环依赖就返回一个异常, 否则什么都不返回
 */
Module.prototype.checkCycleDepend = function (srcPath) {
  var fromModule = this.cache.get(srcPath);

  if (!fromModule) {
    return;
  }

  var cache = this.cache;
  var toModule = this;
  var stack = [fromModule.srcPath];

  function check(module) {
    if (module.srcPath === toModule.srcPath) {
      return true;
    }

    return module.dependList.some(function (dependPath) {
      var dependency = cache.get(dependPath);

      if (!dependency) {
        return;
      }

      stack.push(dependency);

      var result = check(dependency);

      if (!result) {
        stack.pop();
      }

      return result;
    });
  }

  check(fromModule);

  if (stack.length > 1) {
    stack.push(fromModule.srcPath);
    return new Error(srcPath + '被循环依赖了, 依赖链为: ' + stack.join(' - '));
  }
};

/**
 * 依赖其他模块
 *
 * @param {Module} module 被依赖的模块
 */
Module.prototype.addDependency = function (module) {
  if (this.dependList.indexOf(module.srcPath) !== -1) {
    return;
  }

  this.dependList.push(module.srcPath);
};

/**
 * 打包
 *
 * @param module
 */
Module.prototype.pack = function (module) {
  if (this.packList.indexOf(module.srcPath) === -1) {
    this.packList.push(module.srcPath);

    this.addDependency(module);
  }

  this.packed = true;
};

// 生成目标的相对路径
Object.defineProperty(Module.prototype, 'destPath', {
  get: function () {
    var roadConfig = this.moduleOptions.road;
    var destPath = this.srcPath;

    // 判断是否修改生成文件的相对路径
    if (roadConfig.release) {
      destPath = destPath.replace(roadConfig.test, roadConfig.release);
    }

    return destPath;
  }
});

// 生成目标的相对路径并且应用了hash版本号
Object.defineProperty(Module.prototype, 'destPathWithHash', {
  get: function () {
    var destPathWithHash = this.destPath;
    var config = this.config;

    if (this.useHash) {
      var hash = this.hash.slice(0, config.hash);
      var hashConcat = config.hashConcat;
      destPathWithHash = destPathWithHash.replace(/\.[^\.]+$/, function (ext) {
        return hashConcat + hash + ext;
      });
    }

    return destPathWithHash;
  }
});

// 文件内容
Object.defineProperty(Module.prototype, 'contents', {
  get: function () {
    if (_.isString(this.__contents__)) {
      return fs.readFileSync(this.__contents__);
    } else {
      return this.__contents__;
    }
  },

  set: function (contents) {
    this.__contents__ = contents;
  }
});

// 生成目标的绝对路径
Object.defineProperty(Module.prototype, 'destAbsPath', {
  get: function () {
    return path.join(this.output, this.destPath);
  }
});

// 生成目标的绝对路径
Object.defineProperty(Module.prototype, 'destAbsPathWithHash', {
  get: function () {
    return path.join(this.output, this.destPathWithHash);
  }
});

// 源目录的相对路径
Object.defineProperty(Module.prototype, 'srcPath', {
  writable: true,
  value: null
});

// 源目录的绝对路径
Object.defineProperty(Module.prototype, 'srcAbsPath', {
  get: function () {
    return path.join(this.cwd, this.srcPath);
  }
});

// 原子文件存放的路径
Object.defineProperty(Module.prototype, 'atomPath', {
  get: function () {
    this.__atomPath__ = this.__atomPath__ ||
      (this.packList.length ? temp.openSync().path : this.destAbsPath);

    return this.__atomPath__;
  }
});

// 原子文件内容
Object.defineProperty(Module.prototype, 'atomContents', {
  get: function () {
    return fs.readFileSync(this.atomPath);
  }
});

// 是否启用hash
Object.defineProperty(Module.prototype, 'useHash', {
  get: function () {
    var roadConfig = this.moduleOptions.road;
    return this.config.hash && (_.isUndefined(roadConfig.useHash) || roadConfig.useHash);
  }
});

// URL地址
Object.defineProperty(Module.prototype, 'url', {
  get: function () {
    var domain = this.moduleOptions.road.domain || this.config.domain;

    if (domain) {
      domain = /\/$/.test(domain) ? domain : (domain + '/');
      return url.resolve(domain, this.destPathWithHash);
    } else {
      return null;
    }
  }
});

// 不包含hash值的URL
Object.defineProperty(Module.prototype, 'urlWithoutHash', {
  get: function () {
    var domain = this.moduleOptions.road.domain || this.config.domain;

    if (domain) {
      domain = /\/$/.test(domain) ? domain : (domain + '/');
      return url.resolve(domain, this.destPath);
    } else {
      return null;
    }
  }
});

// 编码
Object.defineProperty(Module.prototype, 'charset', {
  get: function () {
    return this.moduleOptions.road.encoding || 'utf8';
  }
});

// 工作目录
Object.defineProperty(Module.prototype, 'cwd', {
  get: function () {
    return this.config.cwd;
  }
});

// 产出目录
Object.defineProperty(Module.prototype, 'output', {
  get: function () {
    return path.resolve(this.config.output);
  }
});

// 实时刷新的端口
Object.defineProperty(Module.prototype, 'liveReloadPort', {
  get: function () {
    return this.config.liveReloadPort;
  }
});

// 是否打包了
Object.defineProperty(Module.prototype, 'packed', {
  writable: true,
  value: false
});

// 话唠模式
Object.defineProperty(Module.prototype, 'verbase', {
  get: function () {
    return this.config.verbase;
  }
});

module.exports = Module;
