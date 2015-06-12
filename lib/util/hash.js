var crypto = require('crypto');

module.exports = function (content) {
  var hash = crypto.createHash('md5');

  hash.update(content);
  return hash.digest('hex');
};
