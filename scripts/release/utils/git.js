const simpleGit = require('simple-git/promise');
const { root } = require('./constants');
const git = simpleGit(root);
const { exec } = require('child-process-promise');

exports.cleanTree = async () => {
  await exec('git clean -xdf');
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
