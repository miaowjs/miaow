var Compiler = require('./Compiler');
var Cache = require('./plugins/Cache');
var Clean = require('./plugins/Clean');
var LiveReload = require('./plugins/LiveReload');
var Log = require('./plugins/Log');
var convertOptions = require('./convertOptions');

module.exports = function(options, callback) {
  options = convertOptions(options);

  var compiler = new Compiler(options);

  var plugins = options.plugins || [];

  options.cache && plugins.push(new Cache(options.cache));
  plugins.push(new Clean());
  plugins.push(new Log(options.output));
  options.watch && plugins.push(new LiveReload());

  plugins.forEach(function(plugin) {
    compiler.apply(plugin);
  });

  if (callback) {
    if (options.watch) {
      compiler.watch(callback);
    } else {
      compiler.run(callback);
    }
  }

  return compiler;
};
