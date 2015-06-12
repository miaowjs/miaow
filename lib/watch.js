var _ = require('lodash');
var vinylFs = require('vinyl-fs');

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

  vinylFs.watch(globs, {cwd: options.cwd, debounceDelay: 1e3}, doCompile);

  doCompile();
}

module.exports = watch;
