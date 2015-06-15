var _ = require('lodash');
var gaze = require('gaze');

var compile = require('./compile');
var config = require('./config');

function watch(options) {
  options = _.extend({}, config, options || {});

  var globs = ['./**/*'].concat(_.map(options.exclude || [], function (item) {
    return '!' + item;
  }));

  function doCompile() {
    compile(options, function (err) {
      if (err) {
        console.error(err.toString());
      }
    });
  }

  gaze(globs, {cwd: options.cwd, debounceDelay: 1e3}, function () {
    this.on('all', doCompile);
  });

  doCompile();
}

module.exports = watch;
