/**
 * @license
 * Copyright 2017 Google LLC
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
const ora = require('ora');
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
  try {
    const hasDiff = !!(await git.diff());

    if (hasDiff) {
      console.error(notCleanTreeString);
      return process.exit(1);
    }

    // Try to get most current origin/master.
    const fetchSpinner = ora(
      ' Fetching latest version of master branch.'
    ).start();
    try {
      await git.fetch('origin', 'master');
      fetchSpinner.stopAndPersist({
        symbol: '✅'
      });
    } catch (e) {
      fetchSpinner.stopAndPersist({
        symbol: '⚠️'
      });
      console.warn(
        chalk`\n{yellow} Unable to fetch latest version of master, diff may be stale.`
      );
    }

    // Diff staged changes against origin/master...HEAD (common ancestor of HEAD and origin/master).
    const mergeBase = await git.raw(['merge-base', 'origin/master', 'HEAD']);
    let diffOptions = ['--name-only', '--diff-filter=d', '--cached'];
    if (mergeBase) {
      diffOptions.push(mergeBase.trim());
    } else {
      diffOptions.push('origin/master');
    }
    const diff = await git.diff(diffOptions);
    const changedFiles = diff.split('\n');

    // Style the code
    await doPrettier(changedFiles);

    // Validate License headers exist
    await doLicense(changedFiles);

    // Diff staged changes against last commit. Don't do an empty commit.
    const postDiff = await git.diff(['--cached']);
    if (!postDiff) {
      console.error(chalk`
{red Staged files are identical to previous commit after running formatting
steps. Skipping commit.}

`);
      return process.exit(1);
    }

    console.log(chalk`
Pre-Push Validation Succeeded

`);
    process.exit();
  } catch (err) {
    console.error(chalk`
{red Pre-Push Validation Failed, error body below}

`);
    console.error(err);
    return process.exit(1);
  }
})();
