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
  const spinner = ora('Formatting code with prettier').start();
  await spawn(
    'prettier',
    ['--config', `${resolve(root, '.prettierrc')}`, '--write', '**/*.{ts,js}'],
    {
      stderr: 'inherit',
      cwd: root,
      env: {
        PATH: `${resolve(root, 'node_modules/.bin')}:${process.env.PATH}`
      }
    }
  );
  spinner.stop();

  const hasDiff = await git.diff();

  if (!hasDiff) return;

  await git.add('.');

  await git.commit('[AUTOMATED]: Prettier Code Styling');
}

module.exports = {
  doPrettierCommit
};
