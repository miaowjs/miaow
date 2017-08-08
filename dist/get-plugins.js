var webpack = require('webpack');
var CopyWebpackPlugin = require('copy-webpack-plugin');
var ImageminWebpackPlugin = require('imagemin-webpack-plugin').default;

var FTLPlugin = require('./plugins/FTLPlugin');

var _require = require('./constants'),
    HASH_LENGTH = _require.HASH_LENGTH;

var _require2 = require('./utils'),
    getChunkName = _require2.getChunkName;

// 获取基础的插件


function getBasePlugins(options) {
  var entries = options.entries,
      syncFiles = options.syncFiles,
      commons = options.commons,
      manifest = options.manifest,
      define = options.define;

  // 公共脚本 chunk

  var commonChunks4CommonPlugin = commons.reverse().concat(manifest).map(getChunkName);
  var commonChunks4FtlPlugin = [manifest].concat(commons.reverse()).map(getChunkName);

  // 入口 chunk
  var entryChunks = entries.filter(function (entry) {
    return !!entry.template;
  }).map(function (_ref) {
    var script = _ref.script,
        template = _ref.template;
    return {
      script: script ? getChunkName(script) : '',
      template: getChunkName(template)
    };
  });

  return [new webpack.NamedChunksPlugin(), new CopyWebpackPlugin(syncFiles.map(function (syncFile) {
    return { from: syncFile, to: '[path][name].[ext]' };
  })), new webpack.optimize.CommonsChunkPlugin({ names: commonChunks4CommonPlugin }), new webpack.DefinePlugin(define), new FTLPlugin({
    entries: entryChunks,
    commons: commonChunks4FtlPlugin
  })];
}

// 获取生产模式下的插件
function getProductionPlugins() {
  return [new webpack.HashedModuleIdsPlugin({
    hashDigestLength: HASH_LENGTH
  }), new webpack.LoaderOptionsPlugin({
    minimize: true,
    debug: false
  }),
  // 脚本压缩
  new webpack.optimize.UglifyJsPlugin({
    output: {
      // 保留感叹号开头的注释（多是版权说明）
      comments(node, comment) {
        return comment.type === 'comment2' && comment.value.charAt(0) === '!';
      }
    },
    sourceMap: true
  }),
  // 图片压缩
  new ImageminWebpackPlugin({
    test: /\.(jpe?g|png)$/i,
    optipng: null,
    pngquant: {
      quality: '65-90'
    },
    jpegtran: {
      // 开启 JPEG 图片渐进显示特性
      progressive: true
    }
  })];
}

// 获取插件
function getPlugins(options) {
  var production = options.production;

  return getBasePlugins(options).concat(production ? getProductionPlugins() : []);
}

module.exports = getPlugins;