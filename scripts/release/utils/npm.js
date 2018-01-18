const { root } = require('./constants');
const { spawn } = require('child-process-promise');
const { mapPkgNameToPkgPath } = require('./workspace');

exports.publishToNpm = async (updatedPkgs, isPrerelease) => {
  await Promise.all(
    updatedPkgs.map(async pkg => {
      const path = await mapPkgNameToPkgPath(pkg);
      const pkgJson = require(`${path}/package.json`);

      /**
       * Skip private packages
       */
      if (pkgJson.private) return;

      let args = ['publish'];

      /**
       * Ensure prereleases are tagged with the `next` tag
       */
      if (isPrerelease) {
        args = [...args, '--tag', 'next'];
      }

      console.log(`📦  Publishing: ${pkg}@${pkgJson.version}`);
      await spawn('npm', args, { cwd: path, stdio: 'inherit' });
    })
  );
};
