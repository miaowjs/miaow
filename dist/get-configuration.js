var path = require('path');

var _require = require('./utils'),
    getChunkName = _require.getChunkName;

var _require2 = require('./constants'),
    HASH_LENGTH = _require2.HASH_LENGTH;

var getLoaders = require('./get-loaders');
var getPlugins = require('./get-plugins');

// 当前进程的路径
var processCWD = process.cwd();

// 默认选项
var DEFAULT_OPTIONS = {
  watch: false,
  context: processCWD,
  output: path.resolve(processCWD, 'build'),
  publicPath: '/',
  manifest: 'manifest',
  commons: [],
  entries: [],
  syncFiles: [],
  define: {},
  production: false,
  cssModules: true
};

// 获取 webpack 的配置信息
var getConfiguration = function getConfiguration(_options) {
  var options = Object.assign({}, DEFAULT_OPTIONS, _options);
  var context = options.context,
      entries = options.entries,
      commons = options.commons,
      watch = options.watch,
      output = options.output,
      publicPath = options.publicPath,
      production = options.production,
      filename = options.filename,
      define = options.define;

  // define 替换信息

  options.define = Object.assign({
    // CDN 变量
    __cdn__: JSON.stringify(publicPath),
    // 调试变量
    __debug__: (!production).toString(),
    // 设置 process.env.NODE_ENV 变量，可以让 vue 等库进入生产模式
    'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development')
  }, define);

  // 通过 entries 获取 entry
  var entry = {};
  entries.forEach(function (entryItem) {
    var script = typeof entryItem === 'string' ? entryItem : entryItem.script;

    if (script) {
      entry[getChunkName(script)] = script;
    }

    if (entryItem.template) {
      entry[getChunkName(entryItem.template)] = entryItem.template;
    }
  });

  // 将 commons 里的公共组件添加到 entry 中
  commons.forEach(function (commonScript) {
    entry[getChunkName(commonScript)] = commonScript;
  });

  var developmentFilename = '[id].js';
  var productionFilename = '[id].[chunkhash].js';
  var defaultFilename = production ? productionFilename : developmentFilename;

  var developmentChunkFilename = '[hash]-[id].js';
  var chunkFilename = production ? productionFilename : developmentChunkFilename;

  var configuration = {
    watch,
    context,
    entry,
    output: {
      path: output,
      publicPath,
      chunkFilename,
      filename: filename || defaultFilename,
      pathinfo: !production,
      hashDigestLength: HASH_LENGTH
    },
    devtool: production ? 'nosources-source-map' : 'source-map',
    module: {
      rules: getLoaders(options)
    },
    resolveLoader: {
      modules: [path.resolve(__dirname, 'loaders'), 'node_modules']
    },
    resolve: {
      modules: ['common', '.remote', 'node_modules'],
      extensions: ['.js', '.es6', '.json', '.vue', '.jsx']
    },
    plugins: getPlugins(options)
  };

  return configuration;
};

module.exports = getConfiguration;