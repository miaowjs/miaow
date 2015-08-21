var _ = require('lodash');
var chalk = require('chalk');
var glob = require('glob');
var moment = require('moment');
var mutil = require('miaow-util');
var Promise = require('promise');

var Cache = require('./cache');
var Module = require('./module');
var Config = require('./config');

moment.locale('zh-cn');

/**
 * 编译主入口
 *
 * @param {Object} options 编译选项
 * @param {Function} cb 回调函数
 */
function compile(options, cb) {
  var config = Config.getInstance(options);
  var cache = Cache.getInstance(config);

  var startTime = new Date().getTime();
  mutil.log('开始编译...');

  glob('**/*', {
    cwd: config.cwd,
    ignore: config.exclude || [],
    nodir: true
  }, function (err, srcPathList) {
    if (err) {
      return complete(err);
    }

    Promise.all(srcPathList.map(function (srcPath) {
      return Module.getInstance(srcPath, config, cache).compile();
    })).then(function () {
      return new Promise(function (resolve, reject) {
        mutil.execPlugins({modules: cache.modules, config: config}, config.nextTasks || [], function (err) {
          if (err) {
            return reject(err);
          }

          resolve();
        });
      });
    }).then(_.partial(complete, null)).catch(complete);
  });

  function complete(err) {
    if (err) {
      mutil.log(chalk.red.bold('编译失败'));

      err.showStack = !!config.verbase;
      console.error(err.toString());

      return cb(err, config, cache);
    }

    var endTime = new Date().getTime();
    mutil.log(
      '编译成功 编译' +
      chalk.green.underline.bold(_.size(cache.modules)) +
      ' 个模块，耗时 ' +
      chalk.green.underline.bold(mutil.duration(endTime - startTime))
    );

    cache.serialize();
    cb(null, config, cache);
  }
}

module.exports = compile;
