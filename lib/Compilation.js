var _ = require('lodash');
var async = require('async');
var fs = require('fs');
var glob = require('glob');
var iconv = require('iconv-lite');
var mkdirp = require('mkdirp');
var path = require('path');
var Tapable = require('tapable');

var TaskContext = require('./TaskContext');

function Compilation() {
  Tapable.call(this);
  _.bindAll(this);

  // 创建的文件
  this.emitFiles = [];
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
      return file.replace(/\\/g, '/');
    }));
  });
};

// 创建模块
Compilation.prototype.createModules = function(files, callback) {
  var factory = this.factory;

  async.map(files, factory.create, callback);
};

Compilation.prototype.buildModules = function(modules, callback) {
  this.modules = modules;

  this.applyPluginsAsync('build-modules', this.modules, function(err) {
    if (err) {
      return callback(err);
    }

    async.each(
      this.modules,
      this.buildModule,
      callback);
  }.bind(this));
};

Compilation.prototype.buildModule = function(module, callback) {
  this.applyPluginsAsync('build-module', module, function(err) {
    if (err) {
      return callback(err);
    }

    var taskContext = new TaskContext(this, module);
    this.applyPlugins('create-taskContext', taskContext);

    module.doBuild(taskContext).then(function() {
      callback(null, module);
    }, callback);
  }.bind(this));
};

Compilation.prototype.resolveFile = function(context, request, options, callback) {
  this.resolver.resolve(context, request, options, callback);
};

Compilation.prototype.resolveModule = function(context, request, options, callback) {
  this.resolver.resolve(context, request, options, function(err, file) {
    if (err) {
      return callback(err);
    }

    var src = path.relative(this.context, file).replace(/\\/g, '/');

    var module = _.find(this.modules, {src: src});

    if (module) {
      this.buildModule(module, callback);
    } else {
      async.waterfall([
        this.factory.create.bind(this.factory, src),
        this.buildModule
      ], callback);
    }
  }.bind(this));
};

Compilation.prototype.emitFile = function(file, contents, charset, callback) {
  file = file.replace(/\\/g, '/');

  if (this.emitFiles.indexOf(file) !== -1) {
    return callback(new Error('重复创建文件：' + file));
  }

  if (!/utf[\-]?8/i.test(charset)) {
    contents = iconv.encode(contents.toString(), charset);
  }

  var abspath = path.resolve(this.output, file);

  async.series([
    _.partial(mkdirp, path.dirname(abspath)),
    fs.writeFile.bind(fs, abspath, contents)
  ], function(err) {
    if (err) {
      return callback(err);
    }

    this.emitFiles.push(file);
    callback();
  }.bind(this));
};

Compilation.prototype.emitModule = function(file, contents, callback) {
  file = file.replace(/\\/g, '/');

  var module = _.find(this.modules, {src: file});

  if (module) {
    this.buildModule(module, callback);
  } else {
    async.waterfall([
      this.factory.create.bind(this.factory, file, contents),
      function(module, callback) {
        this.modules.push(module);
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
