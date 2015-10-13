var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var processCWD = process.cwd();
var defaultOptions = {
  // 工作目录
  cwd: process.cwd(),

  // 排除的文件或目录(glob格式)
  exclude: [],

  // 输出目录
  output: 'build',

  // 缓存目录
  cache: '',

  // hash版本号的长度，如果不想加就设置为0
  md5Length: 10,

  // hash版本号连接符
  md5Connector: '.',

  // 静态文件的域名
  domain: '',

  // 插件
  plugins: [],

  // 模块编译设置
  modules: [],

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

// 获取配置文件路径
function getConfigPath(argv) {
  // 配置文件列表
  var configPathList = [];

  if (argv.configPath) {
    configPathList.push(path.resolve(processCWD, argv.configPath));
  }

  if (argv.cwd) {
    configPathList.push(path.resolve(argv.cwd, 'miaow.config.js'));
  }

  configPathList.push(path.resolve(processCWD, 'miaow.config.js'));

  return _.find(configPathList, fs.existsSync);
}

module.exports = function(argv) {
  var options = {};

  var configPath = getConfigPath(argv);
  if (configPath) {
    options = require(configPath);

    if (_.isArray(options)) {
      if (argv.environment) {
        options = _.find(options, {environment: argv.environment});
        if (!options) {
          throw new Error('查不到运行环境为 ' + argv.environment + ' 的配置信息。');
        }
      } else {
        options = options[0];
      }
    }
  }

  // 设置工作目录和输出目录
  if (argv._.length) {
    options.cwd = path.resolve(processCWD, argv._[0]);

    if (argv._[1]) {
      options.output = path.resolve(processCWD, argv._[1]);
    }
  }

  if (argv.watch) {
    options.watch = true;
  }

  options = _.assign({}, defaultOptions, options);

  var moduleDefault = _.pick(options, ['cwd', 'md5Length', 'md5Connector', 'domain']);
  options.modules = options.modules.map(function(module) {
    return _.assign({}, moduleDefault, module);
  });

  return options;
};
