const fs = require('fs');
const path = require('path');

// 进程目录
const processCWD = process.cwd();

// 读取配置文件并结合传入的选项得到最终的选项
const getFinalOptionsFromConfigFile = (options) => {
  // 获取可用的配置文件
  const configFileList = [];
  if (options.configPath) {
    configFileList.push(path.resolve(processCWD, options.configPath));
  }

  configFileList.push(path.resolve(processCWD, options.context || '', 'miaow.config.js'));
  const configFile = configFileList.find(fs.existsSync);

  if (!configFile) {
    throw new Error('找不到配置文件！');
  }

  // 获取配置文件内的配置信息
  const optionsFromConfigFile = require(configFile);
  console.log(`配置信息来自 ${configFile}`);

  // 如果是数组就返回处理后的数组
  if (Array.isArray(optionsFromConfigFile)) {
    return optionsFromConfigFile.map(_options =>
      Object.assign({}, _options, options));
  }

  return Object.assign({}, optionsFromConfigFile, options);
};

module.exports = getFinalOptionsFromConfigFile;
