var Parser = require('fastparse');

function processMatch(match, strUntilValue, name, value, index) {
  if (!this.isRelevantTagAttr(this.currentTag, name)) return;
  this.results.push({
    start: index + strUntilValue.length,
    length: value.length,
    value
  });
}

function processFtlMatch(match, value, index) {
  if (!this.isRelevantTagAttr(this.currentTag)) return;
  this.results.push({
    start: index + 1,
    length: value.length,
    value
  });
}

var parser = new Parser({
  outside: {
    '<!--.*?-->': true,
    '<![CDATA[.*?]]>': true,
    '<[!\\?].*?>': true,
    '</[^>]+>': true,
    '<([a-zA-Z\\-:]+)\\s*': function aZAZS(match, tagName) {
      this.currentTag = tagName;
      return 'inside';
    },
    // ftl规则解析
    '<#([a-zA-Z\\-:]+)\\s*': function aZAZS(match, tagName) {
      this.currentTag = tagName;
      return 'ftlTag';
    }
  },
  inside: {
    '\\s+': true, // eat up whitespace
    '>': 'outside', // end of attributes
    '(([0-9a-zA-Z\\-:]+)\\s*=\\s*")([^"]*)"': processMatch,
    "(([0-9a-zA-Z\\-:]+)\\s*=\\s*')([^']*)'": processMatch,
    '(([0-9a-zA-Z\\-:]+)\\s*=\\s*)([^\\s>]+)': processMatch
  },
  ftlTag: {
    '>': 'outside', // end of attributes
    '"([^" ]+)"': processFtlMatch,
    "'([^' ]+)'": processFtlMatch
  }
});

module.exports = function parse(html, isRelevantTagAttr) {
  return parser.parse('outside', html, {
    currentTag: null,
    results: [],
    isRelevantTagAttr
  }).results;
};