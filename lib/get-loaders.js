const browserslist = require('browserslist');

const { HASH_LENGTH } = require('./constants');

/**
 * TODO: 由于 babel-preset-env@1.5.2 无法从 package.json 里面获取浏览器支持配置
 * 所以只能暂时手动获取浏览器列表，传递给 babel-preset-env。
 * babel-preset-env@2.0.0 会修复了这个问题，到时候删掉手动获取浏览器列表的过程
 */
const browsers = browserslist();

// Babel 加载器
// https://babeljs.io/
function getBabelLoader() {
  return {
    loader: 'babel-loader',
    options: {
      cacheDirectory: true,
      presets: [
        ['env', {
          targets: {
            browsers,
          },
          modules: false,
        }],
        'react',
        'stage-2',
      ],
    },
  };
}

// Vue 加载器
// https://vue-loader.vuejs.org/zh-cn/
function getVueLoader(options) {
  return {
    loader: 'vue-loader',
    options: {
      loaders: {
        js: getBabelLoader(options),
      },
    },
  };
}

function getLoaders(options) {
  const {
    production,
  } = options;

  const fileLoaderFilename = production ?
    `[path][name].[hash:${HASH_LENGTH}].[ext]` :
    '[path][name].[ext]';

  const cssFileLoaderFilename = production ?
    `[path][name].[hash:${HASH_LENGTH}].css` :
    '[path][name].css';

  return [
    {
      test: /\.(js|es6)$/,
      use: [getBabelLoader(options)],
    },
    {
      test: /\.vue$/,
      use: [getVueLoader(options)],
    },
    {
      test: /\.ftl$/,
      use: [
        {
          loader: 'file-loader',
          options: {
            publicPath: '/',
            name: '[path][name].[ext]',
          },
        },
        'extract-loader',
        {
          loader: 'ftl-loader3',
          options: {
            attrs: [
              'link:href',
              'img:src',
              'include',
              'import',
            ],
            interpolate: 'require',
            rules: [
              {
                test: /\.(less|css)$/,
                loader: `!file-loader?name=${cssFileLoaderFilename}!extract-loader!css-loader!postcss-loader!less-loader!`,
              },
            ],
          },
        },
      ],
    },
    {
      test: /\.less$/,
      use: [
        'shrink-style-loader',
        'css-loader',
        'postcss-loader',
        'less-loader',
      ],
    },
    {
      test: /\.css$/,
      use: ['shrink-style-loader', 'css-loader', 'postcss-loader'],
    },
    {
      test: /\.art$/,
      loader: {
        loader: 'art-template-loader',
        options: {
          minimize: false,
        },
      },
    },
    {
      test: /favicon\.ico$/,
      use: [
        {
          loader: 'file-loader',
          options: {
            publicPath: '/',
            name: fileLoaderFilename,
          },
        },
      ],
    },
    {
      test: /\.(jpe?g|png|gif|eot|svg|ttf|woff|woff2)(\?.*)?$/,
      use: [
        {
          loader: 'file-loader',
          options: {
            name: fileLoaderFilename,
          },
        },
      ],
    },
  ];
}

module.exports = getLoaders;
