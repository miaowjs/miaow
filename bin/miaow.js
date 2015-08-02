#!/usr/bin/env node

var _ = require('lodash');
var chalk = require('chalk');
var miaow = require('../index');
var mutil = require('miaow-util');
var path = require('path');
var argv = require('yargs')
  .options({
    'w': {
      alias: 'watch',
      describe: '监听文件变化实时编译',
      type: 'boolean'
    },

    'e': {
      alias: 'environment',
      describe: '启用哪个环境配置',
      type: 'string'
    },

    'c': {
      alias: 'configPath',
      describe: '配置文件路径',
      type: 'string'
    }
  })
  .argv;

var options = _.pick(argv, ['environment', 'configPath']);

if (argv._.length) {
  options.cwd = path.resolve(process.cwd(), argv._[0]);

  if (argv._[1]) {
    options.output = path.resolve(process.cwd(), argv._[1]);
  }
}

if (argv.watch) {
  miaow.watch(options);
} else {
  miaow.compile(options, function (err, cache, options) {
    if (err) {
      mutil.log(chalk.red.bold('编译失败'));

      err.showStack = !!options.verbase;
      console.error(err.toString());
      process.exit(1);
      return;
    }

    cache.destroy();
    process.exit(0);
  });
}
