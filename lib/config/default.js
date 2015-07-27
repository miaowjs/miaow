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
    ],

    // 文件生成配置
    road: []
  },

  // 编译任务的后续任务
  nextTasks: [],

  resolve: {
    moduleDirectory: ['node_modules', 'bower_components'],
    extensions: ['.js', '.less'],
    extensionAlias: {
      '.css': ['.less']
    }
  }
};

module.exports = config;
