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

interface TestTask {
  pkgName: string;
  reason: TestReason;
}

interface TestReason {
  code: TestReasonCode;
  dependencies?: string[]; // populated when the code is Dependent
}

enum TestReasonCode {
  Changed = 'changed',
  Dependent = 'dependent',
  Global = 'global'
}

const root = resolve(__dirname, '..');
const git = simpleGit(root);

// use test:ci command in CI
const testCommand = !!process.env.CI ? 'test:ci' : 'test';

/**
 * Changes to these files warrant running all tests.
 */
const testTriggerFiles = [
  // Global dependency changes.
  'yarn.lock',
  // Test/compile configs.
  'config/karma.base.js',
  'config/mocha.browser.opts',
  'config/mocharc.node.js',
  'config/tsconfig.base.json',
  'config/webpack.test.js',
  'config/firestore.rules',
  'scripts/emulator-testing/emulators/firestore-emulator.ts',
  'scripts/emulator-testing/emulators/emulator.ts',
  'scripts/emulator-testing/firestore-test-runner.ts'
];

/**
 * packages to test
 */
const firestorePackages = [
  '@firebase/firestore',
  'firebase-firestore-integration-test'
];

function createTestTask(
  pkgName: string,
  reasonCode = TestReasonCode.Global
): TestTask {
  return {
    pkgName,
    reason: {
      code: reasonCode
    }
  };
}

/**
 * Identify modified packages that require tests.
 */
async function getTestTasks(): Promise<TestTask[]> {
  const packageInfo = JSON.parse(
    (await exec('npx lerna ls --json', { cwd: root })).stdout
  );
  const depGraph = JSON.parse(
    (await exec('npx lerna ls --graph', { cwd: root })).stdout
  );
  const diff = await git.diff(['--name-only', 'origin/master...HEAD']);
  const changedFiles = diff.split('\n');
  const testTasks: TestTask[] = [];
  for (const filename of changedFiles) {
    // Files that trigger all tests.
    if (testTriggerFiles.includes(filename)) {
      console.log(
        chalk`{blue Running Firestore tests because ${filename} was modified.}`
      );
      return firestorePackages.map(name => createTestTask(name));
    }

    // Check for changed files inside package dirs.
    const match = filename.match('^(packages(-exp)?/[a-zA-Z0-9-]+)/.*');
    if (match && match[1]) {
      const { name: pkgName } = require(resolve(
        root,
        match[1],
        'package.json'
      ));
      if (pkgName === 'firebase-firestore-integration-test') {
        testTasks.push(createTestTask(pkgName, TestReasonCode.Changed));
      } else if (pkgName === '@firebase/firestore') {
        return firestorePackages.map(name => createTestTask(name));
      } else {
        // check if any package Firestore depends on has changed
        const firestoreDependencies = depGraph['@firebase/firestore'];

        if (firestoreDependencies.includes(pkgName)) {
          return firestorePackages.map(name => createTestTask(name));
        }
      }
    }
  }

  if (testTasks.length === 0) {
    console.log(
      chalk`{green No changes detected that would trigger firestore tests. Skipping firestore tests.}`
    );
  }

  return testTasks;
}

async function main() {
  try {
    const tasks = await getTestTasks();

    if (tasks.length === 0) {
      process.exit(0);
    }

    const lernaCmds = ['lerna', 'run', '--concurrency', '4', '--stream'];
    console.log(chalk`{blue Running tests in:}`);
    for (const { pkgName, reason } of tasks) {
      if (reason.code === TestReasonCode.Changed) {
        console.log(chalk`{yellow ${pkgName} (contains modified files)}`);
      } else {
        console.log(chalk`{yellow ${pkgName} (depends on modified files)}`);
      }
      lernaCmds.push('--scope');
      lernaCmds.push(pkgName);
    }
    lernaCmds.push(testCommand);

    await spawn('npx', lernaCmds, { stdio: 'inherit', cwd: root });
    process.exit();
  } catch (e) {
    console.error(chalk`{red ${e}}`);
    process.exit(1);
  }
}

main();
