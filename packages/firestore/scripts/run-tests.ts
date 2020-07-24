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

import * as yargs from 'yargs';
import { resolve } from 'path';
import { spawn } from 'child-process-promise';

const argv = yargs.options({
  main: {
    type: 'string',
    demandOption: true
  },
  emulator: {
    type: 'boolean'
  },
  persistence: {
    type: 'boolean'
  }
}).argv;

const nyc = resolve(__dirname, '../../../node_modules/.bin/nyc');
const mocha = resolve(__dirname, '../../../node_modules/.bin/mocha');

const env: { [key: string]: string } = {
  ...process.env,
  TS_NODE_CACHE: 'NO',
  TS_NODE_COMPILER_OPTIONS: '{"module":"commonjs"}'
};

let args = [
  mocha,
  '--require',
  'ts-node/register',
  '--require',
  argv.main,
  '--config',
  '../../config/mocharc.node.js'
];

if (argv.emulator) {
  env.FIRESTORE_EMULATOR_PORT = '8080';
  env.FIRESTORE_EMULATOR_PROJECT_ID = 'test-emulator';
}

if (argv.persistence) {
  env.USE_MOCK_PERSISTENCE = 'YES';
  args.push('--require', 'test/util/node_persistence.ts');
}

args = args.concat(argv._);

const childProcess = spawn(nyc, args, {
  stdio: 'inherit',
  env,
  cwd: process.cwd()
}).childProcess;

process.once('exit', () => childProcess.kill());
process.once('SIGINT', () => childProcess.kill('SIGINT'));
process.once('SIGTERM', () => childProcess.kill('SIGTERM'));
