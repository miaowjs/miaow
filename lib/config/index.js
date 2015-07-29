var _ = require('lodash');
var fs = require('fs');
var mutil = require('miaow-util');
var path = require('path');

// 默认配置
var defaultConfig = require('./default');

module.exports = function (options) {
  options = options || {};

  var environment = options.environment || 'default';

  var configList;

  try {
    var configPath;

    if (options.configPath) {
      configPath = path.resolve(process.cwd(), options.configPath);

      if (!fs.existsSync(configPath)) {
        throw new Error('找不到指定的配置文件: ' + options.configPath);
      }
    } else if(options.cwd){
      configPath = path.resolve(options.cwd, 'miaow.config.js');
    }

    if (!configPath || !fs.existsSync(configPath)) {
      configPath = path.resolve(process.cwd(), 'miaow.config.js');
    }

    // 尝试读取用户配置
    if (fs.existsSync(configPath)) {
      configList = require(configPath);
      configList = _.isArray(configList) ? configList : [configList];
      mutil.log('使用的配置路径: ' + configPath);
    } else {
      configList = [defaultConfig];
      mutil.log('使用默认配置');
    }
  } catch (err) {
    console.error('读取配置信息出错');
    console.error(err.toString());
    process.exit(1);
    return;
  }

  var config = _.find(configList, {environment: environment});

  if (!config) {
    if (environment === 'default') {
      config = configList[0];
    } else {
      throw new Error('查不到运行环境为 ' + environment + ' 的配置信息.');
    }
  }

  return _.extend({}, defaultConfig, config, _.pick(options, function (option, key) {
    return key !== 'environment' && key !== 'configPath';
  }));
};
