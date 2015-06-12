var _ = require('lodash');
var path = require('path');
var resolve = require('resolve');

module.exports = function (id, basedir, options) {
  var idList = [id];

  // 添加扩展名的fallback
  var extensions = options.extensions;
  if (path.extname(id).length === 0) {
    _.each(extensions, function (extension) {
      idList.push(id + extension);
    });
  }

  // 添加别名的fallback
  var extensionAlias = options.extensionAlias;
  _.each(idList, function (id) {
    var extension = path.extname(id);
    var alias = extensionAlias[extension];

    if (extension && alias) {
      alias = _.isArray(alias) ? alias : [alias];

      _.each(_.uniq(alias), function (item) {
        idList.push(path.basename(id, extension) + item);
      });
    }
  });

  var res;
  _.each(idList, function (id) {
    try {
      res = resolve.sync(id, {
        basedir: basedir,
        extensions: [],
        moduleDirectory: options.moduleDirectory
      });
      return false;
    } catch (err) {
    }
  });

  if (res) {
    return res;
  } else {
    throw new Error(id + '未被查找到!');
  }
};
