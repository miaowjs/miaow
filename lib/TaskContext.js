var _ = require('lodash');
var path = require('path');

function TaskContext(compilation, module) {
  var context = this;

  _.assign(context, _.pick(
    module,
    [
      'context', 'output', 'src', 'srcDir', 'srcHash', 'destDir', 'ext', 'charset',
      'hashLength', 'hashConnector', 'domain', 'contents', 'url'
    ]
  ));
  _.assign(context, _.pick(compilation, ['startTime', 'emitFile']));

  var resolveContext = path.resolve(compilation.context, module.srcDir);
  context.resolveFile = compilation.resolveFile.bind(compilation, resolveContext);
  context.resolveModule = compilation.resolveModule.bind(compilation, resolveContext);
  context.emitModule = function(file, contents, callback) {
    compilation.emitModule(file, contents, function(err, module) {
      if (err) {
        return callback(err);
      }

      context.emitModules.push(module.src);
      callback(null, module);
    });
  };

  context.extra = {};
  context.hooks = [];
  context.fileDependencies = [];
  context.emitModules = [];

  context.__cacheable__ = true;
}

TaskContext.prototype.addFileDependency = function(file) {
  if (this.fileDependencies.indexOf(file) === -1) {
    this.fileDependencies.push(file);
  }
};

TaskContext.prototype.addHook = function(hook) {
  this.hooks.push(hook);
};

Object.defineProperty(TaskContext.prototype, 'cacheable', {
  set: function(value) {
    if (value === false) {
      this.__cacheable__ = value;
    }
  },

  get: function() {
    return this.__cacheable__;
  }
});

module.exports = TaskContext;
