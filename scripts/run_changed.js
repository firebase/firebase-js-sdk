/**
 * @license
 * Copyright 2020 Google Inc.
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
const chalk = require('chalk');
const simpleGit = require('simple-git/promise');

const root = resolve(__dirname, '..');
const git = simpleGit(root);

/**
 * Changes to these files warrant running all tests.
 */
const fullTestTriggerFiles = [
  // Global dependency changes.
  'package.json',
  'yarn.lock',
  // Test/compile/lint configs.
  'config/karma.base.js',
  'config/.eslintrc.js',
  'config/mocha.browser.opts',
  'config/mocha.node.opts',
  'config/tsconfig.base.json',
  'config/webpack.test.js',
  'config/firestore.rules',
  'config/database.rules.json'
];

/**
 * Always run tests in these paths.
 */
const alwaysRunTestPaths = [
  // These tests are very fast.
  'integration/browserify',
  'integration/firebase-typings',
  'integration/typescript',
  'integration/webpack'
];

/**
 * Identify modified packages that require tests.
 */
async function getChangedPackages() {
  const diff = await git.diff(['--name-only', 'origin/master...HEAD']);
  const changedFiles = diff.split('\n');
  const changedPackages = {};
  for (const filename of changedFiles) {
    if (fullTestTriggerFiles.includes(filename)) {
      console.log(
        chalk`{blue Running all tests because ${filename} was modified.}`
      );
      return { testAll: true };
    }
    const match = filename.match('^(packages/[a-zA-Z0-9-]+)/.*');
    if (match && match[1]) {
      const pkg = require(resolve(root, match[1], 'package.json'));
      if (pkg && pkg.scripts.test) {
        changedPackages[match[1]] = true;
      }
    }
  }
  if (Object.keys(changedPackages).length > 0) {
    return { testAll: false, packageDirs: Object.keys(changedPackages) };
  } else {
    console.log(
      chalk`{green No changes detected in any package. Skipping all package-specific tests.}`
    );
    return { testAll: false, packageDirs: [] };
  }
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

async function main() {
  try {
    const { testAll, packageDirs = [] } = await getChangedPackages();
    if (testAll) {
      await spawn('yarn', ['test'], {
        stdio: 'inherit'
      });
    } else {
      console.log(chalk`{blue Running tests in:}`);
      for (const filename of alwaysRunTestPaths) {
        console.log(chalk`{green ${filename} (always runs)}`);
      }
      for (const filename of packageDirs) {
        console.log(chalk`{yellow ${filename} (contains modified files)}`);
      }
      await runTests(alwaysRunTestPaths);
      await runTests(packageDirs);
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
