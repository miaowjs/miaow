const path = require('path');

const desktopConfig = {
  entries: [
    {
      script: './desktop/index/index.js',
      template: './desktop/index/template.ftl',
    },
  ],
  context: path.resolve('./src'),
  chunkFilename: 'desktop/[id].js',
  publicPath: '/',
};

const mobileConfig = {
  entries: [
    {
      script: './mobile/index/index.js',
      template: './mobile/index/template.ftl',
    },
  ],
  commons: [
    './mobile/common/base/index.js',
    './mobile/common/core/index.js',
  ],
  context: path.resolve('./src'),
  chunkFilename: 'mobile/[id].[chunkhash].js',
  publicPath: 'http://localhost/',
};

module.exports = [desktopConfig, mobileConfig];
