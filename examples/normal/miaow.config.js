const path = require('path');

const desktopConfig = {
  // watch: true,
  // production: true,
  entries: [
    {
      script: './desktop/index/index.js',
      template: './desktop/index/index.html',
    },
    {
      script: './desktop/login/index.js',
      template: './desktop/login/index.html',
    },
  ],
  commons: [
    './desktop/common/base/index.js',
    './desktop/common/core/index.js',
  ],
  context: path.resolve('./src'),
  publicPath: '//pimg1.126.net/fa/desktop/',
  syncFiles: ['**/*.txt', '**/*.html'],
};

const mobileConfig = {
  // watch: true,
  // production: true,
  entries: [
    {
      script: './mobile/index/index.js',
      template: './mobile/index/index.html',
    },
  ],
  commons: [
    './mobile/common/base/index.js',
    './mobile/common/core/index.js',
  ],
  context: path.resolve('./src'),
  publicPath: '//pimg1.126.net/fa/mobile/',
};

module.exports = [desktopConfig, mobileConfig];
