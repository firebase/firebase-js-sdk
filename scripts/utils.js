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

const { dirname, resolve } = require('path');
const simpleGit = require('simple-git/promise');
const { exec } = require('child-process-promise');

const projectRoot = dirname(resolve(__dirname, '../package.json'));
exports.projectRoot = projectRoot;

async function getChangedFiles() {
  console.log(projectRoot);
  const git = simpleGit(projectRoot);
  const diff = await git.diff(['--name-only', 'origin/master...HEAD']);
  const changedFiles = diff.split('\n');

  return changedFiles;
}
exports.getChangedFiles = getChangedFiles;

async function getChangedPackages(changedFiles) {
  const changedPackages = new Set();
  const files = changedFiles || (await getChangedFiles());
  for (const filename of files) {
    // Check for changed files inside package dirs.
    const match = filename.match('^(packages(-exp)?/[a-zA-Z0-9-]+)/.*');
    if (match && match[1]) {
      const changedPackage = require(resolve(
        projectRoot,
        match[1],
        'package.json'
      ));
      changedPackages.add(changedPackage.name);
    }
  }
  return Array.from(changedPackages.values());
}
exports.getChangedPackages = getChangedPackages;

exports.getPackageInfo = async function(
  { includePrivate } = { includePrivate: true }
) {
  const packageInfo = JSON.parse(
    (await exec(`npx lerna ls ${includePrivate ? '-la' : ''} --json`)).stdout
  );

  return packageInfo;
};
