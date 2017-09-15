const { firstLetterToUpperCase, getHash, replaceContent } = require('../utils');

// manifest 获取动态 chunk 路径的方法名
const GET_CHUNK_FUNCTION = '__getWebpackChunkPath__';

// 包含动态 chunk 信息的文件名
const BOOT_FILE_NAME = 'boot';

/**
 * 获取注入脚本的宏
 *
 * @param {String} name
 * @returns {String}
 */
function getScriptsMacro(name) {
  return `
<#macro __inject${firstLetterToUpperCase(name)}Scripts__>
<#list __${name}Scripts__ as script>
<script src="\${script}"></script>
</#list>
</#macro>`;
}

// 获取 chunk 的 publicPath
function getChunkPublicPath(stats, chunk) {
  return `${stats.publicPath}${stats.assetsByChunkName[chunk][0]}`;
}

// 获取 assign 指令
function assignDirective(name, value) {
  return `<#assign ${name}=${JSON.stringify(value)} />`;
}

function emitFile(compilation, filename, content) {
  compilation.assets[filename] = {
    source() {
      return content;
    },
    size() {
      return content.length;
    },
  };
}

// 参数处理 设置默认值
class FTLPlugin {
  constructor(options) {
    this.options = Object.assign({}, FTLPlugin.DEFAULT_OPTIONS, options);

    this.manifestMacro = '';
  }

  // webpack 运行时调用 注入compiler对象
  apply(compiler) {
    // 修改 require ensure 里面获取 chunk 路径的处理
    compiler.plugin('make', this.modifyRequireEnsure.bind(this));

    compiler.plugin('emit', (compilation, callback) => {
      const stats = compilation.getStats();

      if (stats.hasErrors()) {
        callback();
        return;
      }

      const bootFilename = this.emitBootFile(compilation);
      this.injectScriptInfo(compilation, bootFilename);

      callback();
    });
  }

  emitBootFile(compilation) {
    const { chunks, hash, mainTemplate, outputOptions } = compilation;
    const { chunkFilename, hashDigestLength } = outputOptions;
    // 动态引用的 chunk
    const dynamicChunks = chunks.filter(
      chunk => Number.isInteger(chunk.id));

    const chunkMaps = {
      hash: {},
      name: {},
    };
    dynamicChunks.forEach((chunk) => {
      chunkMaps.hash[chunk.id] = chunk.renderedHash;
    });

    // 调用插件获取动态 chunk 路径语句
    const dynamicChunkStatement = mainTemplate.applyPluginsWaterfall('asset-path', JSON.stringify(chunkFilename), {
      __from__: 'FTLPlugin',
      hash: `" + ${mainTemplate.renderCurrentHashCode(hash)} + "`,
      hashWithLength: length => `" + ${mainTemplate.renderCurrentHashCode(hash, length)} + "`,
      chunk: {
        id: '" + chunkId + "',
        hash: `" + ${JSON.stringify(chunkMaps.hash)}[chunkId] + "`,
        hashWithLength(length) {
          const shortChunkHashMap = Object.create(null);
          Object.keys(chunkMaps.hash).forEach((chunkId) => {
            if (typeof chunkMaps.hash[chunkId] === 'string') {
              shortChunkHashMap[chunkId] = chunkMaps.hash[chunkId].substr(0, length);
            }
          });
          return `" + ${JSON.stringify(shortChunkHashMap)}[chunkId] + "`;
        },
        name: `" + (${JSON.stringify(chunkMaps.name)}[chunkId]||chunkId) + "`,
      },
    });

    // 文件内容
    const content = `(function () {
  window.${GET_CHUNK_FUNCTION} = function ${GET_CHUNK_FUNCTION}(chunkId) {
    return ${dynamicChunkStatement};
  };
})();`;

    // 文件名
    const filename = mainTemplate.applyPluginsWaterfall('asset-path', chunkFilename, {
      __from__: 'FTLPlugin',
      hash,
      chunk: {
        id: BOOT_FILE_NAME,
        hash: getHash(content, hashDigestLength),
        name: BOOT_FILE_NAME,
      },
    });

    // 生成文件
    emitFile(compilation, filename, content);

    return filename;
  }

  // 修改 manifest 里 require.ensure 获取 asset path 的处理
  modifyRequireEnsure(compilation, callback) {
    compilation.mainTemplate.plugin('asset-path', (path, data) => {
      if (data.__from__ !== 'FTLPlugin' && data.chunk && data.chunk.id === '" + chunkId + "') {
        return `window.${GET_CHUNK_FUNCTION}(chunkId)`;
      }

      return path;
    });

    callback();
  }

  // 注入脚本信息
  injectScriptInfo(compilation, bootFilename) {
    const { commons, entries, define: definitions } = this.options;

    const stats = compilation.getStats();

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

    const bootFilePublicPath = `${statsInfo.publicPath}${bootFilename}`;

    // 页面中需要用到的 JS 脚本的 map
    const commonScriptMap = {
      [BOOT_FILE_NAME]: bootFilePublicPath,
    };
    // 公共脚本的 publicPath
    const commonPublicPaths = commons.map((common) => {
      const publicPath = getChunkPublicPath(statsInfo, common);

      commonScriptMap[common] = publicPath;

      return publicPath;
    });
    commonPublicPaths.unshift(bootFilePublicPath);
    // 公共脚本的 FTL 定义
    const commonDefine = assignDirective('__commonScripts__', commonPublicPaths);

    // 入口脚本的处理
    entries
      // 筛选出有模版的入口配置
      .filter(({ template }) => !!template)
      .forEach(({ script, template }) => {
        // 入口脚本的 publicPath
        const scriptPublicPath = script ? [getChunkPublicPath(statsInfo, script)] : [];
        // 入口脚本的 FTL 定义
        const scriptDefine = assignDirective('__entryScripts__', scriptPublicPath);

        // 所有脚本
        const allScriptMap = Object.assign({}, commonScriptMap, script ? {
          entry: scriptPublicPath[0],
        } : {});
        const allScriptDefine = assignDirective('__allScriptMap__', allScriptMap);

        // 最终需要插入到 FTL 的内容，包含了脚本路径和插入脚本的宏
        const prepend = [
          allScriptDefine,
          commonDefine,
          scriptDefine,
          getScriptsMacro('common'),
          getScriptsMacro('entry'),
          this.manifestMacro,
        ];

        // FTL 文件的路径
        const content = compilation.assets[template].source().toString();
        const newContent = prepend.concat(replaceContent(content, definitions)).join('\n');

        emitFile(compilation, template, newContent);
      });
  }
}

FTLPlugin.DEFAULT_OPTIONS = {
  define: {},
  entries: [],
  commons: [],
};

module.exports = FTLPlugin;
