// 来自 https://github.com/wearefractal/vinyl-fs/blob/master/lib/dest/writeContents/index.js
var fs = require('fs-extra');
var iconv = require('iconv-lite');
var path = require('path');

function dest(writePath, file, encoding, cb) {
  fs.ensureDirSync(path.dirname(writePath));

  var opt = {
    flag: file.flag
  };

  var contents = file.contents;
  if (!/utf[\-]?8/i.test(encoding)) {
    contents = iconv.encode(contents.toString(), encoding);
  }

  fs.writeFile(writePath, contents, opt, complete);

  function complete(err) {
    cb(err, file);
  }
}

module.exports = dest;
