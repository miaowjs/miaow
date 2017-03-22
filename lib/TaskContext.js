var _ = require('lodash');
var mutil = require('miaow-util');
var path = require('path');
var pathIsAbsolute = require('path-is-absolute');

function TaskContext(compilation, module) {
  var context = this;

  _.assign(context, _.pick(
    module,
    [
      'context', 'output', 'src', 'srcDir', 'srcHash', 'destDir', 'ext', 'charset',
      'hashLength', 'hashConnector', 'domain', 'contents', 'url', 'debug', 'environment'
    ]
  ));
  _.assign(context, _.pick(compilation, ['startTime', 'emitFile']));

  context.extra = {};
  context.hooks = [];
  context.dependencies = [];
  context.emitModules = [];
  context.emitFiles = [];

  context.__cacheable__ = true;
  this.__compilation__ = compilation;
}

TaskContext.prototype.emitModule = function(file, contents, callback) {
  this.__compilation__.emitModule(file, contents, function(err, module) {
    if (!err && this.emitModules.indexOf(module.src) === -1) {
      this.emitModules.push(module.src);
    }

    callback(err, module);
  }.bind(this));
};

TaskContext.prototype.resolveModule = function(request, options, callback) {
  if (_.isFunction(options)) {
    callback = options;
    options = {};
  }

  this.__compilation__.resolveModule(
    path.resolve(this.context, this.srcDir),
    request,
    options,
    function(err, module) {
      if (!err && !this.__compilation__.emitModules[module.src]) {
        this.addDependency(module.src);
      }

      callback(err, module);
    }.bind(this)
  );
};

TaskContext.prototype.addDependency = function(file) {
  file = mutil.relative(pathIsAbsolute(file) ? this.context : '', file);

  if (this.dependencies.indexOf(file) === -1) {
    this.dependencies.push(file);
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
