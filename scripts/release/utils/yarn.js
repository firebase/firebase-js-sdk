const { exec } = require('child-process-promise');
const { root } = require('./constants');

exports.reinstallDeps = async () => {
  await exec('yarn', {
    cwd: root
  });
}
