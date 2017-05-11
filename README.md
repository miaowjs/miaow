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
$ miaow <入口目录> <输出目录>
```

例如：

```bash
$ miaow ./src ./build
```

上述命令以 `./src` 目录为上下文，编译内部的文件，并输出到`./build`目录。

### 命令选项

`miaow`命令支持的选项如下：

| 选项           | 说明          | 类型      | 默认值             |
| ------------ | ----------- | ------- | --------------- |
| --configPath | 配置文件的路径     | string  | miaow.config.js |
| --watch      | 是否启动监听模式    | boolean | false           |
| --production | 是否切换到生产环境模式 | boolean | false           |

### 配置说明

