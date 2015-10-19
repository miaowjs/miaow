var Console = require('./Console');
var Compiler = require('./Compiler');
var Cache = require('./plugins/Cache');
var Clean = require('./plugins/Clean');
var Log = require('./plugins/Log');

module.exports = function(options, callback) {
  var console = new Console(options.silent);
  var compiler = new Compiler(options);

  compiler.console = console;

  var plugins = options.plugins || [];

  options.cache && plugins.push(new Cache(options.cache));
  plugins.push(new Clean());
  plugins.push(new Log(options.output));

  plugins.forEach(function(plugin) {
    plugin.console = console;
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
