var _ = require('lodash');
var chalk = require('chalk');
var fs = require('fs-extra');
var events = require('events');
var mutil = require('miaow-util');
var path = require('path');
var util = require('util');
var uuid = require('uuid');

var pkg = require('../package.json');

function Cache(options) {
  this.options = options;
  this.modules = {};

  try {
    fs.emptyDirSync(options.output);
  } catch (e) {
    mutil.log(chalk.red.bold('清空输出目录失败,可能是内部有已修改但未保存的文件.'));
    throw e;
  }

  // 缓存目录
  this.directory = options.cache;
  if (this.directory) {
    fs.ensureDirSync(this.directory);
    var cacheInfo = fs.readJSONSync(path.join(this.directory, 'miaow.cache.json'), {throws: false}) || {};
    if (cacheInfo.version !== pkg.version) {
      cacheInfo = {};
    }

    this.cachedModules = cacheInfo.modules || {};
  } else {
    this.cachedModules = {};
  }

  this.usedModules = {};

  // 取消事件监听的个数限制
  this.setMaxListeners(0);

  return this;
}

Cache.getInstance = function (options) {
  return new Cache(options);
};

util.inherits(Cache, events.EventEmitter);

Cache.prototype.add = function (module) {
  this.modules[module.srcPath] = module;

  // 监听修改事件
  var cache = this;
  module.on('change', function (token) {
    cache.emit('change', module.srcPath, token);
  });

  // 监听删除事件
  module.once('remove', this.remove.bind(this, module.srcPath));
};

Cache.prototype.get = function (srcPath) {
  return this.modules[srcPath];
};

Cache.prototype.remove = function (srcPath) {
  delete this.modules[srcPath];
};

/**
 * 获取已经缓存的内容
 *
 * @param {String} srcPath 源路径
 * @param {String} plugin 插件标识
 * @param {String} hash 用于判断是否需要使用缓存内容
 */
Cache.prototype.getCache = function (srcPath, plugin, hash) {
  var files = this.cachedModules[srcPath];

  if (files) {
    var file = _.find(files, {plugin: plugin, hash: hash});

    if (file) {
      var contents;
      try {
        contents = fs.readFileSync(path.resolve(this.directory, file.file));
        this.usedModules[srcPath] = this.usedModules[srcPath] || [];
        this.usedModules[srcPath].push(file);
      } catch(err) {}

      return contents;
    }
  }
};

Cache.prototype.addCache = function (srcPath, plugin, hash, contents) {
  if (!this.directory) {
    return;
  }

  var file = uuid.v1();

  try{
    fs.writeFileSync(path.resolve(this.directory, file), contents);
    this.usedModules[srcPath] = this.usedModules[srcPath] || [];
    this.usedModules[srcPath].push({
      plugin: plugin,
      hash: hash,
      file: file
    });
  } catch(err) {
    mutil.log('写入缓存目录失败');
  }
};

/**
 * 序列化缓存信息
 */
Cache.prototype.serialize = function () {
  var modules = {};

  _.forEach(this.modules, function (module, srcPath) {
    modules[srcPath] = _.pick(
      module,
      ['srcPath', 'destPath', 'destPathWithHash', 'dependList', 'packList', 'hash', 'url']
    );
  });

  // 写入编译结果
  fs.writeJSONSync(
    path.join(this.options.output, 'miaow.log.json'),
    {
      modules: modules
    });

  // 处理缓存文件
  if (!this.directory) {
    return;
  }
  // 清除没有使用到的文件
  var usedFiles = [];
  _.each(this.usedModules, function (module) {
    usedFiles = usedFiles.concat(_.map(module, 'file'));
  });

  var allFiles = fs.readdirSync(this.directory);
  var directory = this.directory;
  _.difference(allFiles, usedFiles).forEach(function (file) {
    fs.removeSync(path.join(directory, file));
  });

  // 写入记录
  fs.writeJSONSync(path.join(this.directory, 'miaow.cache.json'), {
    version: pkg.version,
    modules: this.usedModules
  });
};

module.exports = Cache;
