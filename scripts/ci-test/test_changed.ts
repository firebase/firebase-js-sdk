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
import { TestReason, filterTasks, getTestTasks, logTasks } from './tasks';
import chalk from 'chalk';
import * as yargs from 'yargs';
import { TestConfig, testConfig } from './testConfig';
const root = resolve(__dirname, '../..');

/**
 * Keep track of "time zero" so that all log statements can have an offset from
 * this "time zero". This makes it easy to see how long operations take, rather
 * than printing the wall clock time.
 *
 * This value is initialized the first time that `log()` is called.
 */
let logStartTime: DOMHighResTimeStamp | null = null;

function debugLog(...args: any[]): void {
  // eslint-disable-next-line no-console
  console.log(__filename, elapsedTimeStr(), ...args);
}

function errorLog(...args: any[]): void {
  // eslint-disable-next-line no-console
  console.error(__filename, elapsedTimeStr(), ...args);
}

/**
 * Creates and returns a "timestamp" string for the elapsed time.
 *
 * The given timestamp is taken as an offset from the first time that this
 * function is invoked. This allows log messages to start at "time 0" and make
 * it easy for humans to calculate the elapsed time.
 *
 * @returns The timestamp string with which to prefix log lines added to the
 * UI, created from the elapsed time since this function's first invocation.
 */
function elapsedTimeStr(): string {
  const milliseconds = getElapsedMilliseconds();
  const minutes = Math.floor(milliseconds / (1000 * 60));
  const seconds = (milliseconds - minutes * 1000 * 60) / 1000;
  return (
    (minutes < 10 ? '0' : '') +
    minutes +
    ':' +
    (seconds < 10 ? '0' : '') +
    seconds.toFixed(3)
  );
}

/**
 * Returns the number of milliseconds that have elapsed since this function's
 * first invocation.
 */
function getElapsedMilliseconds(): number {
  if (!logStartTime) {
    logStartTime = performance.now();
    return 0;
  }
  return performance.now() - logStartTime;
}

debugLog("command-line arguments:", process.argv);

const argv = yargs.parseSync();
const inputTestConfigName = argv._[0].toString();
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

    // print tasks for info
    logTasks(testTasks);
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
    debugLog('spawning process: npx', lernaCmd)
    await spawn('npx', lernaCmd, { stdio: 'inherit', cwd: root });
    debugLog('process completed successfully: npx', lernaCmd)
    process.exit(0);
  } catch (e) {
    errorLog('process failed');
    console.error(chalk`{red ${e}}`);
    errorLog('terminating with exit code 65');
    process.exit(65);
  }
}
