#!/usr/bin/env node

var _ = require('lodash');
var miaow = require('../index');
var path = require('path');
var argv = require('yargs')
  .options({
    'w': {
      alias: 'watch',
      describe: '监听文件变化实时编译',
      type: 'boolean'
    },

    'd': {
      alias: 'domain',
      describe: '启用域名',
      type: 'boolean'
    },

    'p': {
      alias: 'pack',
      describe: '启用打包功能',
      type: 'boolean'
    },

    'l': {
      alias: 'lint',
      describe: '启用校验功能',
      type: 'boolean'
    },

    'h': {
      alias: 'hash',
      default: 10,
      describe: 'hash版本号的长度，默认是10，如果不想加就设置为0',
      type: 'number'
    },

    'm': {
      alias: 'mini',
      describe: '启用压缩功能',
      type: 'boolean'
    }
  })
  .argv;

var options = _.pick(argv, ['lint', 'mini', 'hash']);

if (argv._.length) {
  options.cwd = path.resolve(process.cwd(), argv._[0]);

  if (argv._[1]) {
    options.output = path.resolve(process.cwd(), argv._[1]);
  }
}

if (!argv.domain) {
  options.domain = false;
}

if (!argv.pack) {
  options.pack = false;
}

if (argv.watch) {
  miaow.watch(options);
} else {
  miaow.compile(options, function (err) {
    if (err) {
      console.error(err.toString());
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}
