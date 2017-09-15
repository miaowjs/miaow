var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var csstree = require('css-tree');

var _require = require('../../utils'),
    isNeedPrefixTilde = _require.isNeedPrefixTilde;

var URLProcessor = function () {
  function URLProcessor() {
    _classCallCheck(this, URLProcessor);
  }

  _createClass(URLProcessor, [{
    key: 'process',
    value: function process(css) {
      var ast = csstree.parse(css);

      csstree.walk(ast, function (node) {
        if (node.type === 'Url' && isNeedPrefixTilde(node.value.value)) {
          node.value.value = `./${ node.value.value }`;
        }
      });

      return csstree.translate(ast);
    }
  }]);

  return URLProcessor;
}();

module.exports = {
  install(less, pluginManager) {
    pluginManager.addPostProcessor(new URLProcessor());
  }
};