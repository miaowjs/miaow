var ModuleFactory = require('./ModuleFactory');

function Compilation(moduleFactory) {
  // 编译的模块列表
  this.modules = [];
}

Compilation.prototype.seal = function() {

};

module.exports = Compilation;
