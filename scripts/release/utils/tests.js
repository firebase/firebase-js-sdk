const { exec } = require('child-process-promise');
const { root } = require('./constants');
const ora = require('ora');

exports.runTests = async () => {
  const spinner = ora(' Reinstalling Dependencies').start();
  const result = await exec('yarn test', {
    cwd: root
  });

  if (result.stderr) {
    spinner.stopAndPersist({
      symbol: '❌'
    });
    console.error(result.stderr);
    throw result.stderr
  } else {
    spinner.stopAndPersist({
      symbol: '✅'
    });
  }
};
