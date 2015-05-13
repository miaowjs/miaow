'use strict';

var config = {
  // 当前工作目录
  cwd: process.cwd(),

  // 排除的文件或目录
  // glob格式
  exclude: [

  ],

  // 输出的主目录
  output: '',

  module: {
    // 编译器配置
    parser: [
      {
        test: '*.js',
        parsers: []
      }
    ],

    // 文件生成配置
    road: [
      {
        test: '',
        // 模块标示
        id: '',
        // 产出路径
        release: '',
        // 资源定位路径
        url: '',
        // 产出文件的编码
        charset: '',
        // 文件名是否添加md5戳
        useHash: ''
      }
    ],

    // 文件校验配置
    lint: [
      {
        test: '',
        lint: '',
        option: {}
      }
    ],

    // 压缩配置
    mini: [
      {
        test: '',
        mini: '',
        option: {}
      }
    ]
  },

  release: {
    test: {

    },
    trunk: {

    },
    tag: {

    }
  }
};

module.exports = config;
