var _ = require('lodash');
var path = require('path');

// 默认配置
var defaultConfig = require('./default');

var config = {};

try {
  // 尝试读取用户配置
  config = require(path.resolve(process.cwd(), 'miaow.config.js'));
} catch (e) {
}

module.exports = _.extend({}, defaultConfig, config);
