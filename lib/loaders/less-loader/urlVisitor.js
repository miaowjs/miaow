const { isNeedPrefixTilde, prefixTilde } = require('../../utils');

class Visitor {
  constructor(less) {
    this.__visitor__ = new less.visitors.Visitor(this);
    this.isReplacing = true;
    this.isPreEvalVisitor = true;
  }

  run(root) {
    return this.__visitor__.visit(root);
  }

  visitRule(ruleNode) {
    this.__inRule__ = true;
    return ruleNode;
  }

  visitRuleOut() {
    this.__inRule__ = false;
  }

  visitUrl(URLNode) {
    const value = URLNode.value.value;

    if (!this.__inRule__) {
      return URLNode;
    }

    if (isNeedPrefixTilde(value)) {
      URLNode.isEvald = true;
      URLNode.value.value = prefixTilde(value);
    }

    return URLNode;
  }
}

module.exports = {
  install(less, pluginManager) {
    pluginManager.addVisitor(new Visitor(less));
  },
};
