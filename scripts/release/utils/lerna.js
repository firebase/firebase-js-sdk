const { exec } = require('child-process-promise');
const npmRunPath = require('npm-run-path');
const { root } = require('./constants');

function getLernaUpdateJson() {
  let cache;

  return (async () => {
    if (cache) return cache;

    const result = await exec('lerna updated --json', {
      env: npmRunPath.env(),
      cwd: root
    });
  
    cache = JSON.parse(result.stdout);

    return cache;
  })();
}

exports.hasUpdatedPackages = async () => {
  const updatedPkgs = await getLernaUpdateJson();
  return !!updatedPkgs.length;
};

exports.getUpdatedPackages = async () => {
  const pkgs = await getLernaUpdateJson();
  return pkgs.map(result => result.name);
};
