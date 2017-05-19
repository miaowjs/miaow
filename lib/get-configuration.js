const path = require('path');

const { getEntryName } = require('./utils');

const getLoaders = require('./get-loaders');
const getPlugins = require('./get-plugins');

// 当前进程的路径
const processCWD = process.cwd();

// 需要兼容的浏览器列表
// https://github.com/ai/browserslist
const defaultBrowsers = ['> 1%', 'last 2 versions', 'iOS >= 6', 'Android >= 2.1', 'Explorer >= 7', 'Firefox >= 38', 'Chrome >= 30'];

// 默认选项
const defaultOptions = {
  watch: false,
  context: processCWD,
  output: path.resolve(processCWD, 'build'),
  publicPath: '/',
  commons: [],
  entries: [],
  syncFiles: [],
  define: {},
  browsers: defaultBrowsers,
  production: false,
};

// 获取 webpack 的配置信息
const getConfiguration = (_options) => {
  const options = Object.assign({}, defaultOptions, _options);
  const {
    context,
    entries,
    commons,
    watch,
    output,
    publicPath,
    production,
    filename,
  } = options;

  // 通过 entries 获取 entry
  const entry = {};
  entries.forEach((entryItem) => {
    const script = typeof entryItem === 'string' ? entryItem : entryItem.script;

    if (script) {
      entry[getEntryName(script)] = script;
    }
  });

  // 将 commons 里的公共组件添加到 entry 中
  commons.forEach(commonScript => (entry[getEntryName(commonScript)] = commonScript));

  const configuration = {
    watch,
    context,
    entry,
    output: {
      path: output,
      publicPath,
      filename: filename || (production ? '[name].[chunkhash:10].js' : '[name].js'),
    },
    devtool: production ? 'cheap-source-map' : 'source-map',
    module: {
      rules: getLoaders(options),
    },
    resolve: {
      modules: [
        'common',
        'node_modules',
      ],
      extensions: ['.js', '.json', '.vue', '.jsx'],
    },
    plugins: getPlugins(options),
  };

  return configuration;
};

module.exports = getConfiguration;
