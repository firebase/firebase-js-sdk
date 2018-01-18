const simpleGit = require('simple-git/promise');
const { root } = require('./constants');
const git = simpleGit(root);

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
