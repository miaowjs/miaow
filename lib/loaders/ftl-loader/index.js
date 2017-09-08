const url = require('url');
const loaderUtils = require('loader-utils');
const compile = require('es6-templates').compile;

const { prefixTilde } = require('../../utils');

const attrParse = require('./attributesParser');

function randomIdent() {
  return `xxxFTLLINKxxx${Math.random()}${Math.random()}xxx`;
}

function uniqueInfoInContainer(container, info) {
  let ident;

  do {
    ident = randomIdent();
  } while (container[ident]);

  container[ident] = info;

  return ident;
}

/**
 * 获取模块请求对应的 loader
 *
 * @param {any} request
 * @param {any} rules
 * @returns
 */
function getLoader(request, rules) {
  const matchedInfo = request.match(/^(.+!)?([^!]+)$/) || [];

  const path = matchedInfo[2] || request;
  let loader = matchedInfo[1];

  // 如果请求中没有 loader 信息，就从 rules 中查找
  if (!loader) {
    loader = (rules.find(rule => rule.test.test(path)) || {}).loader;
  }

  return {
    path,
    loader: loader || '',
  };
}

module.exports = function ftlLoader(content) {
  const context = this;

  if (context.cacheable) {
    context.cacheable();
  }

  const {
    root,
    attrs,
    interpolate,
    exportAsDefault,
    exportAsEs6Default,
    rules = [],
  } = loaderUtils.getOptions(context) || {};

  let attributes = ['img:src', 'include', 'import'];
  if (attrs !== undefined) {
    if (typeof attrs === 'string') {
      attributes = attrs.split(' ');
    } else if (Array.isArray(attrs)) {
      attributes = attrs;
    } else if (attrs === false) {
      attributes = [];
    } else {
      throw new Error('Invalid value to config parameter attrs');
    }
  }

  const links = attrParse(content, (tag, attr) => {
    const attrKey = attr ? `${tag}:${attr}` : tag;
    return attributes.indexOf(attrKey) !== -1;
  });

  links.reverse();

  const data = {};

  content = [content];

  links.forEach((link) => {
    if (!loaderUtils.isUrlRequest(link.value, root)) return;

    const uri = url.parse(link.value);
    if (uri.hash !== null && uri.hash !== undefined) {
      uri.hash = null;
      link.value = uri.format();
      link.length = link.value.length;
    }

    // 补全波浪号
    link.value = prefixTilde(link.value);

    const ident = uniqueInfoInContainer(data, link.value);

    const x = content.pop();
    content.push(x.substr(link.start + link.length));
    content.push(ident);
    content.push(x.substr(0, link.start));
  });

  content.reverse();
  content = content.join('');

  if (interpolate === 'require') {
    const reg = /\$\{require\([^)]*\)\}/g;

    const reqList = [];

    let result = reg.exec(content);
    while (result) {
      reqList.push({
        length: result[0].length,
        start: result.index,
        value: result[0],
      });

      result = reg.exec(content);
    }

    reqList.reverse();
    content = [content];

    reqList.forEach((link) => {
      const x = content.pop();

      const ident = uniqueInfoInContainer(data, link.value.substring(11, link.length - 3));

      content.push(x.substr(link.start + link.length));
      content.push(ident);
      content.push(x.substr(0, link.start));
    });

    content.reverse();
    content = content.join('');
  }

  if (interpolate && interpolate !== 'require') {
    content = compile(`\`${content}\``).code;
  } else {
    content = JSON.stringify(content);
  }

  let exportsString = 'module.exports = ';
  if (exportAsDefault) {
    exportsString = 'exports.default = ';
  } else if (exportAsEs6Default) {
    exportsString = 'export default ';
  }

  content = content.replace(/xxxFTLLINKxxx[0-9.]+xxx/g, (match) => {
    const pathInfo = data[match];

    if (!pathInfo) {
      return match;
    }

    const { path, loader } = getLoader(pathInfo, rules);

    const pathWithLoader = JSON.stringify(`${loader}${loaderUtils.urlToRequest(path, root)}`);

    return `" + require(${pathWithLoader}) + "`;
  });

  return `${exportsString}${content};`;
};
