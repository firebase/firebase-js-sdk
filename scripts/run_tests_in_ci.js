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

const yargs = require('yargs');
const path = require('path');
const { spawn } = require('child-process-promise');
const { writeFileSync } = require('fs');

/**
 * Creates and returns a "timestamp" string for the elapsed time.
 *
 * The given timestamp is taken as an offset from the first time that this
 * function is invoked. This allows log messages to start at "time 0" and make
 * it easy for humans to calculate the elapsed time.
 *
 * @returns The timestamp string with which to prefix log lines, created from
 * the elapsed time since this function's first invocation.
 */
function elapsedTimeStr() {
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
 * The "start time", which is set to a non-null value upon the first invocation
 * of `getElapsedMilliseconds()`. All subsequent invocations calculate the
 * elapsed time using this value.
 */
let elapsedMillisecondsStartTime = null;

/**
 * Returns the number of nanoseconds that have elapsed since this function's
 * first invocation. Returns 0 on its first invocation.
 */
function getElapsedMilliseconds() {
  const currentTimeMilliseconds = getCurrentMonotonicTimeMilliseconds();
  if (elapsedMillisecondsStartTime === null) {
    elapsedMillisecondsStartTime = currentTimeMilliseconds;
    return 0;
  }
  return currentTimeMilliseconds - elapsedMillisecondsStartTime;
}

/**
 * Returns the current time, in milliseconds, from a monotonic clock.
 */
function getCurrentMonotonicTimeMilliseconds() {
  const currentTime = process.hrtime();
  return currentTime[0] * 1000 + currentTime[1] / 1_000_000;
}

function debugLog(...args) {
  // eslint-disable-next-line no-console
  console.log(__filename, elapsedTimeStr(), ...args);
}

function errorLog(...args) {
  // eslint-disable-next-line no-console
  console.error(__filename, elapsedTimeStr(), ...args);
}

debugLog(`command-line arguments: ${process.argv.join(' ')}`);

const LOGDIR = process.env.CI ? process.env.HOME : '/tmp';
// Maps the packages where we should not run `test:all` and instead isolate the cross-browser tests.
// TODO(dwyfrequency): Update object with `storage` and `firestore` packages.
const crossBrowserPackages = {
  'packages/auth': 'test:browser:unit',
  'packages/firestore': 'test:browser:unit'
};

function writeLogs(status, name, logText) {
  const safeName = name.replace(/@/g, 'at_').replace(/\//g, '_');
  writeFileSync(path.join(LOGDIR, `${safeName}-ci-log.txt`), logText, {
    encoding: 'utf8'
  });
  writeFileSync(
    path.join(LOGDIR, `${safeName}-ci-summary.txt`),
    `${status}: ${name}`,
    { encoding: 'utf8' }
  );
}

const argv = yargs.options({
  d: {
    type: 'string',
    desc: 'current working directory',
    default: '.'
  },
  s: {
    type: 'string',
    desc: 'the npm script to run',
    default: 'test'
  }
}).argv;

(async () => {
  const myPath = argv.d;
  let scriptName = argv.s;
  const dir = path.resolve(myPath);
  const { name } = require(`${dir}/package.json`);

  let stdout = '';
  let stderr = '';
  try {
    if (process.env?.BROWSERS) {
      for (const package in crossBrowserPackages) {
        if (dir.endsWith(package)) {
          scriptName = crossBrowserPackages[package];
        }
      }
    }

    const yarnArgs = ['--cwd', dir, scriptName];
    debugLog(`spawning '${name}' process: yarn ${yarnArgs.join(' ')}`);
    const testProcess = spawn('yarn', yarnArgs);

    testProcess.childProcess.stdout.on('data', data => {
      stdout += data.toString();
    });
    testProcess.childProcess.stderr.on('data', data => {
      stderr += data.toString();
    });

    await testProcess;
    debugLog(
      `'${name}' process completed successfully: yarn ${yarnArgs.join(' ')}`
    );
    writeLogs('Success', name, stdout + '\n' + stderr);
  } catch (e) {
    errorLog(`${name} process FAILED`);
    errorLog(`${name} process ==== STDOUT BEGIN ====`);
    console.log(stdout);
    errorLog(`${name} process ==== STDOUT END ====`);
    errorLog(`${name} process ==== STDERR BEGIN ====`);
    console.error(stderr);
    errorLog(`${name} process ==== STDERR END ====`);
    writeLogs('Failure', name, stdout + '\n' + stderr);
    errorLog('Completing with failure exit code 76');
    process.exit(76);
  }
})();
