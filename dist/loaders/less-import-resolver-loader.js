var loaderUtils = require('loader-utils');

module.exports = function ftlLoader(content) {
  var _loaderUtils$getOptio = loaderUtils.getOptions(this),
      debug = _loaderUtils$getOptio.debug;

  if (this.resourceQuery === '?debug') {
    return debug ? content : '';
  }

  return content;
};