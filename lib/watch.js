var _ = require('lodash');
var async = require('async');
var chalk = require('chalk');
var chokidar = require('chokidar');
var freeport = require('freeport');
var mutil = require('miaow-util');
var minimatch = require('minimatch');

var compile = require('./compile');
var LiveReload = require('./livereload');
var Module = require('./module');

// 获取依赖这个文件的文件列表
function getDependedList(cache, srcPath) {
  var module = cache.get(srcPath);
  if (!module) {
    return [];
  }

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

      var srcPathList = _.uniq(getDependedList(cache, srcPath).concat(srcPath).reverse());

      // 从缓存中删除模块
      var modules = [];

      srcPathList.forEach(function (srcPath) {
        var module = cache.get(srcPath);

        if (module) {
          cache.remove(srcPath);
          modules.push(module);
        }
      });


      // 取消依赖关系
      modules.forEach(function (module) {
        module.dependList.forEach(function (dependSrcPath) {
          var dependModule = cache.get(dependSrcPath);
          if (dependModule) {
            dependModule.dependedList = _.remove(dependModule.dependedList, module.srcPath);
          }
        });

        module.dependedList.forEach(function (dependedSrcPath) {
          var dependedModule = cache.get(dependedSrcPath);
          if (dependedModule) {
            dependedModule.dependedList = _.remove(dependedModule.dependList, module.srcPath);
          }
        });
      });

      async.eachSeries(srcPathList, function (srcPath, cb) {
        // 记录修改时间
        var modifyTime = new Date().getTime();

        // 获取模块对象
        var module = Module.get(srcPath, options, cache);
        module.compile().then(function () {
          livereload.change(srcPath, modifyTime);

          cb();
        }, cb);
      }, function (err) {
        if (err) {
          // 如果编译失败, 就把之前的依赖管理加回来
          modules.forEach(function (module) {
            module.dependList.forEach(function (dependSrcPath) {
              var dependModule = cache.get(dependSrcPath);
              if (dependModule) {
                dependModule.dependedList.push(module.srcPath);
              }
            });

            module.dependedList.forEach(function (dependedSrcPath) {
              var dependedModule = cache.get(dependedSrcPath);
              if (dependedModule) {
                dependedModule.dependList.push(module.srcPath);
              }
            });
          });

          modules.forEach(cache.add.bind(cache));

          err.showStack = false;
          console.error(err.toString());
        }

        cb();
      });
    }, 1);

    // 处理修改的文件
    function handleChangedFile(srcPath) {
      srcPath = mutil.relative('', srcPath);

      mutil.log('文件修改 ' + chalk.underline.bold(srcPath));
      compileQueue.push(srcPath);
    }

    // 处理新增的文件
    function handleAddedFile(srcPath) {
      srcPath = mutil.relative('', srcPath);

      mutil.log('文件新增 ' + chalk.underline.bold(srcPath));
      compileQueue.push(srcPath);
    }

    // 处理删除的文件
    function handleDeletedFile(srcPath) {
      srcPath = mutil.relative('', srcPath);

      mutil.log('文件删除 ' + chalk.red.underline.bold(srcPath));
      cache.get(srcPath).destroy();
    }

    var exclude = options.exclude || [];
    var watcher = chokidar.watch(options.cwd, {
      cwd: options.cwd,
      ignored: [function (path) {
        return !!_.find(exclude, minimatch.bind(minimatch, path));
      }]
    });

    watcher.on('ready', function () {
      mutil.log('开始监听');

      watcher.on('add', handleAddedFile);
      watcher.on('change', handleChangedFile);
      watcher.on('unlink', handleDeletedFile);
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
