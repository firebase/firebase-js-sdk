/**
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

// Computed Deps
const root = resolve(__dirname, '../..');
const git = simpleGit(root);

async function doPrettierCommit() {
  const stylingSpinner = ora(' Formatting code with prettier').start();
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
  stylingSpinner.stopAndPersist({
    symbol: '✅'
  });

  const hasDiff = await git.diff();

  if (!hasDiff) return;

  const gitSpinner = ora(' Creating automated style commit').start();
  await git.add('.');

  await git.commit('[AUTOMATED]: Prettier Code Styling');
  gitSpinner.stopAndPersist({
    symbol: '✅'
  });
}

module.exports = {
  doPrettierCommit
};
