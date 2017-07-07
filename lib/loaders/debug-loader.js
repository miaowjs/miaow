const loaderUtils = require('loader-utils');

module.exports = function ftlLoader(content) {
  const { debug } = loaderUtils.getOptions(this);

  if (this.resourceQuery === '?debug') {
    return debug ? content : '';
  }

  return content;
};
