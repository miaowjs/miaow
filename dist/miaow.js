var notifier = require('node-notifier');
var webpack = require('webpack');
var path = require('path');

var getConfiguration = require('./get-configuration');

function notifyStats(stats) {
  var notifyOptions = void 0;

  var statsInfo = stats.toJson();

  if (stats.hasErrors()) {
    notifyOptions = {
      title: '编译失败！！！',
      message: `共有 ${ statsInfo.errors.length } 个错误信息，请自行查看日志`,
      sound: true,
      timeout: 5,
      icon: path.resolve(__dirname, 'notify-images/error.png')
    };
  } else {
    var warnMessage = stats.hasWarnings() ? `共有 ${ statsInfo.warnings.length } 个警告信息，` : '';

    notifyOptions = {
      title: '编译成功',
      timeout: 2,
      message: `${ warnMessage }请自行查看日志`,
      icon: path.resolve(__dirname, 'notify-images/success.png')
    };
  }

  notifier.notify(notifyOptions);
}

function printStats(stats) {
  var hasErrors = stats.hasErrors();
  // 打印编译结果
  console[hasErrors ? 'error' : 'log'](stats.toString({
    chunks: false,
    colors: true
  }));
}

function defaultConfigurationFactory(configuration) {
  return configuration;
}

var compile = function compile(options) {
  // 适用于 webpack 的配置信息
  var configurationTasks = (!Array.isArray(options) ? [options] : options).map(function (singleOptions) {
    var factory = singleOptions.configurationFactory || defaultConfigurationFactory;

    return factory(getConfiguration(singleOptions));
  });

  return Promise.all(configurationTasks).then(function (configurations) {
    return new Promise(function (resolve, reject) {
      webpack(configurations, function (err, stats) {
        if (err) {
          reject(err);
          return;
        }

        // 打印编译结果
        printStats(stats);

        // 是否正在 watch
        var hasWatch = !!stats.stats.find(function (item) {
          return item.compilation.options.watch;
        });
        if (hasWatch) {
          // 提示编译结果
          notifyStats(stats);
          return;
        }

        if (stats.hasErrors()) {
          reject('编译失败，请解决完错误之后再重试！');
        } else {
          resolve();
        }
      });
    });
  });
};

module.exports = compile;