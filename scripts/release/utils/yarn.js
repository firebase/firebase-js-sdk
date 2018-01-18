const { exec } = require('child-process-promise');
const { root } = require('./constants');
const ora = require('ora');

exports.reinstallDeps = async () => {
  const spinner = ora(' Reinstalling Dependencies').start();
  await exec('yarn', {
    cwd: root
  });
  spinner.stopAndPersist({
    symbol: '✅'
  });
}
