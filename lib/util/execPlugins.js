var _ = require('lodash');
var async = require('async');

module.exports = function (context, plugins, cb) {
  var util = require('./index');

  async.eachSeries(
    _.isArray(plugins) ? plugins : [plugins],
    function (plugin, cb) {
      var option = {};

      if (_.isPlainObject(plugin)) {
        option = plugin.option;
        plugin = plugin.plugin;
      }

      if (_.isFunction(plugin)) {
        plugin.call(context, option, util, cb);
      } else {
        require(plugin).call(context, option, util, cb);
      }
    }.bind(this),
    cb
  );
};
