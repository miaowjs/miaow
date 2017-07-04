// 获取 entry 的名字，主要剔除头部的 ./ 和尾部的 .js
function getChunkName(entry) {
  return entry.replace(/^\.\//, '').replace(/\.js$/, '');
}

module.exports = {
  getChunkName,
};
