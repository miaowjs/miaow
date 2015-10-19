var _ = require('lodash');
var async = require('async');
var Promise = require('promise');

function Module() {
}

Module.prototype.doBuild = function(taskContext) {
  if (this.__buildPromise__) {
    return this.__buildPromise__;
  }

  var module = this;

  function runTask(task, callback) {
    task.task.call(taskContext, task.options, callback);
  }

  this.__buildPromise__ = new Promise(function(resolve, reject) {
    async.eachSeries(
      module.tasks,
      runTask,
      function(err) {
        err ? reject(err) : resolve();
      }
    );
  })
    .then(function() {
      _.assign(
        module,
        _.pick(taskContext, ['url', 'contents', 'dest', 'destHash', 'dependencies', 'fileDependencies', 'cacheable'])
      );
    });

  return this.__buildPromise__;
};

module.exports = Module;
