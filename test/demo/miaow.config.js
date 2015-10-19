var path = require('path');

module.exports = {
  // 工作目录
  context: path.resolve('.'),

  // 排除的文件或目录(glob格式)
  exclude: [],

  // 输出目录
  output: path.resolve('../output'),

  // 缓存目录
  cache: '',//path.resolve('../cache'),

  // hash版本号的长度，如果不想加就设置为0
  hashLength: 10,

  // hash版本号连接符
  hashConnector: '.',

  // 静态文件的域名
  domain: 'http://127.0.0.1/test',

  // 插件
  plugins: [],

  // 模块编译设置
  modules: [
    {
      test: '*.es6',
      ext: '.js'
    },

    {
      test: '*.js',
      tasks: [
        function(options, callback) {
          var context = this;
          context.resolveModule('./foo.es6', {}, function(err, result) {
            console.log(err || result);

            context.emitModule('foo.es6.txt', new Buffer('create by bar.js'), callback);
          });
        }
      ]
    }
  ],

  // 打包设置
  package: [],

  // 寻路设置
  resolve: {
    modulesDirectories: ['node_modules', 'bower_components'],
    extensions: ['', '.js'],
    extensionAlias: {
      '.css': ['.less']
    }
  }
};
