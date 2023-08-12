/**
 * @license
 * Copyright 2023 Google LLC
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
const child_process = require('node:child_process');
const fs = require('node:fs');

const LOGDIR = process.env.CI ? process.env.HOME : '/tmp';

async function main() {
  const { scriptName, workingDir } = parseArgs();
  const { name } = require(`${workingDir}/package.json`);
  logPrefix = name;

  const logFilePath = path.join(LOGDIR, `${makeSafePath(name)}-ci-log.txt`);
  const testProcessExitCode = await runTestProcess(
    workingDir,
    scriptName,
    logFilePath
  );

  const summaryFilePath = path.join(
    LOGDIR,
    `${makeSafePath(name)}-ci-summary.txt`
  );
  writeSummaryFile(summaryFilePath, name, testProcessExitCode === 0);

  await printFile(logFilePath);

  process.exit(testProcessExitCode);
}

async function runTestProcess(workingDir, scriptName, logFilePath) {
  log(`Saving test process output to file: ${logFilePath}`);
  const logFileHandle = fs.openSync(logFilePath, 'w');
  try {
    const args = ['yarn', '--cwd', workingDir, scriptName];
    log(`Starting test process: ${args.join(' ')}`);
    const proc = child_process.spawn(args[0], args.splice(1), {
      stdio: ['inherit', logFileHandle, logFileHandle]
    });
    proc.once('spawn', () => log(`Started test process with PID: ${proc.pid}`));
    const exitCode = await new Promise((resolve, reject) => {
      proc.once('close', resolve);
      proc.once('error', reject);
    });
    log(`Test process completed with exit code: ${exitCode}`);
    return exitCode;
  } finally {
    fs.close(logFileHandle);
  }
}

function writeSummaryFile(summaryFilePath, name, testProcessSuccessful) {
  const statusString = testProcessSuccessful ? 'Success' : 'Failure';
  const line = `${statusString}: ${name}`;
  log(`Writing summary to file ${summaryFilePath}: ${line}`);
  fs.writeFileSync(summaryFilePath, line, { encoding: 'utf8' });
}

async function printFile(path) {
  log('========================================================');
  log(`==== BEGIN ${path}`);
  log('========================================================');
  const readStream = fs.createReadStream(path);
  readStream.pipe(process.stdout);
  await new Promise((resolve, reject) => {
    readStream.once('end', resolve);
    readStream.once('error', reject);
  });
  log('========================================================');
  log(`==== END ${path}`);
  log('========================================================');
}

let logPrefix = '';

function log() {
  console.log('run_tests_in_ci.js', logPrefix, elapsedTimeStr(), ...arguments);
}

function makeSafePath(s) {
  return s.replace(/@/g, 'at_').replace(/\//g, '_');
}

function parseArgs() {
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

  return {
    scriptName: resolveScriptNameArg(argv.s),
    workingDir: path.resolve(argv.d)
  };
}

function resolveScriptNameArg(scriptName) {
  // Maps the packages where we should not run `test:all` and instead isolate the cross-browser tests.
  // TODO(dwyfrequency): Update object with `storage` and `firestore` packages.
  const crossBrowserPackages = {
    'packages/auth': 'test:browser:unit',
    'packages/auth-compat': 'test:browser:unit',
    'packages/firestore': 'test:browser:unit',
    'packages/firestore-compat': 'test:browser'
  };

  if (process.env?.BROWSERS) {
    for (const package in crossBrowserPackages) {
      if (dir.endsWith(package)) {
        scriptName = crossBrowserPackages[package];
      }
    }
  }

  return scriptName;
}

let startTime = null;

function getElapsedMilliseconds() {
  const currentTimeMilliseconds = getCurrentMonotonicTimeMilliseconds();
  if (startTime === null) {
    startTime = currentTimeMilliseconds;
    return 0;
  }
  return currentTimeMilliseconds - startTime;
}

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

function getCurrentMonotonicTimeMilliseconds() {
  const currentTime = process.hrtime();
  return currentTime[0] * 1000 + currentTime[1] / 1_000_000;
}

main();
