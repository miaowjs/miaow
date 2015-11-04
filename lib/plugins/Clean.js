var _ = require('lodash');
var async = require('async');
var mutil = require('miaow-util');
var console = mutil.console;
var fs = require('fs');
var glob = require('glob');
var path = require('path');

function Clean() {
}

Clean.prototype.apply = function(compiler) {
  compiler.plugin('compile-success', this.clean.bind(this));
};

Clean.prototype.clean = function(compilation, callback) {
  console.log('清理输出目录');
  glob('**/*', {
    cwd: compilation.output,
    nodir: true,
    dot: true
  }, function(err, files) {
    var emitFiles = [];

    _.each(compilation.modules, function(module) {
      Array.prototype.push.apply(emitFiles, module.emitFiles || []);
    });

    files = (files || []).map(function(file) {
      return mutil.relative('', file);
    });

    // 筛选出不是这次编译产出的文件
    files = _.filter(files, function(file) {
      return file !== 'miaow.log.json' && emitFiles.indexOf(file) === -1;
    }).map(function(file) {
      return path.resolve(compilation.output, file);
    });

    // 删除文件
    async.each(files, fs.unlink.bind(fs), function(err) {
      if (err) {
        console.warn('清理输出目录失败');
        console.warn(err);
      }

      callback();
    });
  });
};

module.exports = Clean;
