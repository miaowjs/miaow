var _this = this;

var loaderUtils = require('loader-utils');
var path = require('path');

module.exports = function () {};
module.exports.pitch = function (remainingRequest) {
  if (_this.cacheable) {
    _this.cacheable();
  }

  var stringifyRemainingRequest = loaderUtils.stringifyRequest(_this, `!!${ remainingRequest }`);
  var addStyleRequest = loaderUtils.stringifyRequest(_this, `!${ path.join(__dirname, 'addStyle.js') }`);

  return `
    var cssModule = require(${ stringifyRemainingRequest });
    require(${ addStyleRequest })(cssModule);
    if(cssModule.locals) module.exports = cssModule.locals;
  `;
};