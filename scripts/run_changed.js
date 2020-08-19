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

const root = resolve(__dirname, '..');
const git = simpleGit(root);

// use test:ci command in CI
const testCommand = !!process.env.CI ? 'test:ci' : 'test';

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
  'config/mocharc.node.js',
  'config/tsconfig.base.json',
  'config/webpack.test.js',
  'config/firestore.rules',
  'config/database.rules.json'
];

/**
 * Always run tests in these paths.
 */
const alwaysRunTestPackages = [
  // These tests are very fast.
  'firebase-namespace-integration-test'
];

/**
 * These files trigger tests in other dirs
 */
const specialPaths = {
  // 'scripts/emulator-testing/emulators/firestore-emulator.ts': [
  //   '@firebase/firestore'
  // ],
  'scripts/emulator-testing/emulators/database-emulator.ts': [
    '@firebase/database'
  ],
  'scripts/emulator-testing/emulators/emulator.ts': [
    // '@firebase/firestore',
    '@firebase/database'
  ],
  // 'scripts/emulator-testing/firestore-test-runner.ts': ['@firebase/firestore'],
  'scripts/emulator-testing/database-test-runner.ts': ['@firebase/database']
  // 'packages/firestore': ['firebase-firestore-integration-test']
};

/**
 * Ignore firestore packages. They take a lot of time to run, so we run them in a separate workflow
 */
const ignoredPackages = [
  '@firebase/firestore',
  'firebase-firestore-integration-test'
];

/**
 * Identify modified packages that require tests.
 */
async function getChangedPackages() {
  const packageInfo = JSON.parse(
    (await exec('npx lerna ls --json', { cwd: root })).stdout
  );
  const depGraph = JSON.parse(
    (await exec('npx lerna ls --graph', { cwd: root })).stdout
  );
  const diff = await git.diff(['--name-only', 'origin/master...HEAD']);
  const changedFiles = diff.split('\n');
  const changedPackages = {};
  for (const filename of changedFiles) {
    console.log(filename);
    // Files that trigger full test suite.
    if (fullTestTriggerFiles.includes(filename)) {
      console.log(
        chalk`{blue Running all tests because ${filename} was modified.}`
      );
      return { testAll: true };
    }
    // Files outside a package dir that should trigger its tests.
    const matchingSpecialPaths = Object.keys(specialPaths).filter(path =>
      filename.startsWith(path)
    );
    for (const matchingSpecialPath of matchingSpecialPaths) {
      for (const targetPackage of specialPaths[matchingSpecialPath]) {
        if (!changedPackages[targetPackage]) {
          changedPackages[targetPackage] = 'dependency';
        }
      }
    }
    // Check for changed files inside package dirs.
    const match = filename.match('^(packages(-exp)?/[a-zA-Z0-9-]+)/.*');
    if (match && match[1]) {
      const changedPackage = require(resolve(root, match[1], 'package.json'));
      if (changedPackage && !ignoredPackages.includes(changedPackage.name)) {
        // Add the package itself.
        changedPackages[changedPackage.name] = 'direct';
        // Add packages that depend on it.
        for (const package in depGraph) {
          if (depGraph[package].includes(changedPackage.name)) {
            const depData = packageInfo.find(item => item.name === package);
            if (depData) {
              const depPkgJson = require(resolve(
                depData.location,
                'package.json'
              ));
              if (depPkgJson) {
                if (!changedPackages[depPkgJson.name]) {
                  changedPackages[depPkgJson.name] = 'dependency';
                }
              }
            }
          }
        }
      }
    }
  }
  if (Object.keys(changedPackages).length > 0) {
    return {
      testAll: false,
      changedPackages
    };
  } else {
    console.log(
      chalk`{green No changes detected in any package. Skipping all package-specific tests.}`
    );
    return { testAll: false };
  }
}

async function main() {
  try {
    const { testAll, changedPackages = {} } = await getChangedPackages();
    if (testAll) {
      const lernaCmd = ['lerna', 'run', '--concurrency', '4'];
      // ignore packages
      for (const pkg of ignoredPackages) {
        lernaCmd.push('--ignore', pkg);
      }
      await spawn('yarn', lernaCmd, {
        stdio: 'inherit'
      });
    } else {
      console.log(chalk`{blue Running tests in:}`);
      for (const packageName of alwaysRunTestPackages) {
        // array
        console.log(chalk`{green ${packageName} (always runs)}`);
      }
      for (const packageName in changedPackages) {
        // obj
        if (changedPackages[packageName] === 'direct') {
          console.log(chalk`{yellow ${packageName} (contains modified files)}`);
        } else {
          console.log(
            chalk`{yellow ${packageName} (depends on modified files)}`
          );
        }
      }

      const lernaCmd = ['lerna', 'run', '--concurrency', '4'];
      const packagesToRun = alwaysRunTestPackages.concat(
        Object.keys(changedPackages)
      );
      for (const packageToRun of packagesToRun) {
        lernaCmd.push('--scope');
        lernaCmd.push(packageToRun);
      }
      lernaCmd.push(testCommand);
      await spawn('npx', lernaCmd, { stdio: 'inherit', cwd: root });
      process.exit();
    }
  } catch (e) {
    console.error(chalk`{red ${e}}`);
    process.exit(1);
  }
}

main();
