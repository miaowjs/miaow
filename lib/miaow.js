const webpack = require('webpack');

const getConfiguration = require('./get-configuration');

const printStats = (stats) => {
  // 打印编译结果
  console.log(stats.toString({
    chunks: false,
    colors: true,
  }));
};

const compile = (options) => {
  // 适用于 webpack 的配置信息
  const configurations = (!Array.isArray(options) ? [options] : options)
    .map(singleOptions => getConfiguration(singleOptions));

  return new Promise((resolve, reject) => {
    webpack(configurations, (err, stats) => {
      if (err) {
        reject(err);
        return;
      }

      printStats(stats);
    });
  });
};

module.exports = compile;
