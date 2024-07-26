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

import { doPrettier } from './prettier';
import { doLicense } from './license';
import { resolve } from 'path';
import simpleGit from 'simple-git';
import chalk from 'chalk';
import glob from 'glob';
import { join } from 'path';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

// Computed Deps
const root = resolve(__dirname, '../..');
const git = simpleGit(root);

const { path: targetPath, all: runOnAll } = yargs(hideBin(process.argv))
  .option('all', {
    describe: 'Run on all js/ts files in repo',
    type: 'boolean'
  })
  .option('path', {
    describe: 'Specific directory to run on',
    type: 'string'
  })
  .help()
  .usage(
    `Runs prettier formatting and updates license headers. ` +
      `If no arguments are provided it will run formatting on any ` +
      `files changed since ch-branchswitch-main.`
  )
  .parseSync();

const format = async () => {
  let changedFiles: string[] | undefined;
  try {
    if (!runOnAll) {
      // If a file pattern is provided, get the individual files.
      if (targetPath) {
        changedFiles = await new Promise(resolve => {
          glob(join(targetPath, '/**/*'), (err, res) => resolve(res));
        });
      } else {
        // Otherwise get all files changed since ch-branchswitch-main.
        const baseSha = process.env.GITHUB_PULL_REQUEST_BASE_SHA || 'ch-branchswitch-main';
        const diff = await git.diff([
          '--name-only',
          '--diff-filter=d',
          baseSha
        ]);
        changedFiles = diff.split('\n');

        if (changedFiles.length === 0) {
          console.log(chalk`{green No files changed since ${baseSha}.}`);
          return;
        }
      }

      // Only run on .js or .ts files.
      changedFiles = changedFiles!.filter(line => line.match(/\.(js|ts)$/));

      if (changedFiles.length === 0) {
        console.log(chalk`{green No .js or .ts files found in list.}`);
        return;
      }
    }

    await doPrettier(changedFiles);

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
