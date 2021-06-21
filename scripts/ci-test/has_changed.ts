/**
 * @license
 * Copyright 2021 Google LLC
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
import { filterTasks, getTestTasks, TestReason } from './tasks';
import { argv } from 'yargs';
import { testConfig } from './testConfig';
import chalk from 'chalk';
const root = resolve(__dirname, '../..');

const inputTestConfigName = argv._[0].toString();
const config = testConfig[inputTestConfigName]!;

async function checkIfTestsNeeded() {
  try {
    const testTasks = filterTasks(await getTestTasks(), config);
    if (testTasks.length > 0) {
      for (const task of testTasks) {
        if (task.reason === TestReason.Changed) {
          console.log(
            chalk`{yellow ${task.pkgName} (contains modified files)}`
          );
        } else if (task.reason === TestReason.Dependent) {
          console.log(
            chalk`{yellow ${task.pkgName} (depends on modified files)}`
          );
        } else {
          console.log(chalk`{yellow ${task.pkgName} (running all tests)}`);
        }
      }
      console.log(`::set-output name=NEEDS_TESTS::true`);
    } else {
      console.log(`::set-output name=NEEDS_TESTS::false`);
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

checkIfTestsNeeded();
