var Compiler = require('./Compiler');

module.exports = function(options, callback) {
  var compiler = new Compiler(options);

  if (callback) {
    if (options.watch) {
      compiler.watch(callback);
    } else {
      compiler.run(callback);
    }
  }

  return compiler;
};
