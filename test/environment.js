var _ = require('lodash');
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var miaow = require('../index');

var cwdPath = path.resolve(__dirname, './fixtures/environment');
var outputPath = path.resolve(__dirname, './output');
var defaultOptions = {
  cwd: cwdPath,
  output: outputPath,
  configPath: path.join(cwdPath, 'miaow.config.js'),
  pack: false,
  module: {
    tasks: []
  }
};

describe('运行场景', function () {
  this.timeout(10e3);

  it('默认场景', function (done) {
    miaow.compile(defaultOptions, function () {
      var log = JSON.parse(fs.readFileSync(path.join(outputPath, 'miaow.log.json')));
      assert.equal(log.modules['foo.js'].destPathWithHash, 'foo_1ca528407.js');
      done();
    });
  });

  it('指定场景', function (done) {
    miaow.compile(_.extend({}, defaultOptions, {environment: 'other'}), function () {
      var log = JSON.parse(fs.readFileSync(path.join(outputPath, 'miaow.log.json')));
      assert.equal(log.modules['foo.js'].destPathWithHash, 'foo_1ca52840.js');
      done();
    });
  });
});
