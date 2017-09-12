var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('../../utils'),
    isNeedPrefixTilde = _require.isNeedPrefixTilde,
    prefixTilde = _require.prefixTilde;

var Visitor = function () {
  function Visitor(less) {
    _classCallCheck(this, Visitor);

    this.__visitor__ = new less.visitors.Visitor(this);
    this.isReplacing = true;
    this.isPreEvalVisitor = true;
  }

  _createClass(Visitor, [{
    key: 'run',
    value: function run(root) {
      return this.__visitor__.visit(root);
    }
  }, {
    key: 'visitRule',
    value: function visitRule(ruleNode) {
      this.__inRule__ = true;
      return ruleNode;
    }
  }, {
    key: 'visitRuleOut',
    value: function visitRuleOut() {
      this.__inRule__ = false;
    }
  }, {
    key: 'visitUrl',
    value: function visitUrl(URLNode) {
      var value = URLNode.value.value;

      if (!this.__inRule__) {
        return URLNode;
      }

      if (isNeedPrefixTilde(value)) {
        URLNode.isEvald = true;
        URLNode.value.value = prefixTilde(value);
      }

      return URLNode;
    }
  }]);

  return Visitor;
}();

module.exports = {
  install(less, pluginManager) {
    pluginManager.addVisitor(new Visitor(less));
  }
};