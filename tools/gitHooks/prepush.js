const { doPrettierCommit } = require('./prettier');
const { resolve } = require('path');
const simpleGit = require('simple-git/promise');
const chalk = require('chalk');

// Computed Deps
const root = resolve(__dirname, '../..');
const git = simpleGit(root);

const notCleanTreeString = chalk`
{red Can only push a clean git tree. Please stash your changes and try again}

{yellow You can stash your changes by running:}
$ git stash -u

{yellow You can then unstash your changes by running:}
$ git stash pop
`;

(async () => {
  const hasDiff = !!await git.diff();

  if (hasDiff) {
    console.error(notCleanTreeString);
    return process.exit(1);
  }

  // Style the code
  await doPrettierCommit();
})();
