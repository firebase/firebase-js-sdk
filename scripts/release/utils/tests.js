const { exec } = require('child-process-promise');
const { root } = require('./constants');

exports.runTests = async () => {
  await exec('yarn test', {
    cwd: root
  });
};
