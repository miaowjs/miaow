const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ImageminWebpackPlugin = require('imagemin-webpack-plugin').default;

const FTLPlugin = require('./plugins/FTLPlugin');

const { HASH_LENGTH } = require('./constants');
const { getChunkName } = require('./utils');

// 获取基础的插件
function getBasePlugins(options) {
  const { entries, syncFiles, commons, manifest, define } = options;

  let manifestInArray = [manifest];
  if (!manifest) {
    manifestInArray = [];
  }

  // 公共脚本 chunk
  const commonChunks4CommonPlugin = commons.reverse().concat(manifestInArray).map(getChunkName);
  const commonChunks4FtlPlugin = manifestInArray.concat(commons.reverse()).map(getChunkName);

  // 入口 chunk
  const entryChunks = entries
    .filter(entry => !!entry.template)
    .map(({ script, template }) => ({
      script: script ? getChunkName(script) : '',
      template: getChunkName(template),
    }));

  return [
    new webpack.NamedChunksPlugin(),
    new CopyWebpackPlugin(syncFiles.map(syncFile => ({ from: syncFile, to: '[path][name].[ext]' }))),
    new webpack.optimize.CommonsChunkPlugin({ names: commonChunks4CommonPlugin }),
    new webpack.DefinePlugin(define),
    new FTLPlugin({
      entries: entryChunks,
      commons: commonChunks4FtlPlugin,
      define,
    }),
  ];
}

// 获取生产模式下的插件
function getProductionPlugins() {
  return [
    new webpack.HashedModuleIdsPlugin({
      hashDigestLength: HASH_LENGTH,
    }),
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
