var Compiler = require('./Compiler');
var OptionsApply = require('OptionsApply');

module.exports = function(options, callback) {
  var compiler = new Compiler();
  compiler.options = new OptionsApply().process(options, compiler);

  if (callback) {
    if (options.watch) {
      compiler.watch(callback);
    } else {
      compiler.run(callback);
    }
  }

  return compiler;
};
