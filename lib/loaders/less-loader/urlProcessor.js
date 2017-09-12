const csstree = require('css-tree');
const { isNeedPrefixTilde } = require('../../utils');

class URLProcessor {
  process(css) {
    const ast = csstree.parse(css);

    csstree.walk(ast, (node) => {
      if (node.type === 'Url' && isNeedPrefixTilde(node.value.value)) {
        node.value.value = `./${node.value.value}`;
      }
    });

    return csstree.translate(ast);
  }
}

module.exports = {
  install(less, pluginManager) {
    pluginManager.addPostProcessor(new URLProcessor());
  },
};
