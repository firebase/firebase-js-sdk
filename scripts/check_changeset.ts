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

const { resolve } = require('path');
const { spawn, exec } = require('child-process-promise');
const chalk = require('chalk');
const simpleGit = require('simple-git/promise');
const fs = require('mz/fs');

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
  const changedPackagesMap: { [key: string]: boolean } = {};
  console.log(changedFiles);
  for (const filename of changedFiles) {
    // Check for an existing .changeset
    const changesetMatch = filename.match(/^\.\/changeset\/[a-zA-Z-]+\.md/);
    console.log(changesetMatch);
    if (changesetMatch) {
      changesetFile = changesetMatch[0];
    } else {
      return null;
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
        changedPackagesMap[pkgMatch[1]] = true;
      }
    }
  }
  if (Object.keys(changedPackagesMap).length === 0) {
    return null;
  }
  return { changedPackages: Object.keys(changedPackagesMap), changesetFile };
}

async function parseChangesetFile(changesetFile: string) {
  const fileText: string = await fs.readFile(changesetFile, 'utf8');
  const fileParts = fileText.split('---\n');
  const packageLines = fileParts[1].split('\n');
  const changesetPackages = packageLines.map(line => {
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
      const changesetPackages = parseChangesetFile(changesetFile);
      console.log(changedPackages);
      console.log(changesetPackages);
    }
  } catch (e) {
    console.error(chalk`{red ${e}}`);
    process.exit(1);
  }
}

main();
