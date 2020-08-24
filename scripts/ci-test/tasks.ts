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
import { exec } from 'child-process-promise';
import chalk from 'chalk';
import simpleGit from 'simple-git/promise';
import { TestConfig } from './testConfig';
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
  'packages/firestore': ['firebase-firestore-integration-test'],
  'packages/messaging': ['firebase-messaging-integration-test']
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
  let testTasks: TestTask[] = [];
  for (const filename of changedFiles) {
    // Files that trigger full test suite.
    if (fullTestTriggerFiles.includes(filename)) {
      console.log(
        chalk`{blue Running all tests because ${filename} was modified.}`
      );
      // run tests in all packages
      testTasks = allPackageNames.map(pkgName => createTestTask(pkgName));
      break;
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

export function filterTasks(
  tasks: TestTask[],
  { onlyIncludePackages, alwaysIncludePackages, ignorePackages }: TestConfig
): TestTask[] {
  let filteredTasks: TestTask[] = [];

  // `ignorePacakges` and `onlyIncludePackages` should not be defined at same time,
  // `ignorePacakges` will be ignored if that happens
  if (onlyIncludePackages) {
    filteredTasks = tasks.filter(t => onlyIncludePackages.includes(t.pkgName));
  } else if (ignorePackages) {
    filteredTasks = tasks.filter(t => !ignorePackages.includes(t.pkgName));
  }

  if (alwaysIncludePackages) {
    for (const pkg of alwaysIncludePackages) {
      if (!filteredTasks.find(t => t.pkgName === pkg)) {
        filteredTasks.push(createTestTask(pkg));
      }
    }
  }

  return filteredTasks;
}
