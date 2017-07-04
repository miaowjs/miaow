#!/usr/bin/env node

const path = require('path');
const yargs = require('yargs');
const pickby = require('lodash.pickby');

const convertOptions = require('./convertOptions');

let options = yargs
  .options({
    w: {
      alias: 'watch',
      describe: '监听文件变化实时编译',
      type: 'boolean',
    },

    c: {
      alias: 'configPath',
      describe: '配置文件路径',
      type: 'string',
    },

    p: {
      alias: 'production',
      describe: '是否是生产环境',
      type: 'boolean',
    },

    publicPath: {
      describe: '输出解析文件的目录',
      type: 'string',
    },
  })
  .help('help')
  .argv;

// 获取上下文
if (options._[0]) {
  options.context = path.resolve(process.cwd(), options._[0]);
}

// 获取输出目录
if (options._[1]) {
  options.output = path.resolve(process.cwd(), options._[1]);
}

const optionKeys = ['context', 'output', 'watch', 'configPath', 'production', 'publicPath'];
options = pickby(options, (value, key) => value !== undefined && optionKeys.indexOf(key) !== -1);

// 开始编译
require('..')(convertOptions(options))
  .catch((err) => {
    // 出错后，需要打印错误，并将退出码改成 1
    console.error(err.stack || err);

    process.on('exit', () => process.exit(1));
  });
