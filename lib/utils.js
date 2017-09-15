const createHash = require('crypto').createHash;
const isUrl = require('is-url-superb');
const pathIsAbsolute = require('path-is-absolute');
const replaceall = require('replaceall');

function getHash(content, length) {
  const hash = createHash('sha256');
  hash.update(content);

  return hash.digest('hex').slice(0, length || Number.POSITIVE_INFINITY);
}

/**
 * 将字符串的首字母变成大写
 *
 * assert.equal(firstLetterToUpperCase('foo'), 'Foo');
 *
 * @param {String} str
 * @returns {String}
 */
function firstLetterToUpperCase(str) {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
}

/**
 * 利用对象替换内容
 *
 * assert.equal(replaceContent('name is anhulife', { name: 'anhulife' }), 'anhulife is anhulife');
 *
 * @param {String} content 需要替换的字符串
 * @param {Object} [definitions={}] 待替换的对象
 * @returns {String} 替换后的字符串
 */
function replaceContent(content, definitions = {}) {
  let newContent = content;

  Object.keys(definitions).forEach((key) => {
    newContent = replaceall(key, definitions[key], newContent);
  });

  return newContent;
}

/**
 * 获取 entry 的名字，主要剔除头部的 ./ 和尾部的 .js
 *
 * @param {String} entry
 * @returns {String}
 */
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
  return request &&
    !/^\.\.?\//.test(request) &&
    !/^~/.test(request) &&
    !/^data:/.test(request) &&
    !isUrl(request) &&
    !pathIsAbsolute(request);
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
  firstLetterToUpperCase,
  getChunkName,
  getHash,
  isNeedPrefixTilde,
  prefixTilde,
  replaceContent,
};
