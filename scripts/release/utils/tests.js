const { spawn } = require('child-process-promise');
const { root } = require('./constants');
const ora = require('ora');

exports.runTests = async () => {
  const spinner = ora(' Running test suite').start();
  try {
    await spawn('yarn', ['test'], {
      cwd: root
    });
    spinner.stopAndPersist({
      symbol: '✅'
    });
  } catch(err) {
    spinner.stopAndPersist({
      symbol: '❌'
    });
    throw err;
  }
};

exports.setupTestDeps = async() => {
  await spawn('yarn', ['test:setup'], { stdio: 'inherit' });
}
