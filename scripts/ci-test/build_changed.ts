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

import { TestReason, getTestTasks, filterTasks, logTasks } from './tasks';
import { spawn } from 'child-process-promise';
import chalk from 'chalk';
import { resolve } from 'path';
import * as yargs from 'yargs';
import { testConfig, TestConfig } from './testConfig';
const root = resolve(__dirname, '../..');

const argv = yargs
  .options({
    buildAll: {
      type: 'boolean',
      desc: 'if true, build all packages. Used in Test Auth workflow because Auth tests depends on the firebase package'
    }
  })
  .parseSync();

const allTestConfigNames = Object.keys(testConfig);
const inputTestConfigName = argv._[0].toString();

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

buildForTests(config, argv);

interface Options {
  buildAll?: boolean;
}

async function buildForTests(
  config: TestConfig,
  { buildAll = false }: Options
) {
  try {
    const testTasks = filterTasks(await getTestTasks(), config);
    // print tasks for info
    logTasks(testTasks);
    if (testTasks.length === 0) {
      console.log(chalk`{green No test tasks. Skipping all builds }`);
      return;
    }

    // build all and return
    if (buildAll) {
      await spawn('yarn', ['build'], { stdio: 'inherit', cwd: root });
      return;
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
    process.exit(1);
  }
}
