var _ = require('lodash');
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
    } else {
      configPath = path.resolve(options.cwd || process.cwd(), 'miaow.config.js');
    }

    // 尝试读取用户配置
    configList = require(configPath);
    configList = _.isArray(configList) ? configList : [configList];
  } catch (e) {
    configList = [defaultConfig];
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
