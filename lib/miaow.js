const webpack = require('webpack');

const getWebpackConfiguration = require('./getWebpackConfiguration');

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
    .map(singleOptions => getWebpackConfiguration(singleOptions));

  return new Promise((resolve, reject) => {
    webpack(configurations, (err, stats) => {
      if (err) {
        reject(err);
        return;
      }

      printStats(stats);
    });
  });

  // const task = new Promise((resolve, reject) => {
  //   if (options.watch) {
  //     const watcher = compiler.watch({}, (err, stats) => {
  //       if (err) {
  //         watcher.close(() => reject(err));
  //         return;
  //       }

  //       printStats(stats);
  //     });
  //   } else {
  //     compiler.run((err, stats) => {
  //       if (err) {
  //         reject(err);
  //         return;
  //       }

  //       printStats(stats);
  //       resolve();
  //     });
  //   }
  // });

  return task;
};

module.exports = compile;
