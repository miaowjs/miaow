var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('../utils'),
    firstLetterToUpperCase = _require.firstLetterToUpperCase,
    getHash = _require.getHash,
    replaceContent = _require.replaceContent;

// manifest 获取动态 chunk 路径的方法名


var GET_CHUNK_FUNCTION = '__getWebpackChunkPath__';

// 包含动态 chunk 信息的文件名
var BOOT_FILE_NAME = 'boot';

/**
 * 获取注入脚本的宏
 *
 * @param {String} name
 * @returns {String}
 */
function getScriptsMacro(name) {
  return `
<#macro __inject${ firstLetterToUpperCase(name) }Scripts__>
<#list __${ name }Scripts__ as script>
<script src="\${script}"></script>
</#list>
</#macro>`;
}

// 获取 chunk 的 publicPath
function getChunkPublicPath(stats, chunk) {
  return `${ stats.publicPath }${ stats.assetsByChunkName[chunk][0] }`;
}

// 获取 assign 指令
function assignDirective(name, value) {
  return `<#assign ${ name }=${ JSON.stringify(value) } />`;
}

function emitFile(compilation, filename, content) {
  compilation.assets[filename] = {
    source() {
      return content;
    },
    size() {
      return content.length;
    }
  };
}

// 参数处理 设置默认值

var FTLPlugin = function () {
  function FTLPlugin(options) {
    _classCallCheck(this, FTLPlugin);

    this.options = Object.assign({}, FTLPlugin.DEFAULT_OPTIONS, options);

    this.manifestMacro = '';
  }

  // webpack 运行时调用 注入compiler对象


  _createClass(FTLPlugin, [{
    key: 'apply',
    value: function apply(compiler) {
      var _this = this;

      // 修改 require ensure 里面获取 chunk 路径的处理
      compiler.plugin('make', this.modifyRequireEnsure.bind(this));

      compiler.plugin('emit', function (compilation, callback) {
        var stats = compilation.getStats();

        if (stats.hasErrors()) {
          callback();
          return;
        }

        var bootFilename = _this.emitBootFile(compilation);
        _this.injectScriptInfo(compilation, bootFilename);

        callback();
      });
    }
  }, {
    key: 'emitBootFile',
    value: function emitBootFile(compilation) {
      var chunks = compilation.chunks,
          hash = compilation.hash,
          mainTemplate = compilation.mainTemplate,
          outputOptions = compilation.outputOptions;
      var chunkFilename = outputOptions.chunkFilename,
          hashDigestLength = outputOptions.hashDigestLength;
      // 动态引用的 chunk

      var dynamicChunks = chunks.filter(function (chunk) {
        return Number.isInteger(chunk.id);
      });

      var chunkMaps = {
        hash: {},
        name: {}
      };
      dynamicChunks.forEach(function (chunk) {
        chunkMaps.hash[chunk.id] = chunk.renderedHash;
      });

      // 调用插件获取动态 chunk 路径语句
      var dynamicChunkStatement = mainTemplate.applyPluginsWaterfall('asset-path', JSON.stringify(chunkFilename), {
        __from__: 'FTLPlugin',
        hash: `" + ${ mainTemplate.renderCurrentHashCode(hash) } + "`,
        hashWithLength: function hashWithLength(length) {
          return `" + ${ mainTemplate.renderCurrentHashCode(hash, length) } + "`;
        },
        chunk: {
          id: '" + chunkId + "',
          hash: `" + ${ JSON.stringify(chunkMaps.hash) }[chunkId] + "`,
          hashWithLength(length) {
            var shortChunkHashMap = Object.create(null);
            Object.keys(chunkMaps.hash).forEach(function (chunkId) {
              if (typeof chunkMaps.hash[chunkId] === 'string') {
                shortChunkHashMap[chunkId] = chunkMaps.hash[chunkId].substr(0, length);
              }
            });
            return `" + ${ JSON.stringify(shortChunkHashMap) }[chunkId] + "`;
          },
          name: `" + (${ JSON.stringify(chunkMaps.name) }[chunkId]||chunkId) + "`
        }
      });

      // 文件内容
      var content = `(function () {
  window.${ GET_CHUNK_FUNCTION } = function ${ GET_CHUNK_FUNCTION }(chunkId) {
    return ${ dynamicChunkStatement };
  };
})();`;

      // 文件名
      var filename = mainTemplate.applyPluginsWaterfall('asset-path', chunkFilename, {
        __from__: 'FTLPlugin',
        hash,
        chunk: {
          id: BOOT_FILE_NAME,
          hash: getHash(content, hashDigestLength),
          name: BOOT_FILE_NAME
        }
      });

      // 生成文件
      emitFile(compilation, filename, content);

      return filename;
    }

    // 修改 manifest 里 require.ensure 获取 asset path 的处理

  }, {
    key: 'modifyRequireEnsure',
    value: function modifyRequireEnsure(compilation, callback) {
      compilation.mainTemplate.plugin('asset-path', function (path, data) {
        if (data.__from__ !== 'FTLPlugin' && data.chunk && data.chunk.id === '" + chunkId + "') {
          return `window.${ GET_CHUNK_FUNCTION }(chunkId)`;
        }

        return path;
      });

      callback();
    }

    // 注入脚本信息

  }, {
    key: 'injectScriptInfo',
    value: function injectScriptInfo(compilation, bootFilename) {
      var _this2 = this;

      var _options = this.options,
          commons = _options.commons,
          entries = _options.entries,
          definitions = _options.define;


      var stats = compilation.getStats();

      var statsInfo = stats.toJson({
        hash: true,
        publicPath: true,
        assets: true,
        chunks: false,
        modules: false,
        source: false,
        errorDetails: false,
        timings: false
      });

      var bootFilePublicPath = `${ statsInfo.publicPath }${ bootFilename }`;

      // 页面中需要用到的 JS 脚本的 map
      var commonScriptMap = {
        [BOOT_FILE_NAME]: bootFilePublicPath
      };
      // 公共脚本的 publicPath
      var commonPublicPaths = commons.map(function (common) {
        var publicPath = getChunkPublicPath(statsInfo, common);

        commonScriptMap[common] = publicPath;

        return publicPath;
      });
      commonPublicPaths.unshift(bootFilePublicPath);
      // 公共脚本的 FTL 定义
      var commonDefine = assignDirective('__commonScripts__', commonPublicPaths);

      // 入口脚本的处理
      entries
      // 筛选出有模版的入口配置
      .filter(function (_ref) {
        var template = _ref.template;
        return !!template;
      }).forEach(function (_ref2) {
        var script = _ref2.script,
            template = _ref2.template;

        // 入口脚本的 publicPath
        var scriptPublicPath = script ? [getChunkPublicPath(statsInfo, script)] : [];
        // 入口脚本的 FTL 定义
        var scriptDefine = assignDirective('__entryScripts__', scriptPublicPath);

        // 所有脚本
        var allScriptMap = Object.assign({}, commonScriptMap, script ? {
          entry: scriptPublicPath[0]
        } : {});
        var allScriptDefine = assignDirective('__allScriptMap__', allScriptMap);

        // 最终需要插入到 FTL 的内容，包含了脚本路径和插入脚本的宏
        var prepend = [allScriptDefine, commonDefine, scriptDefine, getScriptsMacro('common'), getScriptsMacro('entry'), _this2.manifestMacro];

        // FTL 文件的路径
        var content = compilation.assets[template].source().toString();
        var newContent = prepend.concat(replaceContent(content, definitions)).join('\n');

        emitFile(compilation, template, newContent);
      });
    }
  }]);

  return FTLPlugin;
}();

FTLPlugin.DEFAULT_OPTIONS = {
  define: {},
  entries: [],
  commons: []
};

module.exports = FTLPlugin;