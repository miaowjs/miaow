var _ = require('lodash');
var fs = require('fs');
var mutil = require('miaow-util');
var console = mutil.console;
var path = require('path');

var pkg = require('../../package.json');

function Log(output) {
  this.output = output;
}

Log.prototype.apply = function(compiler) {
  var log = this;
  compiler.plugin('compile-success', function(compilation, callback) {
    console.log('保存编译日志');
    var modules = _.map(_.sortBy(compilation.modules, 'src'), function(module) {
      return _.pick(
        module, ['src', 'srcHash', 'dest', 'destHash', 'url', 'dependencies', 'extra']
      );
    });

    fs.writeFile(
      path.join(log.output, 'miaow.log.json'),
      JSON.stringify({
        version: pkg.version,
        modules: modules
      }, null, '  '),
      function(err) {
        if (err) {
          console.warn('保存编译日志失败');
          console.warn(err);
        }

        callback();
      }
    );
  });
};

module.exports = Log;
