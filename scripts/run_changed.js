/**
 * @license
 * Copyright 2019 Google Inc.
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
const simpleGit = require('simple-git/promise');
const root = resolve(__dirname, '..');
const git = simpleGit(root);

/**
 * Runs tests on packages changed (in comparison to origin/master...HEAD)
 */

async function runTestsOnChangedPackages() {
  const diff = await git.diff(['--name-only', 'origin/master...HEAD']);
  const changedFiles = diff.split('\n');
  const changedPackages = {};
  for (const filename of changedFiles) {
    const match = filename.match('^(packages/[a-zA-Z0-9-]+)/.*');
    if (match && match[1]) {
      const pkg = require(resolve(root, match[1], 'package.json'));
      if (pkg && pkg.scripts.test) {
        changedPackages[match[1]] = true;
      }
    }
  }
  await runTests(Object.keys(changedPackages));
}

/**
 * Runs `yarn test` in all dirs in pathList.
 * @param {Array<string>} pathList
 */
async function runTests(pathList) {
  if (!pathList) return;
  for (const testPath of pathList) {
    try {
      await spawn('yarn', ['--cwd', testPath, 'test'], {
        stdio: 'inherit'
      });
    } catch (e) {
      throw new Error(`Error running tests in ${testPath}.`);
    }
  }
}

/**
 * These are short, always run them.
 */
async function runIntegrationTests() {
  await runTests([
    'integration/browserify',
    'integration/firebase-typings',
    'integration/typescript',
    'integration/webpack'
  ]);
}

async function main() {
  try {
    await runIntegrationTests();
    await runTestsOnChangedPackages();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
