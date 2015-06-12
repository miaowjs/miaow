// 来自 https://github.com/wearefractal/vinyl-fs/blob/master/lib/dest/writeContents/index.js
var fs = require('fs-extra');
var iconv = require('iconv-lite');
var path = require('path');

function dest(writePath, file, encoding, cb) {
  fs.ensureDirSync(path.dirname(writePath));

  var opt = {
    mode: file.stat.mode,
    flag: file.flag
  };

  var contents = file.contents;
  if (!/utf[\-]?8/i.test(encoding)) {
    contents = iconv.encode(contents.toString(), encoding);
  }

  fs.writeFile(writePath, contents, opt, written);

  function complete(err) {
    cb(err, file);
  }

  function written(err) {

    if (isErrorFatal(err)) {
      return complete(err);
    }

    if (!file.stat || typeof file.stat.mode !== 'number') {
      return complete();
    }

    fs.stat(writePath, function (err, st) {
      if (err) {
        return complete(err);
      }
      var currentMode = (st.mode & parseInt('0777', 8));
      var expectedMode = (file.stat.mode & parseInt('0777', 8));
      if (currentMode === expectedMode) {
        return complete();
      }
      fs.chmod(writePath, expectedMode, complete);
    });
  }

  function isErrorFatal(err) {
    if (!err) {
      return false;
    }

    // Handle scenario for file overwrite failures.
    else if (err.code === 'EEXIST' && file.flag === 'wx') {
      return false;   // "These aren't the droids you're looking for"
    }

    // Otherwise, this is a fatal error
    return true;
  }
}

module.exports = dest;
