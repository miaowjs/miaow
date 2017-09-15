var url = require('url');
var loaderUtils = require('loader-utils');
var compile = require('es6-templates').compile;

var _require = require('../../utils'),
    prefixTilde = _require.prefixTilde;

var attrParse = require('./attributesParser');

function randomIdent() {
  return `xxxFTLLINKxxx${ Math.random() }${ Math.random() }xxx`;
}

function uniqueInfoInContainer(container, info) {
  var ident = void 0;

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
  var matchedInfo = request.match(/^(.+!)?([^!]+)$/) || [];

  var path = matchedInfo[2] || request;
  var loader = matchedInfo[1];

  // 如果请求中没有 loader 信息，就从 rules 中查找
  if (!loader) {
    loader = (rules.find(function (rule) {
      return rule.test.test(path);
    }) || {}).loader;
  }

  return {
    path,
    loader: loader || ''
  };
}

module.exports = function ftlLoader(content) {
  var context = this;

  if (context.cacheable) {
    context.cacheable();
  }

  var _ref = loaderUtils.getOptions(context) || {},
      root = _ref.root,
      attrs = _ref.attrs,
      interpolate = _ref.interpolate,
      exportAsDefault = _ref.exportAsDefault,
      exportAsEs6Default = _ref.exportAsEs6Default,
      _ref$rules = _ref.rules,
      rules = _ref$rules === undefined ? [] : _ref$rules;

  var attributes = ['img:src', 'include', 'import'];
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

  var links = attrParse(content, function (tag, attr) {
    var attrKey = attr ? `${ tag }:${ attr }` : tag;
    return attributes.indexOf(attrKey) !== -1;
  });

  links.reverse();

  var data = {};

  content = [content];

  links.forEach(function (link) {
    if (!loaderUtils.isUrlRequest(link.value, root)) return;

    var uri = url.parse(link.value);
    if (uri.hash !== null && uri.hash !== undefined) {
      uri.hash = null;
      link.value = uri.format();
      link.length = link.value.length;
    }

    // 补全波浪号
    link.value = prefixTilde(link.value);

    var ident = uniqueInfoInContainer(data, link.value);

    var x = content.pop();
    content.push(x.substr(link.start + link.length));
    content.push(ident);
    content.push(x.substr(0, link.start));
  });

  content.reverse();
  content = content.join('');

  if (interpolate === 'require') {
    var reg = /\$\{require\([^)]*\)\}/g;

    var reqList = [];

    var result = reg.exec(content);
    while (result) {
      reqList.push({
        length: result[0].length,
        start: result.index,
        value: result[0]
      });

      result = reg.exec(content);
    }

    reqList.reverse();
    content = [content];

    reqList.forEach(function (link) {
      var x = content.pop();

      var ident = uniqueInfoInContainer(data, link.value.substring(11, link.length - 3));

      content.push(x.substr(link.start + link.length));
      content.push(ident);
      content.push(x.substr(0, link.start));
    });

    content.reverse();
    content = content.join('');
  }

  if (interpolate && interpolate !== 'require') {
    content = compile(`\`${ content }\``).code;
  } else {
    content = JSON.stringify(content);
  }

  var exportsString = 'module.exports = ';
  if (exportAsDefault) {
    exportsString = 'exports.default = ';
  } else if (exportAsEs6Default) {
    exportsString = 'export default ';
  }

  content = content.replace(/xxxFTLLINKxxx[0-9.]+xxx/g, function (match) {
    var pathInfo = data[match];

    if (!pathInfo) {
      return match;
    }

    var _getLoader = getLoader(pathInfo, rules),
        path = _getLoader.path,
        loader = _getLoader.loader;

    var pathWithLoader = JSON.stringify(`${ loader }${ loaderUtils.urlToRequest(path, root) }`);

    return `" + require(${ pathWithLoader }) + "`;
  });

  return `${ exportsString }${ content };`;
};