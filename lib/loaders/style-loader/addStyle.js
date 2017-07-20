/* eslint-disable */
module.exports = function addStyle(cssModule) {
  var style = document.createElement('style');
  var cssText = cssModule.toString();

  document.getElementsByTagName('head')[0].appendChild(style);
  style.type = 'text/css';

  if (style.styleSheet) {
    style.styleSheet.cssText = cssText;
  } else {
    style.appendChild(document.createTextNode(cssText));
  }
};
