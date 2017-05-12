# 喵呜

基于 Webpack 开发的编译工具。

### 特性

* 基于 Webpack
* 支持以 FreeMaker 为模版的多页面站点
* 隐藏了复杂的 Webpack 的配置，只暴露简单配置项

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

|              | 说明          | 类型      | 默认值             |
| ------------ | ----------- | ------- | --------------- |
| --configPath | 配置文件的路径     | string  | miaow.config.js |
| --watch      | 是否启动监听模式    | boolean | false           |
| --production | 是否切换到生产环境模式 | boolean | false           |

### 配置说明

|            | 说明                                       | 类型      | 默认值                                      |
| ---------- | ---------------------------------------- | ------- | ---------------------------------------- |
| context    | 基础目录，绝对路径                                | string  | 程序                                       |
| output     | 输出目录，绝对路径                                | string  |                                          |
| filename   | 输出的文件名                                   | string  | name[.hash:10].js                        |
| publicPath | 公共路径，CDN                                 | string  | /                                        |
| entries    | 入口配置                                     | Array   | []                                       |
| commons    | 公共模块，以数组形式提供                             | Array   | []                                       |
| syncFiles  | 需要从基础目录同步到输出目录的文件列表                      | Array   | []                                       |
| define     | 变量替换配置，用于替换脚本内的一些变量，提供的值会扩展默认值           | Object  | {}                                       |
| browsers   | 需要支持的浏览器列表，用来做 Babel 编译和 CSS 的浏览器前缀自动补全，[参考文档](https://github.com/ai/browserslist) | Array   | ['> 1%', 'last 2 versions', 'iOS >= 6', 'Android >= 2.1', 'Explorer >= 7', 'Firefox >= 38', 'Chrome >= 30'] |
| watch      | 是否启动监听模式                                 | boolean | false                                    |
| production | 是否切换到生产环境模式                              | boolean | false                                    |

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
QAWSEDRT6Y7U8I90O-P=]\÷```javascript
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
