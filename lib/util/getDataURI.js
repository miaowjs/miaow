var fs = require('fs');
var mime = require('mime');

module.exports = function (filePath) {
  var ret = "data:";
  ret += mime.lookup(filePath);
  ret += ";base64,";
  ret += fs.readFileSync(filePath).toString("base64");
  return ret;
};
