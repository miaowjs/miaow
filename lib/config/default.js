var config = {
  // 当前工作目录
  cwd: process.cwd(),

  // 排除的文件或目录(glob格式)
  exclude: [],

  // 输出的主目录
  output: 'dest',

  // 是否校验代码
  lint: false,

  // 是否压缩代码
  mini: false,

  // hash版本号的长度,如果不想加就设置为0
  hash: 10,

  // hash版本号连接符
  hashConcat: '_',

  // 静态文件的域名
  domain: '',

  module: {
    // 编译器配置
    parse: [
      {
        test: /\.js$/,
        plugins: ['miaow-js-parse']
      },

      {
        test: /\.jsx$/,
        plugins: ['miaow-jsx-parse', 'miaow-js-parse']
      },

      {
        test: /\.css$/,
        plugins: ['miaow-css-parse']
      },

      {
        test: /\.less$/,
        plugins: ['miaow-less-parse', 'miaow-css-parse']
      },

      {
        test: /\.ftl$/,
        plugins: ['miaow-ftl-parse']
      }
    ],

    // 文件生成配置
    road: [],

    // 文件校验配置
    lint: [
      {
        test: /\.js$/,
        plugins: ['miaow-js-lint']
      }
    ],

    // 压缩配置
    mini: [
      {
        test: /\.js$/,
        plugins: ['miaow-js-mini']
      },

      {
        test: /\.css$/,
        plugins: ['miaow-css-mini']
      },

      {
        test: /\.jp[e]?g$/,
        plugins: ['miaow-jpg-mini']
      },

      {
        test: /\.png$/,
        plugins: ['miaow-png-mini']
      }
    ]
  },

  pack: ['miaow-ftl-pack'],

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
