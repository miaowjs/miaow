var config = {
  // 当前工作目录
  cwd: process.cwd(),

  // 排除的文件或目录(glob格式)
  exclude: [],

  // 输出的主目录
  output: 'dest',

  // hash版本号的长度,如果不想加就设置为0
  hash: 10,

  // hash版本号连接符
  hashConcat: '_',

  // 静态文件的域名
  domain: '',

  module: {
    tasks: [
      {
        test: /\.js$/,
        plugins: [
          'miaow-url-parse',
          'miaow-inline-parse',
          'miaow-amd-parse',
          'miaow-amd-wrap',
          'miaow-js-lint',
          'miaow-js-mini'
        ]
      },

      {
        test: /\.jsx$/,
        plugins: [
          'miaow-babel-parse',
          'miaow-url-parse',
          'miaow-inline-parse',
          'miaow-amd-parse',
          'miaow-amd-wrap',
          'miaow-js-lint',
          'miaow-js-mini'
        ]
      },

      {
        test: /\.css$/,
        plugins: [
          {
            plugin: 'miaow-url-parse',
            reg: /['"\(]\s*([\w_\/\.\-]*\.(?:jpg|jpeg|png|gif|cur|js|css|eot|woff|ttf|svg))[^'"\)]*\s*['"\)]/gi
          },
          'miaow-inline-parse',
          'miaow-css-sprite',
          'miaow-css-mini'
        ]
      },

      {
        test: /\.less$/,
        plugins: [
          'miaow-less-parse',
          {
            plugin: 'miaow-url-parse',
            reg: /['"\(]\s*([\w_\/\.\-]*\.(?:jpg|jpeg|png|gif|cur|js|css|eot|woff|ttf|svg))[^'"\)]*\s*['"\)]/gi
          },
          'miaow-inline-parse',
          'miaow-css-sprite',
          'miaow-css-mini'
        ]
      },

      {
        test: /\.jp[e]?g$/,
        plugins: [
          'miaow-jpg-mini'
        ]
      },

      {
        test: /\.png$/,
        plugins: [
          'miaow-png-mini'
        ]
      }
    ],

    // 文件生成配置
    road: []
  },

  pack: ['miaow-html-pack'],

  resolve: {
    moduleDirectory: ['node_modules', 'bower_components'],
    extensions: ['.js', '.jsx'],
    extensionAlias: {
      '.css': ['.less'],
      '.js': ['.jsx']
    }
  }
};

module.exports = config;
