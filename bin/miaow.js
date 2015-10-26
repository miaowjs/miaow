#!/usr/bin/env node

var _ = require('lodash');
var path = require('path');
var argv = require('yargs')
  .options({
    w: {
      alias: 'watch',
      describe: '监听文件变化实时编译',
      type: 'boolean'
    },

    e: {
      alias: 'environment',
      describe: '启用哪个环境配置',
      type: 'string'
    },

    c: {
      alias: 'configPath',
      describe: '配置文件路径',
      type: 'string'
    },

    s: {
      alias: 'silent',
      describe: '是否产出一些提示和警告信息',
      type: 'boolean'
    }
  })
  .help('help')
  .argv;

// 获取转换后的参数
var console = require('miaow-util').console;

var options = _.pick(argv, ['watch', 'environment', 'configPath', 'silent']);
if (argv._[0]) {
  options.context = path.resolve(process.cwd(), argv._[0]);
}

if (argv._[1]) {
  options.output = path.resolve(process.cwd(), argv._[1]);
}

var compiler = require('..')(options);

function complete(err) {
  if (err) {
    var text = ['错误信息：'];

    if (_.isString(err)) {
      err = {
        message: err
      };
    }

    if (err.file) {
      text.push('文件：' + err.file);
    }

    if (err.message) {
      text.push('消息：' + err.message);
    }

    if (err.details) {
      text.push('细节：' + err.details);
    }

    console.error(text.join('\n'));

    if (!options.watch) {
      process.on('exit', function() {
        process.exit(1);
      });
    }
  }
}

if (options.watch) {
  compiler.watch(complete);
} else {
  compiler.run(complete);
}
