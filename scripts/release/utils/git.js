const simpleGit = require('simple-git/promise');
const { root } = require('./constants');
const git = simpleGit(root);
const { exec } = require('child-process-promise');
const ora = require('ora');

exports.cleanTree = async () => {
  const spinner = ora(' Cleaning git tree').start();
  await exec('git clean -xdf', {
    cwd: root
  });
  spinner.stopAndPersist({
    symbol: '✅'
  });
}

exports.commitAndTag = async (updatedVersions, isPrerelease) => {
  await git.add('*/package.json');
  await git.commit(
    isPrerelease
      ? 'Publish Prerelease'
      : 'Publish'
  );
  Object.keys(updatedVersions)
    .map(name => ({ name, version: updatedVersions[name] }))
    .forEach(async ({ name, version }) => {
      await git.addTag(`${name}@${version}`);
    });
};

exports.pushUpdatesToGithub = async () => {
  await git.push('origin', 'master', {
    '--follow-tags': null
  });
}
