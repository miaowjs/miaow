const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ImageminWebpackPlugin = require('imagemin-webpack-plugin').default;

const { getEntryName } = require('./utils');

// 获取基础的插件
function getBasePlugins(options) {
  const { syncFiles, commons, production, define, publicPath } = options;

  return [
    new CopyWebpackPlugin(syncFiles.map(syncFile => ({ from: syncFile, to: '[path][name].[ext]' }))),
    new webpack.optimize.CommonsChunkPlugin({
      names: commons.reverse().map(getEntryName),
    }),
    new webpack.DefinePlugin(Object.assign({
      // CDN 变量
      __cdn__: JSON.stringify(publicPath),
      // 调试变量
      __debug__: (!!production).toString(),
      // 设置 process.env.NODE_ENV 变量，可以让 vue 等库进入生产模式
      'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
    }, define)),
  ];
}

// 获取生产模式下的插件
function getProductionPlugins() {
  return [
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false,
    }),
    // 脚本压缩
    new webpack.optimize.UglifyJsPlugin({
      output: {
        // 保留感叹号开头的注释（多是版权说明）
        comments(node, comment) {
          return comment.type === 'comment2' && comment.value.charAt(0) === '!';
        },
      },
      sourceMap: true,
    }),
    // 图片压缩
    new ImageminWebpackPlugin({
      test: /\.(jpe?g|png)$/i,
      optipng: null,
      pngquant: {
        quality: '65-90',
      },
      jpegtran: {
        // 开启 JPEG 图片渐进显示特性
        progressive: true,
      },
    }),
  ];
}

// 获取插件
function getPlugins(options) {
  const { production } = options;
  return getBasePlugins(options).concat(production ? getProductionPlugins() : []);
}

module.exports = getPlugins;
