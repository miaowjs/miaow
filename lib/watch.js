var _ = require('lodash');
var async = require('async');
var chalk = require('chalk');
var chokidar = require('chokidar');
var freeport = require('freeport');
var fs = require('fs-extra');
var mutil = require('miaow-util');
var path = require('path');

var compile = require('./compile');
var config = require('./config');
var LiveReload = require('./livereload');
var Module = require('./module');

function watch(options) {
  options = config(options);

  compile(options, function (err, cache) {
    if (err) {
      mutil.log(chalk.red.bold('编译失败, 不能启动文件监听模式'));

      err.showStack = false;
      console.error(err.toString());

      process.exit(1);
      return;
    }

    // 自动刷新
    var liveload = new LiveReload(options.liveReloadPort);

    // 编译队列
    var compileQueue = async.queue(function (srcPath, cb) {
      var modifyTime = new Date().getTime();
      mutil.log('开始编译 ' + chalk.green.underline.bold(srcPath));
      var module = new Module(srcPath, options, cache);
      module.compile(function (err) {
        if (err) {
          err.showStack = false;
          console.error(err.toString());
          return cb();
        }

        liveload.change(srcPath, modifyTime);
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

      _.each(fileList, function (srcPath) {
        var module = cache.get(srcPath);

        if (module) {
          module.remove();
        }
      });

      mutil.log('修改文件 ' + chalk.underline.bold(srcPath));
      compileQueue.push(fileList);
    }

    function compileAddedFile(filePath) {
      var srcPath = path.relative(options.cwd, filePath);

      mutil.log('新增文件 ' + chalk.underline.bold(srcPath));
      compileQueue.push(srcPath);
    }

    function compileDeletedFile(filePath) {
      var srcPath = path.relative(options.cwd, filePath);

      var module = cache.get(srcPath);

      if (module) {
        module.remove();
      }

      mutil.log('删除文件 ' + chalk.red.underline.bold(srcPath));
    }

    var watcher = chokidar.watch('**/*', {cwd: options.cwd, ignored: options.exclude || []})
      .on('ready', function () {
        mutil.log('开始监听');

        watcher.on('add', compileAddedFile);
        watcher.on('change', compileChangedFile);
        watcher.on('unlink', compileDeletedFile);
      });
  });
}

module.exports = function (options) {
  freeport(function (err, port) {
    if (err) {
      mutil.log(chalk.red.bold('获取端口失败, 不能启动自动刷新功能'));
    } else {
      options.liveReloadPort = port;
    }

    watch(options);
  });
};
