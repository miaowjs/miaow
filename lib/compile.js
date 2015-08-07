var _ = require('lodash');
var async = require('async');
var chalk = require('chalk');
var glob = require('glob');
var moment = require('moment');
var mutil = require('miaow-util');

var Cache = require('./cache');
var Module = require('./module');
var config = require('./config');

moment.locale('zh-cn');

/**
 * 编译主入口
 *
 * @param {Object} options 编译选项
 * @param {Function} cb 回调函数
 */
function compile(options, cb) {
  options = config(options);

  var cache = new Cache(options);

  var startTime = new Date().getTime();
  mutil.log('开始编译...');

  glob('**/*', {
    cwd: options.cwd,
    ignore: options.exclude || [],
    nodir: true
  }, function (err, srcPathList) {
    if (err) {
      return cb(err);
    }

    async.each(srcPathList, function (srcPath, cb) {
      var module = Module.get(srcPath, options, cache);

      module.compile().then(_.partial(cb, null), cb);
    }, function (err) {
      if (err) {
        return complete(err);
      }

      mutil.execPlugins(cache.modules, options.nextTasks || [], complete);
    });
  });

  function complete(err) {
    if (err) {
      return cb(err, cache, options);
    }

    var endTime = new Date().getTime();
    mutil.log(
      '成功编译 ' +
      chalk.green.underline.bold(_.size(cache.modules)) +
      ' 个模块，耗时 ' +
      chalk.green.underline.bold(mutil.duration(endTime - startTime))
    );

    cache.serialize();
    cb(null, cache, options);
  }
}

module.exports = compile;
