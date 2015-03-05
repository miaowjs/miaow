'use strict';

var _ = require('underscore');
var globule = require('globule');

exports.checkCondition = function (condition, text) {
  if (_.isRegExp(condition)) {
    return condition.test(text);
  } else {
    return globule.isMatch(condition, text);
  }
};
