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

const argv = yargs.options({
  local: {
    type: 'boolean'
  },
  integration: {
    type: 'boolean'
  }
}).argv;

const nyc = resolve(__dirname, '../../../node_modules/.bin/nyc');
const mocha = resolve(__dirname, '../../../node_modules/.bin/mocha');

process.env.TS_NODE_COMPILER_OPTIONS = '{"module":"commonjs"}';

let testConfig = [
  'src/!(platform_browser|platform_react_native|platform_cordova)/**/*.test.ts',
  '--file',
  'index.node.ts'
];

if (argv.integration) {
  testConfig = ['test/integration/flows/{email,anonymous}.test.ts'];
  if (argv.local) {
    testConfig.push('test/integration/flows/*.local.test.ts');
  }
}

let args = [
  '--reporter',
  'lcovonly',
  mocha,
  ...testConfig,
  '--config',
  '../../config/mocharc.node.js'
];

if (argv.local) {
  process.env.AUTH_EMULATOR_PORT = '9099';
  process.env.AUTH_EMULATOR_PROJECT_ID = 'test-emulator';
}

args = args.concat(argv._ as string[]);

const childProcess = spawn(nyc, args, {
  stdio: 'inherit',
  cwd: process.cwd()
}).childProcess;

process.once('exit', () => childProcess.kill());
process.once('SIGINT', () => childProcess.kill('SIGINT'));
process.once('SIGTERM', () => childProcess.kill('SIGTERM'));
