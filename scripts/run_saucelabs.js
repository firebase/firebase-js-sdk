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

// Check for 'configFiles' flag to run on specified karma.conf.js files instead
// of on all files.
const { configFiles } = yargs
  .option('configFiles', {
    default: [],
    describe: 'specify individual karma.conf.js files to run on',
    type: 'array'
  })
  .version(false)
  .help().argv;

// Get all karma.conf.js files that need to be run.
// runNextTest() pulls filenames one-by-one from this queue.
const testFiles = configFiles.length
  ? configFiles
  : glob.sync(`{packages,integration}/*/karma.conf.js`);
// Automated tests in integration/firestore are currently disabled.
// .filter(name => !name.includes('integration/firestore'));

// Get CI build number or generate one if running locally.
const buildNumber =
  process.env.TRAVIS_BUILD_NUMBER ||
  process.env.GITHUB_RUN_ID ||
  `local_${process.env.USER}_${new Date().getTime()}`;

/**
 * Runs a set of SauceLabs browser tests based on this karma config file.
 *
 * @param {string} testFile Path to karma.conf.js file that defines this test
 * group.
 */
async function runTest(testFile) {
  // Run pretest if this dir has a package.json with a pretest script.
  const testFileDir =
    path.resolve(__dirname, '../') + '/' + path.dirname(testFile);
  const pkgPath = testFileDir + '/package.json';
  if (await exists(pkgPath)) {
    const pkg = require(pkgPath);
    if (pkg.scripts.pretest) {
      await spawn('yarn', ['--cwd', testFileDir, 'pretest'], {
        stdio: 'inherit'
      });
    }
  }
  if (testFile.includes('integration/firestore')) {
    console.log('Generating memory build.');
    await spawn('yarn', ['--cwd', 'integration/firestore', 'build:memory'], {
      stdio: 'inherit'
    });
    console.log('Running tests on memory build.');
    const exitCode1 = await runKarma(testFile);
    // console.log('Generating persistence build.');
    // await spawn('yarn', ['--cwd', 'integration/firestore', 'build:persistence'], { stdio: 'inherit' });
    // console.log('Running tests on persistence build.');
    // const exitCode2 = await runKarma(testFile);
    // return Math.max(exitCode1, exitCode2);
    return exitCode1;
  }
  return runKarma(testFile);
}

async function runKarma(testFile) {
  const karmaArgs = [
    'karma',
    'start',
    'config/karma.saucelabs.js',
    '--single-run',
    '--testConfigFile',
    testFile,
    '--buildNumber',
    buildNumber
  ];

  if (testFile.includes('packages/firestore')) {
    // Firestore requires this flag to run unit tests only.
    karmaArgs.push('--unit');
  }
  const promise = spawn('npx', karmaArgs, { stdio: 'inherit' });
  const childProcess = promise.childProcess;
  let exitCode = 0;

  // Capture exit code of this single package test run
  childProcess.on('exit', code => {
    exitCode = code;
  });

  return promise
    .then(() => {
      console.log(`[${testFile}] ******* DONE *******`);
      return exitCode;
    })
    .catch(err => {
      console.error(`[${testFile}] ERROR:`, err.message);
      return exitCode;
    });
}

/**
 * Runs next file in testFiles queue as long as there are files in the queue.
 *
 * @param {number} maxExitCode Current highest exit code from all processes
 * run so far. When main process is complete, it will exit with highest code
 * of all child processes.  This allows any failing test to result in a CI
 * build failure for the whole Saucelabs run.
 */
async function runNextTest(maxExitCode = 0) {
  // When test queue is empty, exit with code 0 if no tests failed or
  // 1 if any tests failed.
  if (!testFiles.length) process.exit(maxExitCode);
  const nextFile = testFiles.shift();
  let exitCode;
  try {
    exitCode = await runTest(nextFile);
  } catch (e) {
    console.error(`[${nextFile}] ERROR:`, e.message);
    exitCode = 1;
  }
  runNextTest(Math.max(exitCode, maxExitCode));
}

runNextTest();
