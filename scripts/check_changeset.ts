/**
 * @license
 * Copyright 2020 Google LLC
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

import { resolve } from 'path';
import chalk from 'chalk';
import simpleGit from 'simple-git/promise';
import fs from 'mz/fs';

const root = resolve(__dirname, '..');
const git = simpleGit(root);

/**
 * Identify modified packages.
 */
async function getDiffData(): Promise<{
  changedPackages: string[];
  changesetFile: string;
} | null> {
  const diff = await git.diff(['--name-only', 'origin/master...HEAD']);
  const changedFiles = diff.split('\n');
  let changesetFile = '';
  const changedPackagesMap = new Set();
  for (const filename of changedFiles) {
    // Check for an existing .changeset
    const changesetMatch = filename.match(/^\.changeset\/[a-zA-Z-]+\.md/);
    if (changesetMatch) {
      changesetFile = changesetMatch[0];
    }
    // Check for changed files inside package dirs.
    const pkgMatch = filename.match('^(packages(-exp)?/[a-zA-Z0-9-]+)/.*');
    if (pkgMatch && pkgMatch[1]) {
      const changedPackage = require(resolve(
        root,
        pkgMatch[1],
        'package.json'
      ));
      if (changedPackage) {
        // Add the package itself.
        changedPackagesMap.add(changedPackage.name);
      }
    }
  }
  if (!changesetFile || Object.keys(changedPackagesMap).length === 0) {
    return null;
  }
  return { changedPackages: Object.keys(changedPackagesMap), changesetFile };
}

async function parseChangesetFile(changesetFile: string) {
  const fileText: string = await fs.readFile(changesetFile, 'utf8');
  const fileParts = fileText.split('---\n');
  const packageLines = fileParts[1].split('\n');
  const changesetPackages = packageLines
    .filter(line => line)
    .map(line => {
      const [packageName] = line.split(':');
      return packageName.replace(/'/g, '');
    });
  return changesetPackages;
}

async function main() {
  try {
    const diffData = await getDiffData();
    if (diffData == null) {
      process.exit();
    } else {
      const { changedPackages, changesetFile } = diffData;
      const changesetPackages = await parseChangesetFile(changesetFile);
      const missingPackages = changedPackages.filter(
        changedPkg => !changesetPackages.includes(changedPkg)
      );
      if (missingPackages.length > 0) {
        /**
         * Sets Github Actions output for a step. Pass missing package list to next
         * step. See:
         * https://github.com/actions/toolkit/blob/master/docs/commands.md#set-outputs
         */
        console.log(
          `::set-output name=MISSING_PACKAGES::${missingPackages
            .map(pkg => `- ${pkg}`)
            .join('%0A')}`
        );
      }
      process.exit();
    }
  } catch (e) {
    console.error(chalk`{red ${e}}`);
    process.exit(1);
  }
}

main();
