#!/usr/bin/env node

var _ = require('lodash');
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

var miaow = require('../index');

var options = _.pick(argv, ['environment', 'configPath']);

if (argv._.length) {
  options.cwd = path.resolve(process.cwd(), argv._[0]);

  if (argv._[1]) {
    options.output = path.resolve(process.cwd(), argv._[1]);
  }
}

function complete (err) {
  process.exit(err ? 1 : 0);
}

if (argv.watch) {
  miaow.watch(options, complete);
} else {
  miaow.compile(options, complete);
}
