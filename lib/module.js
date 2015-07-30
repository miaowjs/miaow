var _ = require('lodash');
var async = require('async');
var fs = require('fs-extra');
var mutil = require('miaow-util');
var path = require('path');
var Q = require('q');
var temp = require('temp');
var url = require('url');

temp.track();

/**
 * 模块
 *
 * 模块是处理文件的单元,每个文件都被抽象成模块
 *
 * @param {String} srcPath 待处理的文件对象或是路径
 * @param {Object} options 配置信息
 * @param {Cache} cache 缓存组件
 * @param {Buffer} [contents] 文件内容
 * @constructor
 */
function Module(srcPath, options, cache, contents) {
  this.srcPath = mutil.relative('', srcPath);
  this.contents = contents || fs.readFileSync(path.resolve(options.cwd, srcPath));

  this.options = options;
  this.cache = cache;

  // 依赖的模块列表
  this.dependList = [];

  // 被依赖的模块列表
  this.dependedList = [];

  // 需要打包的模块列表
  this.packedModules = [];

  // 获取一些模块配置
  var moduleOptions = this.moduleOptions = {};
  _.each(['road', 'tasks'], function (name) {
    moduleOptions[name] = getModuleOption(options, 'module.' + name, srcPath);
  });

  function getModuleOption(options, path, relativeFilePath) {
    return _.find(_.result(options, path) || [], function (option) {
        return option.test.test(relativeFilePath);
      }) || {};
  }

  // 添加缓存
  this.cache.add(this);
}

Module.get = function (srcPath, options, cache, contents) {
  var module = cache.get(srcPath);
  if (!module) {
    module = new Module(srcPath, options, cache, contents);
  }

  return module;
};

/**
 * 执行任务
 *
 * @param cb
 */
Module.prototype.runTasks = function (cb) {
  var tasks = this.moduleOptions.tasks.plugins;

  if (tasks) {
    var module = this;
    mutil.execPlugins(this, this.moduleOptions.tasks.plugins, function (err) {
      if (err && !err.fileName) {
        err.fileName = module.srcAbsPath;
      }

      cb(err);
    });
  } else {
    cb();
  }
};

/**
 * 生成文件
 *
 * @param cb
 */
Module.prototype.dest = function (cb) {
  var module = this;

  // 默认生成不带hash的文件
  var writePathList = _.uniq([
    this.destAbsPath,
    this.destAbsPathWithHash
  ]);

  // 设置编码
  var encoding = this.charset;

  // 生成文件
  this.getContents(function (err, contents) {
    if (err) {
      return cb(err);
    }

    async.each(writePathList, function (writePath, cb) {
      mutil.dest(writePath, contents, encoding, cb);
    }, function (err) {
      if (err) {
        return cb(err);
      }

      // 将contents写入临时文件,免得在内存中占用空间
      // 删除destContents引用,节省内存占用
      try {
        var tempPath = temp.openSync().path;
        fs.writeFileSync(tempPath, module.contents);
        module.contents = tempPath;
        module.destContents = null;
      } catch (e) {}

      cb();
    });
  });
};

/**
 * 获取生成文件用得内容
 *
 * 首先查看destContents是否有内容,如果有内容就直接使用,因为可能是压缩任务直接读取的缓存
 * 如果destContents没有内容,就查看是否需要打包,如果需要打包就通过打包配置返回内容
 * 如果以上都没有,就返回contents
 *
 * @param cb
 * @returns {*}
 */
Module.prototype.getContents = function (cb) {
  var module = this;

  if (this.destContents) {
    return cb(null, this.destContents);
  } else if (this.packed && this.packedModules.length > 0) {
    async.mapSeries(_.uniq(this.packedModules), function (srcPath, cb) {
      var packedModule = Module.get(srcPath, module.options, module.cache);

      packedModule.compile().then(function (packedModule) {
        cb(null, packedModule.contents.toString());
      }, cb);
    }, function (err, contentsList) {
      if (err) {
        return cb(err);
      }

      contentsList = contentsList.concat(module.contents.toString());

      return cb(null, new Buffer(contentsList.join('\n')));
    });
  } else {
    return cb(null, this.contents);
  }
};

Module.prototype.getCachedContents = function (cb) {
  this.cache.getCachedContent(this.srcPath, this.hash, cb);
};

Module.prototype.getCachedContentsSync = function () {
  return this.cache.getCachedContentSync(this.srcPath, this.hash);
};

Module.prototype.compile = function () {

  if (this.__compilePromise__) {
    return this.__compilePromise__;
  }

  var module = this;

  this.__compilePromise__ = Q.Promise(function (fullfill, reject) {
    async.eachSeries([
      'runTasks',
      'dest'
    ], function (task, cb) {
      module[task](cb);
    }, function (err) {
      if (err) {
        module.destroy();
        return reject(err);
      }

      fullfill(module);
    });
  });

  return this.__compilePromise__;
};

/**
 * 删除自己
 *
 * 主要是删除自己产生的文件, 并删除缓存中的信息
 */
Module.prototype.destroy = function () {
  try {
    fs.removeSync(this.destAbsPath);
    fs.removeSync(this.destAbsPathWithHash);
  } catch (e) {
  }

  this.contents = null;
  this.destContents = null;

  this.cache.remove(this.srcPath);
};

/**
 * 获取对应路径的已编译好的模块
 *
 * @param {String} relative 相对路径
 * @param {Function} cb
 */
Module.prototype.getModule = function (relative, cb) {
  var resolve = {};
  if (_.isObject(relative)) {
    resolve = relative.resolve;
    relative = relative.relative;
  }

  var srcPath;
  try {
    srcPath = mutil.resolve(
      relative,
      path.dirname(this.srcAbsPath),
      _.extend({}, this.options.resolve, resolve)
    );
  } catch (err) {
    return cb(err);
  }

  srcPath = mutil.relative(this.options.cwd, srcPath);

  var cycleError;
  if ((cycleError = this.checkCycleDepend(srcPath))) {
    return cb(cycleError);
  }

  var module = Module.get(srcPath, this.options, this.cache);

  // 添加依赖信息
  this.depend(module);

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

  var module = Module.get(srcPath, this.options, this.cache, contents);

  // 添加依赖信息
  this.depend(module);

  module.compile().then(_.partial(cb, null), cb);
};

/**
 * 依赖其他模块
 *
 * @param {Module} module 被依赖的模块
 */
Module.prototype.depend = function (module) {
  if (this.dependList.indexOf(module.srcPath) === -1) {
    this.dependList.push(module.srcPath);
  }

  if (module.dependedList.indexOf(this.srcPath) === -1) {
    module.dependedList.push(this.srcPath);
  }
};

Module.prototype.checkCycleDepend = function (srcPath) {
  // 如果出现循环依赖
  var cache = this.cache;

  function check(module, srcPath) {
    if (module.srcPath === srcPath) {
      return [module.srcPath];
    }

    var cycledList = [];
    module.dependedList.some(function (depend) {
      cycledList = check(cache.get(depend), srcPath);

      if (cycledList && cycledList.length) {
        cycledList.push(module.srcPath);
        return true;
      }
    });

    return cycledList;
  }

  var cycledList = check(this, srcPath);

  if (cycledList.length) {
    cycledList.push(srcPath);
    return new Error(srcPath + '被循环依赖了, 依赖链为: ' + cycledList.join(' <- '));
  }
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

    if (this.useHash) {
      var hash = this.hash.slice(0, this.options.hash);
      var hashConcat = this.options.hashConcat;
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

// 是否启用hash
Object.defineProperty(Module.prototype, 'useHash', {
  get: function () {
    var roadConfig = this.moduleOptions.road;
    return this.options.hash && (_.isUndefined(roadConfig.useHash) || roadConfig.useHash);
  }
});

// hash值,最好是在parse修改完内容后获取
Object.defineProperty(Module.prototype, 'hash', {
  get: function () {
    this._hash = this._hash || mutil.hash(this.contents);
    return this._hash;
  },
  set: function (hash) {
    this._hash = hash;
  }
});

Object.defineProperty(Module.prototype, 'url', {
  get: function () {
    var domain = this.moduleOptions.road.domain || this.options.domain;

    if (domain) {
      return url.resolve(domain, this.destPathWithHash);
    } else {
      return null;
    }
  }
});

Object.defineProperty(Module.prototype, 'urlWithoutHash', {
  get: function () {
    var domain = this.moduleOptions.road.domain || this.options.domain;

    if (domain) {
      return url.resolve(domain, this.destPath);
    } else {
      return null;
    }
  }
});

Object.defineProperty(Module.prototype, 'charset', {
  get: function () {
    return this.moduleOptions.road.encoding || 'utf8';
  }
});

Object.defineProperty(Module.prototype, 'cwd', {
  get: function () {
    return this.options.cwd;
  }
});

Object.defineProperty(Module.prototype, 'output', {
  get: function () {
    return path.resolve(this.options.output);
  }
});

Object.defineProperty(Module.prototype, 'liveReloadPort', {
  get: function () {
    return this.options.liveReloadPort;
  }
});

// 是否打包了
Object.defineProperty(Module.prototype, 'packed', {
  writable: true,
  value: false
});

// 最终要产出的内容
Object.defineProperty(Module.prototype, 'destContents', {
  writable: true,
  value: null
});

module.exports = Module;
