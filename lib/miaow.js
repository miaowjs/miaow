const webpack = require('webpack');

const getConfiguration = require('./get-configuration');

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

        printStats(stats);
      });
    }));
};

module.exports = compile;
