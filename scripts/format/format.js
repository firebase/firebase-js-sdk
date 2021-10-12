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

const format = async () => {
  try {
    const baseSha = process.env.GITHUB_PULL_REQUEST_BASE_SHA || 'master';
    const diff = await git.diff(['--name-only', '--diff-filter=d', baseSha]);
    const changedFiles = diff.split('\n');

    if (changedFiles.length === 0) {
      console.log(chalk`{green No files changed since ${baseSha}.}`);
      return;
    }

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
