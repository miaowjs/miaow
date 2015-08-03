var _ = require('lodash');
var async = require('async');
var chalk = require('chalk');
var chokidar = require('chokidar');
var freeport = require('freeport');
var mutil = require('miaow-util');

var compile = require('./compile');
var LiveReload = require('./livereload');
var Module = require('./module');

// 获取依赖这个文件的文件列表
function getDependedList(cache, srcPath) {
  var module = cache.get(srcPath);
  var dependedList = module.dependedList;
  var func = _.partial(getDependedList, cache);

  return Array.prototype.concat.apply(
    dependedList,
    dependedList.map(func)
  );
}

function watch(options) {

  compile(options, function (err, cache, options) {
    if (err) {
      mutil.log(chalk.red.bold('编译失败, 不能启动文件监听模式'));

      err.showStack = false;
      console.error(err.toString());

      process.exit(1);
      return;
    }

    // 开启话唠模式
    options.verbase = true;

    // 自动刷新
    var livereload = new LiveReload(options.liveReloadPort);

    // 编译队列
    var compileQueue = async.queue(function (srcPath, cb) {
      // 记录修改时间
      var modifyTime = new Date().getTime();

      // 获取模块对象
      var module = Module.get(srcPath, options, cache);
      module.compile().then(function () {
        livereload.change(srcPath, modifyTime);

        cb();
      }, function (err) {
        err.showStack = false;
        console.error(err.toString());
        return cb();
      });
    });

    // 编译修改的文件
    function compileChangedFile(filePath) {
      var srcPath = mutil.relative(options.cwd, filePath);

      mutil.log('修改文件 ' + chalk.underline.bold(srcPath));

      var dependedList = getDependedList(cache, srcPath);

      _.each(dependedList, function (srcPath) {
        var module = cache.get(srcPath);

        if (module) {
          module.destroy();
        }
      });

      cache.get(srcPath).destroy();

      compileQueue.push(dependedList);
      compileQueue.push(srcPath);
    }

    function compileAddedFile(filePath) {
      var srcPath = mutil.relative(options.cwd, filePath);

      mutil.log('新增文件 ' + chalk.underline.bold(srcPath));
      compileQueue.push(srcPath);
    }

    function compileDeletedFile(filePath) {
      var srcPath = mutil.relative(options.cwd, filePath);

      var module = cache.get(srcPath);

      if (module) {
        module.destroy();
      }

      mutil.log('删除文件 ' + chalk.red.underline.bold(srcPath));
    }

    var watcher = chokidar.watch(options.cwd, {cwd: options.cwd, ignored: options.watchExclude || []})
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
