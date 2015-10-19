var _ = require('lodash');
var async = require('async');
var mutil = require('miaow-util');
var path = require('path');
var url = require('url');

var pkg = require('../../package.json');

module.exports = function(options, callback) {
  var context = this;
  var contents = context.contents;

  // 获取输出Hash值
  var hash = mutil.hash(contents);

  // 获取输出的文件名
  var filename = path.basename(context.src);

  // 设置扩展名
  filename = filename.replace(/\.[^\.]+$/, context.ext || path.extname(context.src));

  // 设置Hash值
  var hashLength = context.hashLength;
  var hashConnector = context.hashConnector;
  var filenameWithHash = filename.replace(
    /\.[^\.]+$/,
    (hashLength ? (hashConnector + hash.slice(0, hashLength)) : '') + path.extname(filename)
  );

  var destPath = path.join(context.destDir, filename).replace(/\\/g, '/');
  var destPathWidthHash = path.join(context.destDir, filenameWithHash).replace(/\\/g, '/');

  async.each(
    _.uniq([destPath, destPathWidthHash]),
    function(filepath, callback) {
      context.emitFile(filepath, contents, context.charset || 'utf-8', callback);
    },

    function(err) {
      if (err) {
        return callback(err);
      }

      context.dest = destPathWidthHash;
      context.destHash = hash;

      context.url = url.resolve(
        (context.domain || '').replace(/\/?$/, '/'),
        [context.url.replace(/(^\/|\/$)/, ''), filenameWithHash].join('/')
      );
      callback();
    });
};

module.exports.toString = function() {
  return ['dest', pkg.version].join('@');
};
