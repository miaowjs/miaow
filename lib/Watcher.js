var _ = require('lodash');
var async = require('async');
var console = require('miaow-util').console;
var chokidar = require('chokidar');
var minimatch = require('minimatch');
var path = require('path');

function Watcher(compiler) {
  this.compiler = compiler;
}

Watcher.prototype.watch = function(callback) {
  this.compiler.applyPluginsAsync('watch', function(err) {
    if (err) {
      return callback(err);
    }

    this.start(callback);
  }.bind(this));
};

Watcher.prototype.start = function(outcallback) {
  var compiler = this.compiler;
  var queue = async.queue(function(task, callback) {
    compiler.compile(function(err) {
      outcallback(err);
      callback();
    });
  }, 1);

  queue.push('', function() {
    var exclude = compiler.options.exclude.concat(['**/.*', '**/.*/**/*']);
    var watcher = chokidar.watch(compiler.context, {
      cwd: compiler.context,
      ignored: [function(file) {
        return path.basename(file) === 'miaow.config.js' || !!_.find(exclude, minimatch.bind(minimatch, file));
      }]
    });

    watcher.on('ready', function() {
      console.log('开始监听');

      watcher.on('all', queue.push.bind(queue, '', _.noop));
    });
  });
};

module.exports = Watcher;
