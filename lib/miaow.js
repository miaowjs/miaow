var _ = require('lodash');
var serialize = require('serialize-javascript');

var Compiler = require('./Compiler');
var Cache = require('./plugins/Cache');
var Clean = require('./plugins/Clean');
// var LiveReload = require('./plugins/LiveReload');
var Log = require('./plugins/Log');
var convertOptions = require('./convertOptions');

module.exports = function(options, callback) {
  options = convertOptions(options);

  var compiler = new Compiler(options);

  var plugins = options.plugins || [];

  options.cache && plugins.unshift(
    new Cache(
      serialize(_.pick(options, ['output', 'cache', 'hashLength', 'hashConnector', 'domain', 'plugins', 'modules', 'resolve'])),
      options.cache,
      options.context,
      options.output
    )
  );
  plugins.push(new Clean());
  plugins.push(new Log(options.output));
  // options.watch && plugins.push(new LiveReload());

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
