var _ = require('lodash');
var fs = require('fs-extra');
var path = require('path');
var serialize = require('serialize-javascript');
var temp = require('temp');

temp.track();

function Cache(options) {
  this.options = options;
  this.modules = {};
  this.cachedModules = {};

  var log = fs.readJSONSync(path.join(options.output, 'miaow.log.json'), {throws: false}) || {};

  // 如果配置信息一致,就启用压缩缓存
  if (log.options === serialize(options)) {
    this.cachedModules = log.modules;
    this.temp = temp.mkdirSync('miaow');

    fs.copySync(options.output, this.temp);
  }

  fs.emptyDirSync(options.output);

  return this;
}

Cache.prototype.add = function (module) {
  this.modules[module.srcPath] = module;
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
 * @param {String} hash 用于判断是否需要使用缓存内容
 * @param cb
 */
Cache.prototype.getCachedContent = function (srcPath, hash, cb) {
  var module = this.cachedModules[srcPath];

  if (module && module.hash === hash) {
    fs.readFile(path.join(this.temp, module.destPath), cb);
  } else {
    cb();
  }
};

/**
 * 获取已经缓存的内容
 *
 * @param {String} srcPath 源路径
 * @param {String} hash 用于判断是否需要使用缓存内容
 */
Cache.prototype.getCachedContentSync = function (srcPath, hash) {
  var module = this.cachedModules[srcPath];

  if (module && module.hash === hash) {
    return fs.readFileSync(path.join(this.temp, module.destPath));
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
      [
        'srcPath',
        'destPath',
        'destPathWithHash',
        'hash',
        'url',
        'dependList',
        'dependedList',
        'packed',
        'packedModules'
      ]
    );
  });

  fs.writeJSONSync(
    path.join(this.options.output, 'miaow.log.json'),
    {
      options: serialize(this.options),
      modules: modules
    });
};

/**
 * 销毁
 */
Cache.prototype.destroy = function () {
  // 销毁缓存的模块
  this.modules = null;
  // 销毁临时缓存
  if (this.temp) {
    fs.emptyDirSync(this.temp);
  }
};

module.exports = Cache;
