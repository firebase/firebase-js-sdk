/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const { resolve } = require('path');
const { spawn } = require('child-process-promise');
const fs = require('mz/fs');
const glob = require('glob');
const simpleGit = require('simple-git/promise');
const ora = require('ora');
const chalk = require('chalk');

// Computed Deps
const root = resolve(__dirname, '../..');
const git = simpleGit(root);
const packageJson = require(root + '/package.json');

function checkVersion() {
  return new Promise((resolvePromise, reject) => {
    const versionCheckCommand = spawn('prettier', ['--version'], {
      stdio: ['ignore', 'pipe', process.stderr],
      cwd: root,
      env: {
        PATH: `${resolve(root, 'node_modules/.bin')}:${process.env.PATH}`
      }
    }).catch(e => reject(e));
    versionCheckCommand.childProcess.stdout.on('data', data => {
      const runtimeVersion = data.toString().trim();
      const packageVersion = packageJson.devDependencies.prettier;
      if (packageVersion !== runtimeVersion) {
        const mismatchText =
          `Installed version of prettier (${runtimeVersion}) does not match ` +
          `required version (${packageVersion}).`;
        const versionMismatchMessage = chalk`
          {red ${mismatchText}}
          
          {yellow Please re-run {reset 'yarn'} from the root of the repo and try again.}
          `;
        reject(versionMismatchMessage);
      }
      resolvePromise();
    });
  });
}

async function doPrettierCommit() {
  try {
    await checkVersion();
  } catch (e) {
    console.error(e);
    return process.exit(1);
  }
  const diff = await git.diff(['--name-only', 'origin/master...HEAD']);
  // Only run on .js or .ts files.
  const targetFiles = diff.split('\n').filter(line => line.match(/(js|ts)$/));
  if (targetFiles.length === 0) return;

  const stylingSpinner = ora(
    ` Formatting ${targetFiles.length} files with prettier`
  ).start();
  await spawn(
    'prettier',
    ['--config', `${resolve(root, '.prettierrc')}`, '--write', ...targetFiles],
    {
      stdio: ['ignore', 'ignore', process.stderr],
      cwd: root,
      env: {
        PATH: `${resolve(root, 'node_modules/.bin')}:${process.env.PATH}`
      }
    }
  );
  stylingSpinner.stopAndPersist({
    symbol: '✅'
  });

  const hasDiff = await git.diff();

  if (!hasDiff) return;

  const gitSpinner = ora(' Creating automated style commit').start();
  await git.add(targetFiles);

  await git.commit('[AUTOMATED]: Prettier Code Styling');
  gitSpinner.stopAndPersist({
    symbol: '✅'
  });
}

module.exports = {
  doPrettierCommit
};
