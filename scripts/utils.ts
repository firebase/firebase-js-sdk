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

import { dirname, resolve } from 'path';
import simpleGit from 'simple-git/promise';
import { exec } from 'child-process-promise';
import { readFile as _readFile } from 'fs';
import { promisify } from 'util';

const readFile = promisify(_readFile);

export const projectRoot = dirname(resolve(__dirname, '../package.json'));

export async function getChangedFiles(): Promise<string[]> {
  console.log(projectRoot);
  const git = simpleGit(projectRoot);
  const diff = await git.diff(['--name-only', 'origin/master...HEAD']);
  const changedFiles = diff.split('\n');

  return changedFiles;
}

export async function getChangedPackages(
  changedFiles: string[]
): Promise<string[]> {
  const changedPackages = new Set<string>();
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

export async function getPackageInfo(
  { includePrivate } = { includePrivate: true }
) {
  const packageInfo = JSON.parse(
    (await exec(`npx lerna ls ${includePrivate ? '-la' : ''} --json`)).stdout
  );

  return packageInfo;
}

export async function readPackageJson(packagePath: string) {
  /**
   * Not using require here because require caches the file
   * in memory, so it may not contain the latest updates made by scripts
   */
  return JSON.parse(await readFile(`${packagePath}/package.json`, 'utf8'));
}
