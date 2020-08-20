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
import { spawn, exec } from 'child-process-promise';
import chalk from 'chalk';
import simpleGit from 'simple-git/promise';
const root = resolve(__dirname, '../..');
const git = simpleGit(root);

export interface TestTask {
  pkgName: string;
  reason: TestReason;
}

export enum TestReason {
  Changed = 'changed',
  Dependent = 'dependent',
  Global = 'global'
}

export function createTestTask(
  pkgName: string,
  reason = TestReason.Global
): TestTask {
  return {
    pkgName,
    reason
  };
}

// use test:ci command in CI
// const testCommand = !!process.env.CI ? 'test:ci' : 'test';
const testCommand = 'test:ci';

/**
 * Changes to these files warrant running all tests.
 */
const fullTestTriggerFiles = [
  // Global dependency changes.
  'yarn.lock',
  // Test/compile/lint configs.
  'config/karma.base.js',
  'config/mocha.browser.opts',
  'config/mocharc.node.js',
  'config/tsconfig.base.json',
  'config/webpack.test.js',
  'config/firestore.rules',
  'config/database.rules.json'
];

/**
 * These files trigger tests in other dirs
 */
const specialPaths = {
  'scripts/emulator-testing/emulators/firestore-emulator.ts': [
    '@firebase/firestore'
  ],
  'scripts/emulator-testing/emulators/database-emulator.ts': [
    '@firebase/database'
  ],
  'scripts/emulator-testing/emulators/emulator.ts': [
    '@firebase/firestore',
    '@firebase/database'
  ],
  'scripts/emulator-testing/firestore-test-runner.ts': ['@firebase/firestore'],
  'scripts/emulator-testing/database-test-runner.ts': ['@firebase/database'],
  'packages/firestore': ['firebase-firestore-integration-test']
};

/**
 * Identify modified packages that require tests.
 */
export async function getTestTasks(): Promise<TestTask[]> {
  const packageInfo: any[] = JSON.parse(
    (await exec('npx lerna la --json', { cwd: root })).stdout
  );

  const allPackageNames = packageInfo.map(info => info.name);

  const depGraph: { [key: string]: any } = JSON.parse(
    (await exec('npx lerna ls --graph', { cwd: root })).stdout
  );
  const diff = await git.diff(['--name-only', 'origin/master...HEAD']);
  const changedFiles = diff.split('\n');
  const testTasks: TestTask[] = [];
  for (const filename of changedFiles) {
    // Files that trigger full test suite.
    if (fullTestTriggerFiles.includes(filename)) {
      console.log(
        chalk`{blue Running all tests because ${filename} was modified.}`
      );
      return allPackageNames.map(pkgName => createTestTask(pkgName));
    }
    // Files outside a package dir that should trigger its tests.
    const specialPathKeys = Object.keys(specialPaths) as Array<
      keyof typeof specialPaths
    >;
    const matchingSpecialPaths = specialPathKeys.filter(path =>
      filename.startsWith(path)
    );
    for (const matchingSpecialPath of matchingSpecialPaths) {
      for (const targetPackage of specialPaths[matchingSpecialPath]) {
        if (!testTasks.find(t => t.pkgName === targetPackage)) {
          testTasks.push(createTestTask(targetPackage, TestReason.Dependent));
        }
      }
    }
    // Check for changed files inside package dirs.
    const match = filename.match('^(packages(-exp)?/[a-zA-Z0-9-]+)/.*');
    if (match && match[1]) {
      const changedPkg = require(resolve(root, match[1], 'package.json'));
      if (changedPkg) {
        const changedPkgName = changedPkg.name;
        const task = testTasks.find(t => t.pkgName === changedPkgName);

        if (task) {
          task.reason = TestReason.Changed;
        } else {
          testTasks.push(createTestTask(changedPkgName, TestReason.Changed));
        }

        // Add packages that depend on it.
        for (const pkgName of Object.keys(depGraph)) {
          if (depGraph[pkgName].includes(changedPkg.name)) {
            const depData = packageInfo.find(item => item.name === pkgName);
            if (depData) {
              const depPkgJson = require(resolve(
                depData.location,
                'package.json'
              ));
              if (depPkgJson) {
                if (!testTasks.find(t => t.pkgName === depPkgJson.name)) {
                  testTasks.push(
                    createTestTask(depPkgJson.name, TestReason.Dependent)
                  );
                }
              }
            }
          }
        }
      }
    }
  }
  if (testTasks.length === 0) {
    console.log(
      chalk`{green No changes detected in any package. No test tasks is created }`
    );
  }

  return testTasks;
}

export async function runTests(testTasks: TestTask[]) {
  try {
    if (testTasks.length === 0) {
      chalk`{green No test tasks. Skipping all tests }`;
      process.exit(0);
    }

    const lernaCmd = ['lerna', 'run', '--concurrency', '4'];
    console.log(chalk`{blue Running tests in:}`);
    for (const task of testTasks) {
      if (task.reason === TestReason.Changed) {
        console.log(chalk`{yellow ${task.pkgName} (contains modified files)}`);
      } else if (task.reason === TestReason.Dependent) {
        console.log(
          chalk`{yellow ${task.pkgName} (depends on modified files)}`
        );
      } else {
        console.log(chalk`{yellow ${task.pkgName} (running all tests)}`);
      }
      lernaCmd.push('--scope');
      lernaCmd.push(task.pkgName);
    }

    lernaCmd.push(testCommand);
    await spawn('npx', lernaCmd, { stdio: 'inherit', cwd: root });
    process.exit(0);
  } catch (e) {
    console.error(chalk`{red ${e}}`);
    process.exit(1);
  }
}
