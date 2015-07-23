var _ = require('lodash');
var assert = require('assert');
var async = require('async');
var fs = require('fs');
var mutil = require('miaow-util');
var path = require('path');

var miaow = require('../index');

var cwdPath = path.resolve(__dirname, './fixtures/tasks');
var outputPath = path.resolve(__dirname, './output');
var defaultOptions = {
  cwd: cwdPath,
  output: outputPath,
  pack: false
};

function exec(options, results, cb) {
  async.series([
    miaow.compile.bind(miaow, options),
    function (cb) {
      async.each(results, function (result, cb) {
        fs.readFile(
          path.join(outputPath, result.path),
          {encoding: 'utf-8'},
          function (err, data) {
            if (err) {
              return cb(err);
            }

            assert.equal(data, result.content);
            cb();
          });
      }, cb);
    }
  ], cb);
}

describe('任务', function () {
  this.timeout(10e3);

  it('普通任务', function (done) {
    var options = _.extend({}, defaultOptions, {
      module: {
        tasks: [
          {
            test: /foo\.js$/,
            plugins: mutil.plugin('replace', '0.0.1', function (option, cb) {
              assert.equal(
                this.file.contents.toString(),
                'module.exports = \'你好，世界！\';\n'
              );

              this.file.contents = new Buffer('module.exports = \'Hello, world!\';\n');
              cb();
            })
          }
        ]
      }
    });

    exec(options, [
      {
        path: 'foo.js',
        content: 'module.exports = \'Hello, world!\';\n'
      }
    ], done);
  });

  it('任务序列', function (done) {
    var options = _.extend({}, defaultOptions, {
      module: {
        tasks: [
          {
            test: /foo\.js$/,
            plugins: [mutil.plugin('replace', '0.0.1', function (option, cb) {
              assert.equal(this.file.contents.toString(), 'module.exports = \'你好，世界！\';\n');
              this.file.contents = new Buffer('module.exports = \'Hello, world!\';\n');
              cb();
            }), mutil.plugin('replace', '0.0.2', function (option, cb) {
              assert.equal(this.file.contents.toString(), 'module.exports = \'Hello, world!\';\n');
              this.file.contents = new Buffer('module.exports = \'Hello, 世界!\';\n');
              cb();
            })]
          }
        ]
      }
    });

    exec(options, [
      {
        path: 'foo.js',
        content: 'module.exports = \'Hello, 世界!\';\n'
      }
    ], done);
  });

  it('使用缓存', function (done) {
    function addHash(option, cb) {
      var relativePathList = [];
      var moduleUrlMap = {};
      var module = this;
      var contents = module.file.contents.toString();

      // 获取所有依赖的模块路径
      contents.replace(/require\(['"](\S+)['"]\)/g, function (statement, relativePath) {
        relativePathList.push(relativePath);

        return statement;
      });

      // 获取所有模块的hash值
      async.eachSeries(_.uniq(relativePathList), function (relativePath, cb) {
        module.getModule(relativePath, function (err, module) {
          if (err) {
            return cb(err);
          }

          moduleUrlMap[relativePath] = module.url;
          cb();
        });
      }, function (err) {
        if (err) {
          return cb(err);
        }

        // 做内容替换
        contents = contents.replace(/require\(['"](\S+)['"]\)/g, function (statement, relativePath) {
          return statement.replace(relativePath, moduleUrlMap[relativePath]);
        });

        module.file.contents = new Buffer(contents);
        cb();
      });
    }

    var options = _.extend({}, defaultOptions, {
      domain: '//www.example.com',
      module: {
        tasks: [
          {
            test: /bar\.js$/,
            plugins: mutil.plugin('addHash', '0.0.1', addHash)
          }
        ]
      }
    });

    exec(options, [
      {
        path: 'bar.js',
        content: 'var foo = require(\'//www.example.com/foo_1ca528407f.js\');\n\nconsole.log(foo);\n'
      }
    ], done);
  });
});
