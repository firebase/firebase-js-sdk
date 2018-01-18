const { exec, spawn } = require('child-process-promise');
const { root } = require('./constants');
const ora = require('ora');

exports.runTests = async () => {
  try {
    const spinner = ora(' Reinstalling Dependencies').start();
    const result = await exec('yarn test', {
      cwd: root
    });
    spinner.stopAndPersist({
      symbol: '✅'
    });
  } catch(err) {
    spinner.stopAndPersist({
      symbol: '❌'
    });
    throw result.stderr
  }
};

exports.setupTestDeps = async() => {
  await spawn('yarn', ['test:setup'], { stdio: 'inherit' });
}
