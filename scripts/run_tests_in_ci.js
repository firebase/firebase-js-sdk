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
    debugLog(`spawning '${name}' process:`, 'yarn', yarnArgs);
    const testProcess = spawn('yarn', yarnArgs);

    testProcess.childProcess.stdout.on('data', data => {
      stdout += data.toString();
    });
    testProcess.childProcess.stderr.on('data', data => {
      stderr += data.toString();
    });

    await testProcess;
    debugLog(`${name} process completed successfully:`, 'yarn', yarnArgs);
    writeLogs('Success', name, stdout + '\n' + stderr);
  } catch (e) {
    errorLog(`${name} process FAILED`);
    debugLog(`${name} process ==== STDOUT BEGIN ====`);
    console.log(stdout);
    debugLog(`${name} process ==== STDOUT END ====`);
    debugLog(`${name} process ==== STDERR BEGIN ====`);
    console.error(stderr);
    debugLog(`${name} process ==== STDERR END ====`);
    writeLogs('Failure', name, stdout + '\n' + stderr);
    debugLog('Completing with failure exit code 76');
    process.exit(76);
  }
})();
