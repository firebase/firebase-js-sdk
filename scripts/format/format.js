/**
 * @license
 * Copyright 2021 Google LLC
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

const { doPrettier } = require('./prettier');
const { doLicense } = require('./license');
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

const format = async () => {
  try {
    const hasDiff = !!(await git.diff());

    if (hasDiff) {
      console.error(notCleanTreeString);
      return process.exit(1);
    }

    const headSha = process.env.GITHUB_PULL_REQUEST_HEAD_SHA || 'HEAD';
    const baseSha = process.env.GITHUB_PULL_REQUEST_BASE_SHA || 'master';
    const diff = await git.diff([
      '--name-only',
      '--diff-filter=d',
      baseSha,
      headSha
    ]);
    const changedFiles = diff.split('\n');

    // Style the code
    await doPrettier(changedFiles);

    // Validate License headers exist
    await doLicense(changedFiles);

    process.exit();
  } catch (err) {
    console.error(chalk`
{red Formatting failed, error body below}

`);
    console.error(err);
    return process.exit(1);
  }
};

format();
