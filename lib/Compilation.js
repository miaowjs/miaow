var _ = require('lodash');
var async = require('async');
var fs = require('graceful-fs');
var glob = require('glob');
var iconv = require('iconv-lite');
var mkdirp = require('mkdirp');
var mutil = require('miaow-util');
var path = require('path');
var Tapable = require('tapable');

var TaskContext = require('./TaskContext');

function Compilation() {
  Tapable.call(this);
  _.bindAll(this);

  this.modules = {};

  // 创建的模块
  this.emitModules = {};
}

Compilation.prototype = Object.create(Tapable.prototype);
Compilation.prototype.constructor = Compilation;

Compilation.prototype.getFiles = function(callback) {
  glob('**/*', {
    cwd: this.context,
    ignore: this.exclude.concat(['**/miaow.config.js']),
    nodir: true
  }, function(err, files) {
    callback(err, (files || []).map(function(file) {
      return mutil.relative('', file);
    }));
  });
};

// 创建模块
Compilation.prototype.createModules = function(files, callback) {
  async.map(files, this.createModule, callback);
};

Compilation.prototype.createModule = function(file, contents, callback) {
  if (_.isFunction(contents)) {
    callback = contents;
    contents = null;
  }

  this.factory.create(file, contents, function(err, module) {
    if (!err) {
      this.modules[module.src] = module;
    }

    callback(err, module);
  }.bind(this));
};

Compilation.prototype.buildModules = function(modules, callback) {
  this.applyPluginsAsyncSeries('build-modules', this.modules, function(err) {
    if (err) {
      return callback(err);
    }

    async.eachSeries(
      this.modules,
      this.buildModule,
      callback);
  }.bind(this));
};

Compilation.prototype.buildModule = function(module, callback) {
  var taskContext = new TaskContext(this, module);

  this.applyPluginsAsyncSeries('build-module', module, taskContext, function(err) {
    if (err) {
      return callback(err);
    }

    module.doBuild(taskContext).then(function() {
      callback(null, module);
    }, callback);
  });
};

Compilation.prototype.resolveFile = function(context, request, options, callback) {
  if (_.isFunction(options)) {
    callback = options;
    options = {};
  }

  this.resolver.resolve(context, request, options, callback);
};

Compilation.prototype.resolveModule = function(context, request, options, callback) {
  if (_.isFunction(options)) {
    callback = options;
    options = {};
  }

  // module://src 格式的路径解析
  var moduleSchemaRegexp = /^module:\/\//;
  if (moduleSchemaRegexp.test(request)) {
    var module = this.modules[request.replace(moduleSchemaRegexp, '')];
    return callback(module ? null : new Error(request + '未被查找到!'), module);
  }

  this.resolver.resolve(context, request, options, function(err, file) {
    if (err) {
      return callback(err);
    }

    var src = mutil.relative(this.context, file);

    var module = this.modules[src];

    if (module) {
      this.buildModule(module, callback);
    } else {
      async.waterfall([
        this.createModule.bind(this, src),
        this.buildModule
      ], callback);
    }
  }.bind(this));
};

Compilation.prototype.emitFile = function(dest, contents, charset, callback) {
  if (!/utf[\-]?8/i.test(charset)) {
    contents = iconv.encode(contents.toString(), charset);
  }

  var abspath = path.resolve(this.output, dest);

  async.series([
    _.partial(mkdirp, path.dirname(abspath)),
    fs.writeFile.bind(fs, abspath, contents)
  ], callback);
};

Compilation.prototype.emitModule = function(src, contents, callback) {
  src = mutil.relative('', src);

  var module = this.modules[src];

  if (module) {
    this.buildModule(module, callback);
  } else {
    async.waterfall([
      this.createModule.bind(this, src, contents),
      function(module, callback) {
        this.emitModules[src] = module;
        callback(null, module);
      }.bind(this),
      this.buildModule
    ], callback);
  }
};

// 编译
Compilation.prototype.seal = function(callback) {
  async.waterfall([
    this.getFiles,
    this.createModules,
    this.buildModules
  ], callback);
};

module.exports = Compilation;
