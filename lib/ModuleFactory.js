var _ = require('lodash');
var fs = require('fs');
var minimatch = require('minimatch');
var mutil = require('miaow-util');
var path = require('path');

var Module = require('./Module');
var destTask = require('./tasks/dest');

function ModuleFactory(options) {
  _.bindAll(this);
  this.options = options;
}

ModuleFactory.prototype.create = function(src, contents, callback) {
  if (_.isFunction(contents)) {
    callback = contents;
    contents = null;
  }

  var module = new Module();
  module.src = src;
  module.srcDir = path.dirname(src);

  // 设置模块的参数
  var options = _.find(this.options, function(item) {
    return minimatch(src, item.test, {matchBase: true});
  });

  // 追加输出任务
  module.tasks = options.tasks.concat({
    task: destTask,
    options: {}
  });

  // 设置模块的任务序列信息
  // TODO 将任务的参数输出到任务序列信息中
  module.tasksSerialization = module.tasks.map(function(task) {
    return task.task.toString();
  }).join('|');

  // 扩展信息
  _.assign(module, _.pick(options, ['context', 'output', 'domain', 'hashLength', 'hashConnector', 'ext', 'charset']));

  // 设置模块的输出目录
  module.destDir = (options.release || '$0').replace('$0', module.srcDir);

  // 设置URL
  module.url = (options.url || '$0').replace('$0', module.srcDir);

  function setContents(err, contents) {
    if (err) {
      return callback(err);
    }

    // 设置模块内容及Hash值
    module.contents = contents;
    module.srcHash = mutil.hash(contents);

    callback(null, module);
  }

  if (contents) {
    setContents(null, contents);
  } else {
    fs.readFile(path.resolve(options.context, src), setContents);
  }
};

module.exports = ModuleFactory;
