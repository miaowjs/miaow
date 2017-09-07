const execa = require('execa');
const path = require('path');

// 编译文件
execa('npm', ['run', 'build'])
  .then(() => execa('git', ['add', 'dist']))
  .catch((error) => {
    console.error(error.toString());
    process.exit(error.code);
  });
