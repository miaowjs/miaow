var async = require('async');
var path = require('path');

module.exports = {
  // 工作目录
  context: path.resolve('.'),

  // 排除的文件或目录(glob格式)
  exclude: [],

  // 输出目录
  output: path.resolve(__dirname, '../output'),

  // 缓存目录
  cache: path.resolve(__dirname, '../cache'),

  // hash版本号的长度，如果不想加就设置为0
  hashLength: 10,

  // hash版本号连接符
  hashConnector: '.',

  // 静态文件的域名
  domain: 'http://127.0.0.1/',

  // 调试模式
  debug: true,

  // 插件
  plugins: [],

  // 模块编译设置
  modules: [
    {
      test: 'dest.es6',
      url: '$0',
      release: 'dest/$0',
      ext: '.js',
      charset: 'gbk'
    },

    {
      test: 'resolve.js',
      tasks: [
        function(options, callback) {
          var context = this;

          async.series([
            context.resolveModule.bind(context, 'bar'),
            context.resolveModule.bind(context, 'foo')
          ], callback);
        }
      ]
    },

    {
      test: 'emit.js',
      tasks: [
        function(options, callback) {
          var context = this;

          context.emitModule('emited.js', new Buffer('console.log(\'emited file\');'), function(err, emited) {
            if (err) {
              callback(err);
            } else {
              context.contents = new Buffer('console.log(\'emited file is ' + emited.url + '\');');
              callback();
            }
          });
        }
      ]
    },

    {
      test: 'debug.js',
      tasks: [
        function(options, callback) {
          var context = this;

          context.contents = new Buffer('' + context.debug);
          callback();
        }
      ]
    }
  ],

  // 寻路设置
  resolve: {
    moduleDirectory: ['.remote', 'bower_components'],
    extensions: ['.js'],
    extensionAlias: {
      '.css': ['.less']
    }
  }
};
