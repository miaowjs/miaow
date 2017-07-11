const notifier = require('node-notifier');
const webpack = require('webpack');
const path = require('path');

const getConfiguration = require('./get-configuration');

function notifyStats(stats) {
  const hasWatch = !!stats.stats.find(item => item.compilation.options.watch);

  if (!hasWatch) {
    return;
  }

  let notifyOptions;

  const statsInfo = stats.toJson();

  if (stats.hasErrors()) {
    notifyOptions = {
      title: '编译失败',
      message: `共有 ${statsInfo.errors.length} 个错误信息，请自行查看日志`,
      sound: true,
      timeout: 5,
      contentImage: path.resolve(__dirname, 'notify-images/error.png'),
    };
  } else {
    const warnMessage = stats.hasWarnings() ? `共有 ${statsInfo.warnings.length} 个警告信息，` : '';

    notifyOptions = {
      title: '编译成功',
      timeout: 1,
      message: `${warnMessage}请自行查看日志`,
      contentImage: path.resolve(__dirname, 'notify-images/success.png'),
    };
  }

  notifier.notify(notifyOptions);
}

function printStats(stats) {
  // 打印编译结果
  console.log(stats.toString({
    chunks: false,
    colors: true,
  }));
}

function defaultConfigurationFactory(configuration) {
  return configuration;
}

const compile = (options) => {
  // 适用于 webpack 的配置信息
  const configurationTasks = (!Array.isArray(options) ? [options] : options)
    .map((singleOptions) => {
      const factory = singleOptions.configurationFactory || defaultConfigurationFactory;

      return factory(getConfiguration(singleOptions));
    });

  return Promise
    .all(configurationTasks)
    .then(configurations => new Promise((resolve, reject) => {
      webpack(configurations, (err, stats) => {
        if (err) {
          reject(err);
          return;
        }

        // 提示编译结果
        notifyStats(stats);
        printStats(stats);
      });
    }));
};

module.exports = compile;
