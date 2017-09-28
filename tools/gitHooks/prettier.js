const { resolve } = require('path');
const { spawn } = require('child-process-promise');
const fs = require('mz/fs');
const glob = require('glob');
const simpleGit = require('simple-git/promise');
const ora = require('ora');

// Computed Deps
const root = resolve(__dirname, '../..');
const git = simpleGit(root);

async function doPrettierCommit() {
  const stylingSpinner = ora('Formatting code with prettier').start();
  await spawn(
    'prettier',
    ['--config', `${resolve(root, '.prettierrc')}`, '--write', '**/*.{ts,js}'],
    {
      stdio: ['ignore', 'ignore', process.stderr],
      cwd: root,
      env: {
        PATH: `${resolve(root, 'node_modules/.bin')}:${process.env.PATH}`
      }
    }
  );
  stylingSpinner.stop();

  const hasDiff = await git.diff();

  if (!hasDiff) return;

  const gitSpinner = ora('Creating automated style commit').start();
  await git.add('.');

  await git.commit('[AUTOMATED]: Prettier Code Styling');
  gitSpinner.stop();
}

module.exports = {
  doPrettierCommit
};
