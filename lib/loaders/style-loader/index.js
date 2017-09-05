const loaderUtils = require('loader-utils');
const path = require('path');

module.exports = () => {};
module.exports.pitch = (remainingRequest) => {
  if (this.cacheable) {
    this.cacheable();
  }

  const stringifyRemainingRequest = loaderUtils.stringifyRequest(this, `!!${remainingRequest}`);
  const addStyleRequest = loaderUtils.stringifyRequest(this, `!${path.join(__dirname, 'addStyle.js')}`);

  return `
    var cssModule = require(${stringifyRemainingRequest});
    require(${addStyleRequest})(cssModule);
    if(cssModule.locals) module.exports = cssModule.locals;
  `;
};
