var _ = require('lodash');
var async = require('async');
var mutil = require('miaow-util');
var path = require('path');
var url = require('url');

var pkg = require('../../package.json');

module.exports = function(options, callback) {
  var context = this;

  // 获取输出Hash值
  context.destHash = mutil.hash(context.contents);

  // 获取输出的文件名
  var filename = path.basename(context.src).replace(/\.[^\.]+$/, context.ext || path.extname(context.src));

  // 设置Hash值
  var hashLength = context.hashLength;
  var hashConnector = context.hashConnector;
  var filenameWithHash = filename.replace(
    /\.[^\.]+$/,
    (hashLength ? (hashConnector + context.destHash.slice(0, hashLength)) : '') + path.extname(filename)
  );

  // 设置产出目录
  var destPathWithoutHash = mutil.relative('', path.join(context.destDir, filename));
  context.dest = mutil.relative('', path.join(context.destDir, filenameWithHash));

  // 设置URL
  context.url = url.resolve(
    (context.domain || '').replace(/\/?$/, '/'),
    [context.url.replace(/(^\/|\/$)/, ''), filenameWithHash].join('/')
  );

  // 设置生成文件
  context.emitFiles = _.uniq([destPathWithoutHash, context.dest]);

  function runHook(callback) {
    async.each(
      context.hooks,
      function(hook, callback) {
        hook(context, callback);
      },

      callback);
  }

  function emitFile(callback) {
    async.each(
      context.emitFiles,
      _.partial(context.emitFile, _, context.contents, context.charset || 'utf-8'),
      callback);
  }

  async.series([
    runHook,
    emitFile
  ], callback);
};

module.exports.toString = function() {
  return ['dest', pkg.version].join('@');
};
