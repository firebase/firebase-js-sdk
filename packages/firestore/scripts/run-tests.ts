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

const argv = yargs
  .options({
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
    },
    databaseId: {
      type: 'string'
    },
    firestoreEdition: {
      type: 'string'
    },
    grep: {
      type: 'string',
      description: 'Filter tests by name (regex)'
    },
    targetBackend: {
      type: 'string',
      description: 'The backend to test against (emulator, prod, nightly)'
    },
    debug: {
      type: 'boolean',
      description: 'Run tests in debug mode (node --inspect-brk)'
    }
  })
  .parseSync();

const vitest = resolve(__dirname, '../../../node_modules/.bin/vitest');

process.env.TEST_PLATFORM = argv.platform;

if (argv.targetBackend) {
  process.env.FIRESTORE_TARGET_BACKEND = argv.targetBackend;
}

if (argv.emulator) {
  process.env.FIRESTORE_TARGET_BACKEND = 'emulator';
}

if (argv.persistence) {
  process.env.USE_MOCK_PERSISTENCE = 'YES';
}

if (argv.databaseId) {
  process.env.FIRESTORE_TARGET_DB_ID = argv.databaseId;
}

if (argv.firestoreEdition) {
  if (argv.firestoreEdition.toLowerCase() === 'enterprise') {
    process.env.RUN_ENTERPRISE_TESTS = 'true';
  }
}

let executable = vitest;
let args = ['run', '--project=node'];

if (argv.debug) {
  executable = 'node';
  const vitestMjs = resolve(__dirname, '../../../node_modules/vitest/vitest.mjs');
  args = ['--inspect-brk', vitestMjs, '--project=node', '--no-file-parallelism'];
}

if (argv.grep) {
  args.push('-t', argv.grep);
}

const fileArgs = (argv._ as string[]).filter(
  pattern => !pattern.includes('{,!(browser|lite)')
);
args = args.concat(fileArgs);

const spawnPromise = spawn(executable, args, {
  stdio: 'inherit',
  cwd: process.cwd()
});

const childProcess = spawnPromise.childProcess;

spawnPromise.catch(error => {
  // When a test fails, there will be a non-zero error code. Simply exit this process,
  // and don't print a stack trace.
  // Note: error.code is the exit code of the spawned process.
  if (typeof error.code === 'number' && error.code > 0) {
    // If it's a standard test failure (mocha exit code), we don't need a runner stack trace.
    process.exit(error.code);
  } else {
    // For other errors (spawn failed, runner crash, etc.), print the stack trace.
    console.error('Test runner failed to execute:');
    console.error(error);
    process.exit(1);
  }
});

process.once('exit', () => childProcess.kill());
process.once('SIGINT', () => childProcess.kill('SIGINT'));
process.once('SIGTERM', () => childProcess.kill('SIGTERM'));
