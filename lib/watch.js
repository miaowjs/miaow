var _ = require('lodash');
var async = require('async');
var chalk = require('chalk');
var chokidar = require('chokidar');
var fs = require('fs-extra');
var mutil = require('miaow-util');
var path = require('path');

var compile = require('./compile');
var config = require('./config');

function watch(options) {
  options = config(options);

  compile(options, function (err, cache) {
    if (err) {
      console.error(err.toString());
    }

    // 编译队列
    var compileQueue = async.queue(function (srcPath, cb) {
      mutil.log('开始编译 ' + chalk.green.underline.bold(srcPath));
      cache.get(srcPath, function (err) {
        if (err) {
          console.error(err.toString());
          return cb();
        }

        mutil.log('成功编译 ' + chalk.green.underline.bold(srcPath));
        cb();
      });
    }, 1);

    // 获取依赖这个文件的文件列表
    function getDependedList(srcPath) {
      var modules = cache.modules;
      var dependedList = [];
      var searchList = [srcPath];

      function isDepend(module, item) {
        return _.includes(module.dependencies, item);
      }

      while (searchList.length) {
        var _searchList = searchList;
        searchList = [];

        _.each(modules, function (module, srcPath) {
          if (_.any(_searchList, isDepend.bind(this, module))) {
            dependedList.push(srcPath);
            searchList.push(srcPath);
          }
        });
      }

      dependedList.push(srcPath);

      return dependedList;
    }

    // 编译修改的文件
    function compileChangedFile(filePath) {
      var srcPath = path.relative(options.cwd, filePath);
      var fileList = getDependedList(srcPath);
      var modules = cache.modules;

      _.each(fileList, function (srcPath) {
        var module = modules[srcPath];

        if (module) {
          try {
            fs.removeSync(module.destAbsPath);
            fs.removeSync(module.destAbsPathWithHash);
          } catch (e) {
          }

          delete modules[srcPath];
        }
      });

      compileQueue.push(fileList);
    }

    var watcher = chokidar.watch('**/*', {cwd: options.cwd, ignored: options.exclude || []})
      .on('ready', function () {
        mutil.log('开始监听');

        watcher.on('all', function (event, filePath) {
          compileChangedFile(filePath);
        });
      });
  });
}

module.exports = watch;
