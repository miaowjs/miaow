var _ = require('lodash');
var async = require('async');
var File = require('vinyl');
var mutil = require('miaow-util');
var path = require('path');
var url = require('url');

var dest = require('./dest');

/**
 * 模块
 *
 * 模块是处理文件的单元,每个文件都被抽象成模块
 *
 * @param {Vinyl} file 待处理的文件对象
 * @param {Object} options 配置信息
 * @param {Cache} cache 缓存组件
 * @constructor
 */
function Module(file, options, cache) {
  this.file = file;
  this.options = options;
  this.cache = cache;

  // 依赖的模块列表
  this.dependencies = [];

  // 获取一些模块配置
  var moduleOptions = this.moduleOptions = {};
  _.each(['road', 'parse', 'pack', 'lint', 'mini'], function (name) {
    moduleOptions[name] = getModuleOption(options, 'module.' + name, file.relative);
  });

  function getModuleOption(options, path, relativeFilePath) {
    return _.find(_.result(options, path) || [], function (option) {
        return option.test.test(relativeFilePath);
      }) || {};
  }
}

/**
 * 解析文件内容,并分析出依赖的模块列表
 *
 * @param cb
 */
Module.prototype.parse = function (cb) {
  // 如果不启用解析,就直接返回
  if (_.isEmpty(this.moduleOptions.parse || {})) {
    return cb();
  }

  this.execPlugins(this.moduleOptions.parse.plugins, cb);
};

/**
 * 校验代码
 *
 * @param cb
 */
Module.prototype.lint = function (cb) {
  // 如果不启用校验,就直接返回
  if (!this.options.lint || _.isEmpty(this.moduleOptions.lint || {})) {
    return cb();
  }

  this.execPlugins(this.moduleOptions.lint.plugins, cb);
};

/**
 * 压缩
 *
 * @param cb
 */
Module.prototype.mini = function (cb) {
  // 如果不启用压缩,就直接返回
  if (!this.options.mini || _.isEmpty(this.moduleOptions.mini || {})) {
    return cb();
  }

  // 由于压缩比较耗时,所以启用缓存
  this.cache.getMinifiedContent(this.file.relative, this.hash, function (err, contents) {
    if (err) {
      return cb(err);
    }

    if (contents) {
      this.file.contents = contents;
      return cb();
    }

    this.execPlugins(this.moduleOptions.mini.plugins, cb);
  }.bind(this));
};

/**
 * 生成文件
 *
 * @param cb
 */
Module.prototype.dest = function (cb) {
  var roadConfig = this.moduleOptions.road;
  var file = this.file;

  // 默认生成不带hash的文件
  var writePathList = _.uniq([
    this.destAbsPath,
    this.destAbsPathWithHash
  ]);

  // 设置编码
  var encoding = roadConfig.encoding || 'utf8';
  // 生成文件
  async.each(writePathList, function (writePath, cb) {
    dest(writePath, file, encoding, cb);
  }, cb);
};

Module.prototype.compile = function (cb) {
  async.eachSeries([
    'parse',
    'lint',
    'mini',
    'dest'
  ], function (task, cb) {
    this[task](cb);
  }.bind(this), function (err) {
    if (err) {
      return cb(err);
    }

    this.done = true;
    cb();
  }.bind(this));
};

/**
 * 获取对应路径的已编译好的模块
 *
 * @param {String} relative 相对路径
 * @param {Function} cb
 */
Module.prototype.getModule = function (relative, cb) {
  try {
    var srcPath = mutil.resolve(
      relative,
      path.dirname(this.file.path),
      this.options.resolve
    );
  } catch (err) {
    return cb(err);
  }

  srcPath = path.relative(this.options.cwd, srcPath);

  this.cache.get(srcPath, cb);
};

/**
 * 创建模块
 *
 * @param {String} src 相对路径
 * @param {Buffer} contents 内容
 * @param cb
 */
Module.prototype.createModule = function (src, contents, cb) {
  src = path.resolve(path.dirname(this.srcAbsPath), src);

  var cwd = this.options.cwd;

  var file = new File({
    cwd: cwd,
    base: cwd,
    path: src,
    contents: contents
  });

  var module = new Module(file, this.options, this);
  module.compile(function (err) {
    cb(err, module);
  });

  this.cache.add(module);
};

/**
 * 运行插件
 *
 * @param {Array|Object|Function|String} plugins
 * @param {Function} cb
 */
Module.prototype.execPlugins = function (plugins, cb) {
  mutil.execPlugins(this, plugins, cb);
};

// 生成目标的相对路径
Object.defineProperty(Module.prototype, 'destPath', {
  get: function () {
    if (this._destPath) {
      return this._destPath;
    }

    var roadConfig = this.moduleOptions.road;
    var destPath = this.srcPath;

    // 判断是否修改生成文件的相对路径
    if (roadConfig.release) {
      destPath = destPath.replace(roadConfig.test, roadConfig.release);
    }

    this._destPath = destPath;

    return this._destPath;
  }
});

// 生成目标的相对路径并且应用了hash版本号
Object.defineProperty(Module.prototype, 'destPathWithHash', {
  get: function () {
    if (this._destPathWithHash) {
      return this._destPathWithHash;
    }

    var destPathWithHash = this.destPath;

    if (this.useHash) {
      var hash = this.hash.slice(0, this.options.hash);
      var hashConcat = this.options.hashConcat;
      destPathWithHash = destPathWithHash.replace(/\.[^\.]+$/, function (ext) {
        return hashConcat + hash + ext;
      });
    }

    this._destPathWithHash = destPathWithHash;

    return this._destPathWithHash;
  }
});

// 生成目标的绝对路径
Object.defineProperty(Module.prototype, 'destAbsPath', {
  get: function () {
    return path.join(this.options.output, this.destPath);
  }
});

// 生成目标的绝对路径
Object.defineProperty(Module.prototype, 'destAbsPathWithHash', {
  get: function () {
    return path.join(this.options.output, this.destPathWithHash);
  }
});

// 源目录的相对路径
Object.defineProperty(Module.prototype, 'srcPath', {
  get: function () {
    return this.file.relative;
  }
});

// 源目录的绝对路径
Object.defineProperty(Module.prototype, 'srcAbsPath', {
  get: function () {
    return this.file.path;
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
    this._hash = this._hash || mutil.hash(this.file.contents);
    return this._hash;
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

module.exports = Module;
