const { spawn } = require('child-process-promise');
const { root } = require('./constants');
const ora = require('ora');

exports.runTests = async () => {
  try {
    await spawn('yarn', ['test'], {
      cwd: root,
      stdio: 'inherit'
    });
  } catch (err) {
    throw err;
  }
};

exports.setupTestDeps = async () => {
  await spawn('yarn', ['test:setup'], { stdio: 'inherit' });
};
