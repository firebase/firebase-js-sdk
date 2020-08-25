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
import { spawn } from 'child-process-promise';
import { TestReason, filterTasks, getTestTasks } from './tasks';
import chalk from 'chalk';
import { argv } from 'yargs';
import { TestConfig, testConfig } from './testConfig';
const root = resolve(__dirname, '../..');

const inputTestConfigName = argv._[0];
const testCommand = 'test:ci';

const allTestConfigNames = Object.keys(testConfig);
if (!inputTestConfigName) {
  throw Error(`
  A config name is required. Valid names include ${allTestConfigNames.join(
    ', '
  )}.
  To add a new config, update scripts/ci-test/testConfig.ts
  `);
}

if (!allTestConfigNames.includes(inputTestConfigName)) {
  throw Error(`
  Invalid config name. Valid names include ${allTestConfigNames.join(', ')}.
  To add a new config, update scripts/ci-test/testConfig.ts
  `);
}

const config = testConfig[inputTestConfigName]!;

runTests(config);

async function runTests(config: TestConfig) {
  try {
    const testTasks = filterTasks(await getTestTasks(), config);

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
