const fs = require('fs');
const replaceall = require('replaceall');

function replaceContent(content, definitions = {}) {
  let newContent = content;

  Object.keys(definitions).forEach((key) => {
    newContent = replaceall(key, definitions[key], newContent);
  });

  return newContent;
}

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
function processTemplateFile(filepath, prepend, definitions) {
  return new Promise((resolve, reject) => {
    // 读取文件
    fs.readFile(filepath, { encoding: 'utf-8' }, (readError, content) => {
      if (readError) {
        reject(readError);
        return;
      }

      const newContent = replaceContent(content, definitions);

      // 写入拼接的内容
      fs.writeFile(filepath, [prepend, newContent].join('\n'), (writeError) => {
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
FTLPlugin.prototype.apply = function apply(compiler) {
  const { commons, entries, define: definitions } = this.options;

  // 编译器已经输出所有的资源后，开始修改入口ftl文件
  compiler.plugin('after-emit', (compilation, callback) => {
    const stats = compilation.getStats();

    // 如果编译报错，就不进行后续的处理
    if (stats.hasErrors()) {
      callback();
      return;
    }

    const statsInfo = stats.toJson({
      hash: true,
      publicPath: true,
      assets: true,
      chunks: false,
      modules: false,
      source: false,
      errorDetails: false,
      timings: false,
    });

    // 页面中需要用到的 JS 脚本的 map
    const allScriptMap = {};
    // 公共脚本的 publicPath
    const commonPublicPaths = commons.map((common) => {
      const publicPath = getChunkPublicPath(statsInfo, common);

      allScriptMap[common] = publicPath;

      return publicPath;
    });
    // 公共脚本的 FTL 定义
    const commonDefine = assignDirective('__common_scripts__', JSON.stringify(commonPublicPaths));

    // 入口脚本的处理
    const assignInFtlTasks = entries
      .map(({ script, template }) => {
        // 入口脚本的 publicPath
        const scriptPublicPath = script ? [getChunkPublicPath(statsInfo, script)] : [];
        // 入口脚本的 FTL 定义
        const scriptDefine = assignDirective('__entry_scripts__', JSON.stringify(scriptPublicPath));

        // 添加入口脚本信息
        if (script) {
          allScriptMap.entry = scriptPublicPath[0];
        }

        const allScriptDefine = assignDirective('__all_script_map__', JSON.stringify(allScriptMap));

        // 最终需要插入到 FTL 的内容，包含了脚本路径和插入脚本的宏
        const prepend = [
          allScriptDefine,
          commonDefine,
          scriptDefine,
          injectCommonScriptsMacro,
          injectEntryScriptsMacro,
        ].join('');

        // FTL 文件的路径
        const templatePath = compilation.assets[template].existsAt;

        // 执行插入操作
        return processTemplateFile(templatePath, prepend, definitions);
      });

    Promise
      .all(assignInFtlTasks)
      .then(() => callback(), callback);
  });
};

module.exports = FTLPlugin;
