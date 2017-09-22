var isUrl = require('is-url-superb');
var pathIsAbsolute = require('path-is-absolute');

// 获取 entry 的名字，主要剔除头部的 ./ 和尾部的 .js
function getChunkName(entry) {
  return entry.replace(/^\.\//, '').replace(/\.js$/, '');
}

/**
 * 判断资源请求是否需要补全波浪号
 *
 * @param {string} request
 * @returns {Boolean}
 */
function isNeedPrefixTilde(request) {
  return request && !/^\.\.?\//.test(request) && !/^~/.test(request) && !/^data:/.test(request) && !isUrl(request) && !pathIsAbsolute(request);
}

/**
 * 补全波浪号
 *
 * assert.equal(prefixTilde('core'), '~core')
 * assert.equal(prefixTilde('./core'), './core')
 * assert.equal(prefixTilde('/core'), '/core')
 * assert.equal(prefixTilde('~core'), '~core')
 *
 * @param {string} request
 * @returns {string}
 */
function prefixTilde(request) {
  return isNeedPrefixTilde(request) ? `~${request}` : request;
}

module.exports = {
  getChunkName,
  prefixTilde,
  isNeedPrefixTilde
};