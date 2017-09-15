const webpack = require('webpack');
const ImageminWebpackPlugin = require('imagemin-webpack-plugin').default;

const FTLPlugin = require('./plugins/FTLPlugin');

const { HASH_LENGTH } = require('./constants');
const { getChunkName } = require('./utils');

// 获取基础的插件
function getBasePlugins(options) {
  const { entries, commons, chunkFilename, define } = options;

  // 入口 chunk
  const entryChunks = entries
    .filter(entry => !!entry.template)
    .map(({ script, template }) => ({
      script: script ? getChunkName(script) : '',
      template: getChunkName(template),
    }));

  return [
    new webpack.NamedChunksPlugin(),
    new webpack.DefinePlugin(define),
    new webpack.optimize.CommonsChunkPlugin({ names: commons.map(getChunkName) }),
    new webpack.optimize.CommonsChunkPlugin({ name: 'manifest', filename: chunkFilename }),
    new FTLPlugin({
      entries: entryChunks,
      commons: ['manifest'].concat(commons).map(getChunkName),
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
