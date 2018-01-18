const { root } = require('./constants');
const { spawn } = require('child-process-promise');
const { mapPkgNameToPkgPath } = require('./workspace');

exports.publishToNpm = async (updatedPkgs, isPrerelease) => {
  await Promise.all(updatedPkgs.map(async pkg => {
    const path = await mapPkgNameToPkgPath(pkg);
    let args = ['npm', 'publish'];
    if (isPrerelease) {
      args = [...args, '--tag', 'next'];
    }

    console.log(`📦  Publishing: ${pkg}`)
    await spawn('echo', args, { cwd: path, stdio: 'inherit' });
  }));
};
