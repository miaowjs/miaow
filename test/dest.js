var _ = require('lodash');
var assert = require('assert');
var async = require('async');
var fs = require('fs-extra');
var iconv = require('iconv-lite');
var path = require('path');

var miaow = require('../index');

var cwdPath = path.resolve(__dirname, './fixtures/dest');
var outputPath = path.resolve(__dirname, './output');
var defaultOptions = {
  cwd: cwdPath,
  output: outputPath,
  pack: false,
  module: {
    tasks: []
  }
};

describe('生成', function () {
  this.timeout(10e3);

  it('生成文件', function (done) {
    var pathList = _.map([
      'foo.js',
      'foo_1ca528407f.js',
      'foo.png',
      'foo_38a0cf534e.png'
    ], function (item) {
      return path.resolve(outputPath, item);
    });

    async.series([
      // 编译
      miaow.compile.bind(miaow, defaultOptions),
      // 检验是否存在
      function (cb) {
        async.every(pathList, fs.exists, function (result) {
          assert.equal(result, true);
          cb(null);
        });
      }
    ], function (err) {
      done(err);
    });
  });

  it('不添加Hash值', function (done) {
    var options = _.extend({}, defaultOptions, {
      hash: 0
    });

    var pathList = _.map([
      'foo_1ca528407f.js',
      'foo_38a0cf534e.png'
    ], function (item) {
      return path.resolve(outputPath, item);
    });

    async.series([
      // 编译
      miaow.compile.bind(miaow, options),
      // 检验是否存在
      function (cb) {
        async.any(pathList, fs.exists, function (result) {
          assert.equal(result, false);
          cb(null);
        });
      }
    ], function (err) {
      done(err);
    });
  });

  it('修改目标路径', function (done) {
    var options = _.extend({}, defaultOptions, {
      module: {
        road: [
          {
            test: /(.*\.js)/,
            release: 'js/$1'
          },
          {
            test: /(.*\.png)/,
            release: 'png/$1'
          }
        ]
      }
    });
    var pathList = _.map([
      'js/foo.js',
      'js/foo_1ca528407f.js',
      'png/foo.png',
      'png/foo_38a0cf534e.png'
    ], function (item) {
      return path.resolve(outputPath, item);
    });

    async.series([
      // 编译
      miaow.compile.bind(miaow, options),
      // 检验是否存在
      function (cb) {
        async.every(pathList, fs.exists, function (result) {
          assert.equal(result, true);
          cb(null);
        });
      }
    ], function (err) {
      done(err);
    });
  });

  it('修改目标文件编码', function (done) {
    var encoding = 'gbk';
    var options = _.extend({}, defaultOptions, {
      module: {
        road: [{
          test: /.*\.js$/,
          encoding: encoding
        }]
      }
    });

    async.waterfall([
      // 编译
      miaow.compile.bind(miaow, options),
      // 读取文件内容
      fs.readFile.bind(fs, path.join(outputPath, 'foo.js')),
      // 检验编码
      function (data, cb) {
        assert.equal(iconv.decode(data, encoding), 'module.exports = \'你好，世界！\';\n');
        cb();
      }
    ], function (err) {
      done(err);
    });
  });

});
