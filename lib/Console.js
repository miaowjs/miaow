var _ = require('lodash');
var chalk = require('chalk');
var dateformat = require('dateformat');

function Console(silent) {
  if (silent) {
    this.warn = this.log = _.noop;
  }
}

function time() {
  return '[' + chalk.grey(dateformat(new Date(), 'HH:MM:ss')) + ']';
}

Console.prototype.log = function(message) {
  process.stdout.write(time() + ' ' + message + '\n');
};

Console.prototype.warn = function(message) {
  process.stdout.write(time() + ' ' + chalk.yellow(message) + '\n');
};

Console.prototype.error = function(error) {
  process.stderr.write(time() + ' ' + chalk.red(error.toString()) + '\n');
};

module.exports = Console;
