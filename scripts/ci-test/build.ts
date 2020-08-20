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

import { TestTask, TestReason } from './run_changed';
import { spawn } from 'child-process-promise';
import chalk from 'chalk';
import { resolve } from 'path';
const root = resolve(__dirname, '../..');

export async function buildForTests(
  testTasks: TestTask[],
  buildAppExp = false
) {
  try {
    if (testTasks.length === 0) {
      chalk`{green No test tasks. Skipping all tests }`;
    }

    // hack to build Firestore which depends on @firebase/app-exp (because of firestore exp),
    // but doesn't list it as a dependency in its package.json
    if (buildAppExp) {
      await spawn(
        'npx',
        [
          'lerna',
          'run',
          '--scope',
          '@firebase/app-exp',
          '--include-dependencies',
          'build'
        ],
        { stdio: 'inherit', cwd: root }
      );
    }

    const lernaCmd = ['lerna', 'run'];
    console.log(chalk`{blue Running build in:}`);
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

    lernaCmd.push('--include-dependencies', 'build');
    await spawn('npx', lernaCmd, { stdio: 'inherit', cwd: root });
  } catch (e) {
    console.error(chalk`{red ${e}}`);
  }
}
