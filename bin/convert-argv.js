var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var processCWD = process.cwd();
var defaultOptions = {
  // 当前工作目录
  cwd: process.cwd(),

  // 排除的文件或目录(glob格式)
  exclude: [],

  // 输出的主目录
  output: 'build',

  // hash版本号的长度，如果不想加就设置为0
  hash: 10,

  // hash版本号连接符
  hashConcat: '.',

  // 静态文件的域名
  domain: '',

  // 插件
  plugins: [],

  module: {
    // 任务
    tasks: [],

    taskMap: {},

    // 文件生成配置
    road: []
  },

  resolve: {
    alias: {},
    modulesDirectories: ['node_modules', 'bower_components'],
    fallback: [],
    packageMains: [],
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

function useTaskMap(tasks, taskMap) {
  return tasks.map(function(task) {
    return _.isString(task) ? taskMap[task] : task;
  });
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

  var module = options.module;
  module.tasks = useTaskMap(module.tasks, module.taskMap);

  return options;
};
