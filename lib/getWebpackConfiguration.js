const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ImageminWebpackPlugin = require('imagemin-webpack-plugin').default;

// 当前进程的路径
const processCWD = process.cwd();

// 需要兼容的浏览器列表
// https://github.com/ai/browserslist
const browsers = ['> 1%', 'last 2 versions', 'iOS >= 6', 'Android >= 2.1', 'Explorer >= 7', 'Firefox >= 38', 'Chrome >= 30'];

// 自动补全浏览器前缀插件
// https://github.com/postcss/autoprefixer
const autoprefixer = require('autoprefixer')({
  browsers,
});

// 样式加载器
// https://github.com/webpack-contrib/style-loader
const styleLoader = {
  loader: 'style-loader',
};

// CSS 加载器，主要是启用 CSS Modules
// https://github.com/webpack-contrib/css-loader
// https://github.com/css-modules/css-modules
const cssLoader = {
  loader: 'css-loader',
  options: {
    importLoaders: 1,
  },
};

// postcss 加载器，增强样式
// https://github.com/postcss/postcss
const postcssLoader = {
  loader: 'postcss-loader',
  options: {
    plugins() {
      return [
        autoprefixer,
      ];
    },
  },
};

// art 模版加载器
// https://github.com/aui/art-template-loader
const artLoader = {
  loader: 'art-template-loader',
  options: {
    minimize: false,
  },
};

// Babel 加载器
// https://babeljs.io/
const babelLoader = {
  loader: 'babel-loader',
  options: {
    cacheDirectory: true,
    presets: [
      ['env', { targets: { browsers } }],
    ],
  },
};

// Vue 加载器
// https://vue-loader.vuejs.org/zh-cn/
const vueLoader = {
  loader: 'vue-loader',
  options: {
    loaders: {
      js: babelLoader,
    },
    cssModules: cssLoader.options,
    postcss: postcssLoader.options,
  },
};

// 获取 entry 的名字，主要剔除头部的 ./ 和尾部的 .js
const getEntryName = entry => entry.replace(/^\.\//, '').replace(/\.js$/, '');

// 获取 webpack 的配置信息
const getWebpackConfiguration = (options) => {
  const {
    watch = false,
    context = processCWD,
    output = path.resolve(processCWD, 'build'),
    publicPath = '/',
    commons = [],
    entries = [],
    syncFiles = [],
    production = false,
  } = options;

  // 通过 entries 获取 entry
  const entry = {};
  entries.forEach(({ script }) => {
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
      filename: production ? '[name].[chunkhash:10].js' : '[name].js',
    },
    devtool: production ? 'cheap-source-map' : 'eval',
    module: {
      rules: [
        {
          test: /\.js$/,
          use: [
            babelLoader,
          ],
        },
        {
          test: /\.vue$/,
          use: [
            vueLoader,
          ],
        },
        {
          test: /\.less$/,
          use: [
            styleLoader,
            cssLoader,
            postcssLoader,
            {
              loader: 'less-loader',
            },
          ],
        },
        {
          test: /\.css$/,
          use: [
            styleLoader,
            cssLoader,
            postcssLoader,
          ],
        },
        {
          test: /\.hbs$/,
          loader: 'handlebars-loader',
        },
        {
          test: /\.tpl$/,
          // lodash 的模版加载器
          // https://lodash.com/docs/4.17.4#template
          loader: 'tpl-loader',
        },
        {
          test: /\.art$/,
          loader: artLoader,
        },
        {
          test: /\.(jpe?g|png|gif|eot|svg|ttf|woff|woff2)(\?.*)?$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: production ? '[path][name].[hash:10].[ext]' : '[path][name].[ext]',
              },
            },
          ],
        },
      ],
    },

    resolve: {
      modules: [
        'common',
        'node_modules',
      ],
    },
    plugins: [
      new CopyWebpackPlugin(syncFiles.map(syncFile => ({ from: syncFile, to: '[path][name].[ext]' }))),
      new webpack.optimize.CommonsChunkPlugin({
        names: commons.reverse().map(getEntryName),
      }),
    ],
  };

  // 生产模式处理
  if (production) {
    configuration.plugins.push(
      new CopyWebpackPlugin(syncFiles.map(syncFile => ({ from: syncFile, to: '[path][name].[hash:10].[ext]' }))),
      new webpack.LoaderOptionsPlugin({
        minimize: true,
        debug: false,
      }),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production'),
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
          speed: 4,
        },
        jpegtran: {
          progressive: true,
        },
      }));
  }

  return configuration;
};

module.exports = getWebpackConfiguration;
