var _ = require('lodash');
var Cache = require('./Cache');
var Compilation = require('./Compilation');
var ModuleFactory = require('./ModuleFactory');
var Resolver = require('./Resolver');
var Watcher = require('./Watcher');

function Compiler(options) {
  this.resolver = new Resolver(options.resolve);
  this.cache = new Cache(options.cache);

  this.options = options;
}

Compiler.prototype.prepare = function(callback) {

};

Compiler.prototype.run = function(callback) {
  this.compile(callback);
};

Compiler.prototype.watch = function(callback) {
  var watcher = new Watcher(this, callback);
  watcher.watch();
};

Compiler.prototype.compile = function(callback) {
  var moduleFactory = new ModuleFactory(this.options.modules, this.resolver);

  var compilation = new Compilation(this.files, moduleFactory, this.cache);

  compilation.seal(callback);
};

module.exports = Compiler;
