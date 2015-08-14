var _ = require('lodash');
var async = require('async');
var chalk = require('chalk');
var chokidar = require('chokidar');
var freeport = require('freeport');
var fs = require('fs');
var mutil = require('miaow-util');
var minimatch = require('minimatch');
var path = require('path');

var compile = require('./compile');
var LiveReload = require('./livereload');
var Module = require('./module');

function watch(options, cb) {

  compile(options, function (err, config, cache) {
    if (err) {
      return cb(err);
    }

    // 开启话唠模式
    config.verbase = true;

    // 自动刷新
    var livereload = new LiveReload(config.liveReloadPort);
    cache.on('change', function (srcPath, token) {
      livereload.change(srcPath, token);
    });

    // 编译队列
    var compileQueue = async.queue(function (task, cb) {
      var file = task.file;
      var type = task.type;

      switch (type) {
        case 'add':
          Module
            .getInstance(file, config, cache)
            .compile()
            .then(_.partial(complete, null), complete);
          break;
        case 'change':
          cache
            .get(file)
            .handleChange(new Date().getTime())
            .then(_.partial(complete, null), complete);
          break;
        case 'remove':
          cache.get(file)
            .handleRemove();
          complete();
          break;
      }

      function complete(err) {
        if (err) {
          err.showStack = false;
          console.error(err.toString());
        }

        cb();
      }
    }, 1);

    // 处理修改的文件
    function handleChange(srcPath) {
      srcPath = mutil.relative('', srcPath);

      mutil.log('文件修改 ' + chalk.underline.bold(srcPath));
      compileQueue.push({
        file: srcPath,
        type: 'change'
      });
    }

    // 处理新增的文件
    function handleAdd(srcPath) {
      srcPath = mutil.relative('', srcPath);

      mutil.log('文件新增 ' + chalk.underline.bold(srcPath));
      compileQueue.push({
        file: srcPath,
        type: 'add'
      });
    }

    // 处理删除的文件
    function handleRemove(srcPath) {
      srcPath = mutil.relative('', srcPath);
      // 如果文件还存在就退出
      if (fs.existsSync(path.resolve(config.cwd, srcPath))) {
        return;
      }

      mutil.log('文件删除 ' + chalk.red.underline.bold(srcPath));
      compileQueue.push({
        file: srcPath,
        type: 'remove'
      });
    }

    var exclude = (config.exclude || []).concat(['**/.*', '**/.*/**/*']);
    var watcher = chokidar.watch(config.cwd, {
      cwd: config.cwd,
      ignored: [function (path) {
        return !!_.find(exclude, minimatch.bind(minimatch, path));
      }]
    });

    watcher.on('ready', function () {
      mutil.log('开始监听');

      watcher.on('add', handleAdd);
      watcher.on('change', handleChange);
      watcher.on('unlink', handleRemove);
    });
  });
}

module.exports = function (options, cb) {
  freeport(function (err, port) {
    if (err) {
      mutil.log(chalk.red.bold('获取端口失败, 不能启动自动刷新功能'));
    } else {
      options.liveReloadPort = port;
    }

    watch(options, cb);
  });
};
