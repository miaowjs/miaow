var _ = require('lodash');
var async = require('async');
var path = require('path');
var realPath = require('real-path');
var resolve = require('resolve');

function Resolver(options) {
  this.options = options;
}

Resolver.prototype.resolve = function(context, request, options, callback) {
  options = _.assign({basedir: context}, this.options, options || {});

  var requests = [request];

  _.each(requests, function(request) {
    var extension = path.extname(request);
    var alias = options.extensionAlias[extension];

    if (extension && alias) {
      alias = _.isArray(alias) ? alias : [alias];

      _.each(_.uniq(alias), function(item) {
        requests.push(request.replace(new RegExp(extension + '$'), item));
      });
    }
  });

  var result;
  async.detect(
    requests,
    function(request, callback) {
      resolve(request, options, function(err, res) {
        result = res;

        callback(!!res);
      });
    },

    complete);

  function complete() {
    if (!result || realPath(result) !== result) {
      return callback(new Error(request + '未被查找到!'));
    }

    callback(null, result);
  }

  setTimeout(function() {
    complete();
    complete = _.noop;
  }, 30e3);
};

module.exports = Resolver;
