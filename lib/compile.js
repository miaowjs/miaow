var _ = require('lodash');
var async = require('async');
var chalk = require('chalk');
var glob = require('glob');
var moment = require('moment');
var mutil = require('miaow-util');

var Cache = require('./cache');
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
  }, function (err, files) {
    if (err) {
      return cb(err);
    }

    async.eachSeries(files, cache.get.bind(cache), function (err) {
      if (err) {
        return cb(err);
      }

      mutil.execPlugins(cache.modules, options.nextTasks || [], complete);
    });
  });

  function complete(err) {
    if (err) {
      return cb(err);
    }

    var endTime = new Date().getTime();
    mutil.log(
      '成功编译 ' +
      chalk.green.underline.bold(_.size(cache.modules)) +
      ' 个模块，耗时 ' +
      chalk.green.underline.bold(moment.duration(endTime - startTime).humanize())
    );

    cache.serialize();
    cb(null, cache);
  }
}

module.exports = compile;
