var _ = require('lodash');
var async = require('async');
var MiaowError = require('./MiaowError');
var Promise = require('promise');

function Module() {
}

Module.prototype.doBuild = function(taskContext) {
  if (this.__buildPromise__) {
    return this.__buildPromise__;
  }

  var module = this;

  function runTask(task, callback) {
    function complete(err) {
      if (err) {
        if (!(err instanceof MiaowError)) {
          err = new MiaowError(taskContext.src, err);
        }

        return callback(err);
      }

      callback();
    }

    try {
      task.task.call(taskContext, task.options, complete);
    } catch (err) {
      complete(err);
    }
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
        _.pick(
          taskContext,
          ['url', 'contents', 'dest', 'destHash', 'fileDependencies', 'emitModules', 'cacheable', 'extra']
        )
      );
    });

  return this.__buildPromise__;
};

module.exports = Module;
