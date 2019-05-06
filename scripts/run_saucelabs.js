/**
 * @license
 * Copyright 2019 Google Inc.
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
const yargs = require('yargs');
const glob = require('glob');

// Check for 'files' flag to run on specified karma.conf.js files instead of
// on all files.
const { files } = yargs
  .option('files', {
    default: [],
    describe: 'specify individual karma.conf.js files to run on',
    type: 'array'
  })
  .version(false)
  .help().argv;

// Get all karma.conf.js files that need to be run.
const testFiles = files.length
  ? files
  : glob
      .sync(`{packages,integration}/*/karma.conf.js`)
      // Automated tests in integration/firestore are currently disabled.
      .filter(name => !name.includes('integration/firestore'));

// Get CI build number or generate one if running locally.
const buildNumber =
  process.env.TRAVIS_BUILD_NUMBER ||
  `local_${process.env.USER}_${new Date().getTime()}`;

/**
 * Runs a set of SauceLabs browser tests based on this karma config file.
 *
 * @param {string} testFile Path to karma.conf.js file that defines this test
 * group.
 */
function runTest(testFile) {
  const promise = spawn('yarn', [
    'test:saucelabs:single',
    '--testfile',
    testFile,
    '--buildNumber',
    buildNumber
  ]);
  const childProcess = promise.childProcess;

  childProcess.stdout.on('data', data => {
    console.log(`[${testFile}]:`, data.toString());
  });

  // Lerna's normal output goes to stderr for some reason.
  childProcess.stderr.on('data', data => {
    console.log(`[${testFile}]:`, data.toString());
  });

  return promise
    .then(() => console.log(`[${testFile}] ******* DONE *******`))
    .catch(err => {
      console.error(`[${testFile}] ERROR:`, err.message);
    });
}

/**
 * Runs next file in testFiles queue as long as there are files in the queue.
 */
async function runNextTest() {
  if (!testFiles.length) return;
  const nextFile = testFiles.shift();
  try {
    await runTest(nextFile);
  } catch (e) {
    console.error(`[${nextFile}] ERROR:`, e.message);
  }
  runNextTest();
}

runNextTest();
