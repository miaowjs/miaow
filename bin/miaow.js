#!/usr/bin/env node

'use strict';

var commander = require('commander');
var miaow = require('../index');
var pkg = require('../package.json');
var _ = require('underscore');

commander
  .version(pkg.version)
  .usage('[command]');

commander
  .command('release')
  .description('compile and deploy')
  .option('-m, --md5', 'create md5 named file')
  .option('-o, --optimize', 'optimize static file')
  .option('-l, --lint', 'lint css and js')
  .option('-t, --test', 'run test')
  .option('-d, --deploy [targets]', 'deploy')
  .action(function (options) {
    miaow.release(_.pick(options, 'md5', 'optimize', 'lint', 'test', 'deploy'));
  });

commander.parse(process.argv);

if (!process.argv.slice(2).length) {
  commander.outputHelp();
}
