# 喵呜

基于 Webpack 开发的编译工具。

### 特性

* 基于 Webpack
* 支持以 FreeMaker 为模版的多页面站点
* 隐藏了复杂的 Webpack 的配置，只暴露简单配置项

### TODO

- 使用路径的 hash 值替代 chunk 和 module 的名字
- 输出静态文件的线上路径到一个独立的 FTL 文件里面
- 优化编译的日志输出
- ajax 和 websocket mock 的考虑

### 安装

```bash
$ npm install -g miaow
```

### 使用

```bash
$ miaow <基础目录> <输出目录>
```

例如：

```bash
$ miaow ./src ./build
```

上述命令以 `./src` 目录为基础，编译内部的文件，并输出到`./build`目录。

### 命令选项

`miaow`命令支持的选项如下：

|                  | 说明          | 类型      | 默认值             |
| ---------------- | ----------- | ------- | --------------- |
| -c, --configPath | 配置文件的路径     | string  | miaow.config.js |
| -w, --watch      | 是否启动监听模式    | boolean | false           |
| -p, --production | 是否切换到生产环境模式 | boolean | false           |

### 配置说明

|                      | 说明                                       | 类型                      | 默认值                                      |
| -------------------- | ---------------------------------------- | ----------------------- | ---------------------------------------- |
| context              | 基础目录，绝对路径                                | string                  | 程序                                       |
| output               | 输出目录，绝对路径                                | string                  |                                          |
| filename             | 输出的文件名                                   | string                  | name[.hash:10].js                        |
| publicPath           | 公共路径，CDN                                 | string                  | /                                        |
| entries              | 入口配置                                     | Array                   | []                                       |
| manifest             | 存放 webpack 启动脚本 manifest 的路径             | string                  | ./manifest                               |
| commons              | 公共模块，以数组形式提供                             | Array                   | []                                       |
| syncFiles            | 需要从基础目录同步到输出目录的文件列表，例如： `['relative/file.txt', '/absolute/file.txt', 'relative/dir', '/absolute/dir', '**/*', {glob:'**/*', dot: true}]`，Globs 可以参考 [minimatch options](https://github.com/isaacs/minimatch) | Array                   | []                                       |
| define               | 变量替换配置，用于替换脚本内的一些变量，提供的值会扩展默认值           | Object                  | {}                                       |
| watch                | 是否启动监听模式                                 | boolean                 | false                                    |
| production           | 是否切换到生产环境模式                              | boolean                 | false                                    |
| configurationFactory | 配置信息加工工厂，用于加工喵呜生成的 webpack configuration，支持 Promise 异步 | function(configuration) | function (configuration) { return configuration;} |

#### 实例

```javascript
// miaow.config.js
module.exports = {
  watch: true,
  entries: [
    {
      script: './index/index.js',
      template: './index/index.ftl',
    },
  ],
  commons: [
    './common/base/index.js',
    './common/core/index.js',
  ],
  context: path.resolve('./src'),
  publicPath: '//foo.com/',
  syncFiles: ['**/*.txt', '**/*.html'],
};
```

#### 配置入口

喵呜是多入口配置，入口既可以是脚本，也可以是脚本和后端模版文件的组合。

```js
module.exports = {
  entries: [
    './login/index.js',
    {
      template: './index/index.ftl',
      script: './index/index.js',
    },
  ],
};
```

单独的脚本入口和 Webpack 的处理相同，将脚本依赖的模块打包起来生成 bundle。

如果入口是脚本和后端模版文件，其中脚本的处理如上，模版文件则会在脚本完成处理后，自动添加脚本的引用。当然模版文件里的一些资源引用（其他模版文件、样式和图片）也会经过编译处理。

#### 公共模块

出于提高页面加载效率的考虑，传统多页面应用一般会拆分出多个公共模块。以如下的文件结构举例：

```
|-base/index.js
|-core/index.js
|-index/index.js
|-login/index.js
```

```javascript
// base/index.js
import $ from 'jquery';
import Vue from 'vue';
...
```

```javascript
// core/index.js
import $ from 'jquery';
import _ from 'lodash';
...
```

```javascript
// index/index.js
import $ from 'jquery';
import Vue from 'vue';
import _ from 'lodash';
import core from '../core';
...
```

```javascript
// login/index.js
import $ from 'jquery';
import Vue from 'vue';
import _ from 'lodash';
import core from '../core';
...
```

通过以下配置，我们可以得到两个公共模块，业务脚本在打包时会排除这两个公共模块及其依赖。

```javascript
module.exports = {
  commons: [
    './base/index.js',
    './core/index.js',
  ],
};
```

注意，`commons`数组里的脚本是顺序有关的，后面的脚本会把前面的脚本及其依赖列为排除项。

#### 变量替换

喵呜会替换脚本和模版中的一些变量：

```javascript
{
  // 公共路径，CDN
  __cdn__: '//foo.com/cdn/',
  // 是否是本地调试
  __debug__: true,
  // 执行环境
  'process.env.NODE_ENV': 'development',
}
```

喵呜也提供了`define`参数扩展变量替换。

### Babel 配置

喵呜使用`Babel`编译`JavaScript`脚本，并已经设定了一些默认配置：

```javascript
options: {
  cacheDirectory: true,
    presets: [
      ['env', { targets: { browsers }, modules: false }],
      'react',
      'stage-2',
    ],
},
```

用户可以在项目中增加`.babelrc`配置文件来覆盖默认配置。

### Autoprefixer 配置

喵呜已经为用户安装了`Autoprefixer`，用户只需要在项目根目录增加一个名为`postcss.config.js`的配置文件就可以启用，内容如下：

```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('autoprefixer')
  ]
};
```

### 浏览器兼容设置

喵呜使用的`Autoprefixer`和`Babel`都项目指定浏览器兼容范围，这个范围可以在项目的`package.json`里面配置，推荐的配置信息（[配置语法](https://github.com/ai/browserslist)）如下：

```json
{
  "browserslist": [
    "> 1%",
    "last 2 versions",
    "iOS >= 8",
    "Android >= 4",
    "Explorer >= 8",
    "Firefox >= 43",
    "Chrome >= 45"
  ]
}
```

### 使用 Vue

喵呜支持`.vue`文件的编译，但是需要用户自行安装[vue](http://npmjs.com/package/vue)和[vue-template-compiler](http://npmjs.com/package/vue-template-compiler)，并保证这两个的版本一致，如下:

```json
{
  "dependencies": {
    "vue": "2.3.4",
    "vue-template-compiler": "2.3.4"
  }
}
```

