const autoprefixer = require('autoprefixer');

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
    modules: true,
    localIdentName: '[path][name]---[local]---[hash:base64:5]',
    importLoaders: 1,
  },
};

// postcss 加载器，增强样式
// https://github.com/postcss/postcss
function getPostcssLoader({ browsers }) {
  return {
    loader: 'postcss-loader',
    options: {
      plugins() {
        return [
          // 自动补全浏览器前缀插件
          // https://github.com/postcss/autoprefixer
          autoprefixer({
            browsers,
          }),
        ];
      },
    },
  };
}

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
function getBabelLoader({ browsers }) {
  return {
    loader: 'babel-loader',
    options: {
      cacheDirectory: true,
      presets: [
        ['env', { targets: { browsers } }],
        'react',
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
      cssModules: cssLoader.options,
      postcss: getPostcssLoader(options).options,
    },
  };
}

function getLoaders(options) {
  const { production } = options;

  return [
    {
      test: /\.js$/,
      use: [
        getBabelLoader(options),
      ],
    },
    {
      test: /\.vue$/,
      use: [
        getVueLoader(options),
      ],
    },
    {
      test: /\.less$/,
      use: [
        styleLoader,
        cssLoader,
        getPostcssLoader(options),
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
        getPostcssLoader(options),
      ],
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
  ];
}

module.exports = getLoaders;
