'use strict';

var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var globule = require('globule');

var util = require('./util');

var config = (function () {
  var config = {};
  var configPath = path.join(process.cwd(), 'miaow-config.json');

  if (fs.existsSync(configPath)) {
    config = require(configPath);
  }

  config.plugins = _.uniq([
    {name: './plugins/coffee'},
    {name: './plugins/js'},
    {name: './plugins/css'},
    {name: './plugins/html'},
    {name: './plugins/image'}
  ].concat(config.plugins || []), function (plugin) {
    return plugin.name;
  });

  return config;
})();

exports.config = config;

exports.getSources = function () {
  var include = config.include;
  var exclude = config.exclude;

  var sources = globule.find({
    src: '*.*',
    filter: function (filepath) {
      var result;

      function check(condition) {
        return util.checkCondition(condition, filepath);
      }

      if (include) {
        result = false;

        if (!_.isArray(include)) {
          include = [include];
        }

        if (_.any(include, check)) {
          result = true;
        }
      } else {
        result = true;
      }

      if (result && exclude) {

        if (!_.isArray(exclude)) {
          exclude = [exclude];
        }

        if (_.any(exclude, check)) {
          result = false;
        }
      }

      return result;

    }
  });

  return sources;
};
