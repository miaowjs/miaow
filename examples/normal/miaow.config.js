const path = require('path');

const desktopConfig = {
  entries: [
    {
      script: './desktop/index/index.js',
    },
    {
      script: './desktop/login/index.js',
    },
  ],
  manifest: './desktop/manifest.js',
  commons: [
    './desktop/common/base/index.js',
    './desktop/common/core/index.js',
  ],
  context: path.resolve('./src'),
  publicPath: '/',
};

const mobileConfig = {
  entries: [
    {
      script: './mobile/index/index.js',
      template: './mobile/index/template.ftl',
    },
    {
      script: './mobile/login/index.js',
      template: './mobile/login/template.ftl',
    },
  ],
  manifest: './mobile/manifest.js',
  commons: [
    './mobile/common/base/index.js',
    './mobile/common/core/index.js',
  ],
  context: path.resolve('./src'),
  publicPath: '/',
  configurationFactory(configuration) {
    return configuration;
  },
};

module.exports = [desktopConfig, mobileConfig];
