var _ = require('lodash');
var path = require('path');

function TaskContext(compilation, module) {
  _.assign(this, _.pick(
    module,
    [
      'cwd', 'output', 'src', 'srcDir', 'srcHash', 'destDir', 'ext',
      'hashLength', 'hashConnector', 'domain', 'contents', 'url'
    ]
  ));
  _.assign(this, _.pick(compilation, ['console', 'emitModule', 'emitFile']));

  var resolveContext = path.resolve(compilation.context, module.srcDir);
  this.resolveFile = compilation.resolveFile.bind(compilation, resolveContext);
  this.resolveModule = compilation.resolveModule.bind(compilation, resolveContext);

  this.__cacheable__ = true;
}

TaskContext.prototype.addDependency = function(file) {
  if (this.dependencies.indexOf(file) === -1) {
    this.dependencies.push(file);
  }
};

TaskContext.prototype.addFileDependency = function(file) {
  if (this.fileDependencies.indexOf(file) === -1) {
    this.fileDependencies.push(file);
  }
};

Object.defineProperty(TaskContext.prototype, 'dependencies', {
  value: []
});

Object.defineProperty(TaskContext.prototype, 'fileDependencies', {
  value: []
});

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
