var _ = require('lodash');
var fs = require('graceful-fs');
var path = require('path');
var console = require('miaow-util').console;

var processCWD = process.cwd();
var defaultOptions = {
  // 工作目录
  context: process.cwd(),

  // 排除的文件或目录(glob格式)
  exclude: [],

  // 输出目录
  output: 'build',

  // 缓存目录
  cache: 'cache',

  // hash版本号的长度，如果不想加就设置为0
  hashLength: 10,

  // hash版本号连接符
  hashConnector: '.',

  // 静态文件的域名
  domain: '',

  // 调试模式
  debug: true,

  // 插件
  plugins: [],

  // 模块编译设置
  modules: [],

  // 寻路设置
  resolve: {
    moduleDirectory: ['node_modules', 'bower_components'],
    extensions: ['.js'],
    extensionAlias: {
      '.css': ['.less']
    }
  }
};

// 获取配置文件路径
function getConfigPath(configPath, context) {
  // 配置文件列表
  var configPathList = [];

  if (configPath) {
    configPathList.push(path.resolve(processCWD, configPath));
  }

  if (context) {
    configPathList.push(path.resolve(context, 'miaow.config.js'));
  }

  configPathList.push(path.resolve(processCWD, 'miaow.config.js'));

  return _.find(configPathList, fs.existsSync);
}

module.exports = function(argv) {
  var options = {};

  if (argv.silent) {
    console.log = console.warn = _.noop;
  }

  var configPath = getConfigPath(argv.configPath, argv.context);
  if (configPath) {
    console.log('使用配置：' + configPath);

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

  options = _.assign({}, defaultOptions, options, argv);

  // 设置模块的参数
  options.modules = (options.modules.concat({test: '**/*'})).map(function(module) {
    module.tasks = (module.tasks || []).map(function(task) {
      if (_.isFunction(task)) {
        task = {
          task: task,
          options: {}
        };
      }

      return task;
    });

    return _.assign(
      {},
      _.pick(options, ['hashLength', 'hashConnector', 'domain', 'debug']),
      module,
      _.pick(options, ['context', 'output'])
    );
  });

  return options;
};
