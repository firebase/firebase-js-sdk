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
import * as yargs from 'yargs';

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

const argv = yargs.options({
  main: {
    type: 'string',
    demandOption: true
  },
  platform: {
    type: 'string',
    default: 'node'
  },
  emulator: {
    type: 'boolean'
  },
  persistence: {
    type: 'boolean'
  }
}).parseSync();

const nyc = resolve(__dirname, '../../../node_modules/.bin/nyc');
const mocha = resolve(__dirname, '../../../node_modules/.bin/mocha');
const babel = resolve(__dirname, '../babel-register.js');

// used in '../../config/mocharc.node.js' to disable ts-node
process.env.NO_TS_NODE = "true";
process.env.TEST_PLATFORM = argv.platform;

let args = [
  '--reporter',
  'lcovonly',
  mocha,
  '--require',
  babel,
  '--require',
  argv.main,
  '--config',
  '../../config/mocharc.node.js'
];

if (argv.emulator) {
  debugLog("setting FIRESTORE_TARGET_BACKEND=emulator");
  process.env.FIRESTORE_TARGET_BACKEND = 'emulator';
}

if (argv.persistence) {
  debugLog("setting USE_MOCK_PERSISTENCE=YES");
  process.env.USE_MOCK_PERSISTENCE = 'YES';
  args.push('--require', 'test/util/node_persistence.ts');
}

args = args.concat(argv._ as string[]);

debugLog("spawning child process:", nyc, args);

const childProcess = spawn(nyc, args, {
  stdio: 'inherit',
  cwd: process.cwd()
}).childProcess;

process.once('exit', () => {
  debugLog("WARNING: received 'exit' event; killing child process");
  childProcess.kill();
});
process.once('SIGINT', () => {
  debugLog("WARNING: received 'SIGINT' event; sending it to child process");
  childProcess.kill('SIGINT');
});
process.once('SIGTERM', () => {
  debugLog("WARNING: received 'SIGTERM' event; sending it to child process");
  childProcess.kill('SIGTERM');
});
