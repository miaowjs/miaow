/* eslint-disable */
module.exports = function addStyle(cssModule) {
  var headElement = document.head || document.getElementsByTagName('head')[0];

  // 获取 head 里面第一个 link(rel="stylesheet") 标签
  var firstLinkElement;
  var linkElements = headElement.getElementsByTagName('link');
  for (var i = 0, l = linkElements.length; i < l; ++i) {
    if (linkElements[i].rel === 'stylesheet') {firstLinkElement = linkElements[i]; break;}
  }

  // 插入 style 标签
  var styleElement = document.createElement('style');
  if (firstLinkElement) {
    headElement.insertBefore(styleElement, firstLinkElement)
  } else {
    headElement.appendChild(styleElement);
  }

  // 设置 style 标签属性
  styleElement.setAttribute('type', 'text/css');

  // 设置 style 内容
  var style = cssModule.toString();
  if (styleElement.styleSheet) {
    styleElement.styleSheet.cssText = style;
  } else {
    styleElement.appendChild(document.createTextNode(style));
  }
};
