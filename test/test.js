var _ = require('lodash');
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var miaow = require('..');
describe('喵呜', function() {
  this.timeout(10e3);

  var log;

  before(function(done) {
    miaow({
      context: path.resolve(__dirname, './fixtures')
    }, function(err) {
      if (err) {
        console.error(err.toString(), err.stack);
        process.exit(1);
      }

      log = JSON.parse(fs.readFileSync(path.resolve(__dirname, './output/miaow.log.json')));
      done();
    });
  });

  it('接口是否存在', function() {
    assert(!!miaow);
  });

  it('输出', function() {
    assert.equal(log.modules['dest.es6'].destHash, 'ada4700e6323da09861f30b0eaea0720');
  });

  it('寻路', function() {
    assert.equal(log.modules['resolve.js'].destHash, 'd41d8cd98f00b204e9800998ecf8427e');
  });

  it('创建', function() {
    assert.equal(log.modules['emit.js'].destHash, '62d36035e56c8ffa4213361137b01ed2');
  });
});
