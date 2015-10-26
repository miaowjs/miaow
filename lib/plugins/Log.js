var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var pkg = require('../../package.json');

function Log(output) {
  this.output = output;
}

Log.prototype.apply = function(compiler) {
  var log = this;
  compiler.plugin('compile-success', function(compilation, callback) {
    var modules = _.map(compilation.modules, function(module) {
      return _.pick(
        module, ['src', 'srcHash', 'dest', 'destHash', 'url', 'fileDependencies', 'extra']
      );
    });

    fs.writeFile(
      path.join(log.output, 'miaow.log.json'),
      JSON.stringify({
        version: pkg.version,
        modules: modules
      }, null, '  '),
      callback
    );
  });
};

module.exports = Log;
