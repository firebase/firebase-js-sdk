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
    }
  })
  .parseSync();

const nyc = resolve(__dirname, '../../../node_modules/.bin/nyc');
const mocha = resolve(__dirname, '../../../node_modules/.bin/mocha');
const babel = resolve(__dirname, '../babel-register.js');

// used in '../../config/mocharc.node.js' to disable ts-node
process.env.NO_TS_NODE = 'true';
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
  process.env.FIRESTORE_TARGET_BACKEND = 'emulator';
}

if (argv.persistence) {
  process.env.USE_MOCK_PERSISTENCE = 'YES';
  args.push('--require', 'test/util/node_persistence.ts');
}

if (argv.databaseId) {
  process.env.FIRESTORE_TARGET_DB_ID = argv.databaseId;
}

args = args.concat(argv._ as string[]);

const childProcess = spawn(nyc, args, {
  stdio: 'inherit',
  cwd: process.cwd()
}).childProcess;

process.once('exit', () => childProcess.kill());
process.once('SIGINT', () => childProcess.kill('SIGINT'));
process.once('SIGTERM', () => childProcess.kill('SIGTERM'));
