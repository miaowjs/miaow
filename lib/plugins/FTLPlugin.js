const fs = require('fs');

// 注入公共脚本的宏
const injectCommonScriptsMacro = `
<#macro __inject_common_scripts__>
<#list __common_scripts__ as script>
<script src="\${script}"></script>
</#list>
</#macro>`;

// 注入页面入口脚本的宏
const injectEntryScriptsMacro = `
<#macro __inject_entry_scripts__>
<#list __entry_scripts__ as script>
<script src="\${script}"></script>
</#list>
</#macro>`;

// 获取 chunk 的 publicPath
function getChunkPublicPath(stats, chunk) {
  return `${stats.publicPath}${stats.assetsByChunkName[chunk][0]}`;
}

// 获取 assign 指令
function assignDirective(name, value) {
  if (!name || !value) {
    throw new Error('assign need name and value!');
  }

  return `<#assign ${name}=${value} />\n`;
}

// 在文件头部插入文本
function prependContent(filepath, content) {
  return new Promise((resolve, reject) => {
    // 读取文件
    fs.readFile(filepath, { encoding: 'utf-8' }, (readError, data) => {
      if (readError) {
        reject(readError);
        return;
      }

      // 写入拼接的内容
      fs.writeFile(filepath, [content, data].join('\n'), (writeError) => {
        if (writeError) {
          reject(writeError);
          return;
        }

        resolve();
      });
    });
  });
}

// 参数处理 设置默认值
function FTLPlugin(options) {
  this.options = Object.assign(
    {
      entries: [],
      commons: [],
    }, options);
}

// webpack 运行时调用 注入compiler对象
FTLPlugin.prototype.apply = function (compiler) {
  const { commons, entries } = this.options;

  // 编译器已经输出所有的资源后，开始修改入口ftl文件
  compiler.plugin('after-emit', (compilation, callback) => {
    const stats = compilation.getStats().toJson({
      hash: true,
      publicPath: true,
      assets: true,
      chunks: false,
      modules: false,
      source: false,
      errorDetails: false,
      timings: false,
    });

    // 公共脚本的 publicPath
    const commonPublicPaths = commons.map(common => getChunkPublicPath(stats, common));
    // 公共脚本的 FTL 定义
    const commonDefine = assignDirective('__common_scripts__', JSON.stringify(commonPublicPaths));

    // 入口脚本的处理
    const assignInFtlTasks = entries
      .map(({ script, template }) => {
        if (!compilation.assets[template]) {
          // 没有查到对应的模版文件，有可能是模版文件编写错了，这里暂时放过，后续 Webpack 会给出对应的错误信息
          return Promise.resolve();
        }

        // 入口脚本的 publicPath
        const scriptPublicPath = script ? [getChunkPublicPath(stats, script)] : [];
        // 入口脚本的 FTL 定义
        const scriptDefine = assignDirective('__entry_scripts__', JSON.stringify(scriptPublicPath));

        // 最终需要插入到 FTL 的内容，包含了脚本路径和插入脚本的宏
        const content = [
          commonDefine,
          scriptDefine,
          injectCommonScriptsMacro,
          injectEntryScriptsMacro,
        ].join('');

        // FTL 文件的路径
        const templatePath = compilation.assets[template].existsAt;

        // 执行插入操作
        return prependContent(templatePath, content);
      });

    Promise
      .all(assignInFtlTasks)
      .then(() => callback(), callback);
  });
};

module.exports = FTLPlugin;
