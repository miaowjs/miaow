var async = require('async');

function Watcher(compiler) {
  this.compiler = compiler;
}

Watcher.prototype.watch = function(callback) {
  async.series([
    this.prepare,
    this.start
  ], function(err) {

  });
};

Watcher.prototype.prepare = function(callback) {
  function plugin(callback) {}

  function liveReload() {}

  function compile(callback) {}

  this.compiler.applyPluginsAsync('watch', function(err) {
    if (err) {
      return callback(err);
    }

    this.compiler.compile(function() {


    });
  }.bind(this));
};

Watcher.prototype.start = function() {

};

module.exports = Watcher;
