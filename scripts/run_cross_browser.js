/**
 * @license
 * Copyright 2019 Google LLC
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

const { spawn } = require('child-process-promise');
const { exists } = require('mz/fs');
const yargs = require('yargs');
const glob = require('glob');
const path = require('path');
const chalk = require('chalk');

// Check for 'configFiles' flag to run on specified karma.browser.conf.js files instead
// of on all files.
const { configFiles } = yargs
  .option('configFiles', {
    default: [],
    describe: 'specify individual karma.browser.conf.js files to run on',
    type: 'array'
  })
  .version(false)
  .help().argv;

// Get all karma.browser.conf.js files that need to be run.
// runNextTest() pulls filenames one-by-one from this queue.
const testFiles = configFiles.length
  ? configFiles
  : glob.sync(`packages/*/karma.browser.conf.js`);

// Get CI build number or generate one if running locally.
const buildNumber =
  process.env.GITHUB_RUN_ID ||
  `local_${process.env.USER}_${new Date().getTime()}`;

/**
 * Runs a set of browser tests based on this karma config file.
 *
 * @param {string} testFile Path to karma.conf.js file that defines this test
 * group.
 */
async function runTest(testFile) {
  if (!(await exists(testFile))) {
    console.error(chalk`{red ERROR: ${testFile} does not exist.}`);
    return 1;
  }
  // Run pretest if this dir has a package.json with a pretest script.
  const testFileDir =
    path.resolve(__dirname, '../') + '/' + path.dirname(testFile);
  const pkgPath = testFileDir + '/package.json';
  let pkgName = testFile;
  if (await exists(pkgPath)) {
    const pkg = require(pkgPath);
    pkgName = pkg.name;
    if (pkg.scripts.pretest) {
      await spawn('yarn', ['--cwd', testFileDir, 'pretest'], {
        stdio: 'inherit'
      });
    }
  }

  return runKarma(testFile, pkgName);
}

/**
 * Runs the karma test command for one package.
 *
 * @param {string} testFile - path to karma.browser.conf.js file
 * @param {string} testTag - package label for messages (usually package name)
 */
async function runKarma(testFile, testTag) {
  const karmaArgs = [
    'karma',
    'start',
    testFile,
    '--single-run',
    '--buildNumber',
    buildNumber
  ];

  const promise = spawn('npx', karmaArgs, { stdio: 'inherit' });
  const childProcess = promise.childProcess;
  let exitCode = 0;

  // Capture exit code of this single package test run
  childProcess.on('exit', code => {
    exitCode = code;
  });

  return promise
    .then(() => {
      console.log(chalk`{green [${testTag}] ******* DONE *******}`);
      return exitCode;
    })
    .catch(err => {
      console.error(chalk`{red [${testTag}] ERROR: ${err.message}}`);
      return exitCode;
    });
}

/**
 * Runs next file in testFiles queue as long as there are files in the queue.
 *
 * @param {number} maxExitCode Current highest exit code from all processes
 * run so far. When main process is complete, it will exit with highest code
 * of all child processes.  This allows any failing test to result in a CI
 * build failure for the whole browser test run.
 */
async function runNextTest(maxExitCode = 0, results = {}) {
  // When test queue is empty, exit with code 0 if no tests failed or
  // 1 if any tests failed.
  if (!testFiles.length) {
    for (const fileName of Object.keys(results)) {
      if (results[fileName] > 0) {
        console.log(`FAILED: ${fileName}`);
      }
    }
    process.exit(maxExitCode);
  }
  const nextFile = testFiles.shift();
  let exitCode;
  try {
    exitCode = await runTest(nextFile);
  } catch (e) {
    console.error(chalk`{red [${nextFile}] ERROR: ${e.message}}`);
    exitCode = 1;
  }
  runNextTest(Math.max(exitCode, maxExitCode), {
    ...results,
    [nextFile]: exitCode
  });
}

runNextTest();
