#!/usr/bin/env node

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
var options = require('./convert-argv')(argv);
var console = new (require('../lib/Console'))(argv.silent);

var compiler = require('..')(options);

function complete(err) {
  if (err) {
    console.error(err);

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
