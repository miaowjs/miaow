const autoprefixer = require('autoprefixer');

// Babel 加载器
// https://babeljs.io/
function getBabelLoader({ browsers }) {
  return {
    loader: 'babel-loader',
    options: {
      cacheDirectory: true,
      presets: [
        ['env', { targets: { browsers }, modules: false }],
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
  const { production } = options;

  return [
    {
      test: /\.js$/,
      use: [getBabelLoader(options)],
    },
    {
      test: /\.vue$/,
      use: [getVueLoader(options)],
    },
    {
      test: /\.less$/,
      use: [
        'shrink-style-loader',
        'postcss-loader',
        'less-loader',
      ],
    },
    {
      test: /\.css$/,
      use: ['shrink-style-loader', 'postcss-loader'],
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
      test: /\.(jpe?g|png|gif|eot|svg|ttf|woff|woff2)(\?.*)?$/,
      use: [
        {
          loader: 'file-loader',
          options: {
            name: production
              ? '[path][name].[hash:10].[ext]'
              : '[path][name].[ext]',
          },
        },
      ],
    },
  ];
}

module.exports = getLoaders;
