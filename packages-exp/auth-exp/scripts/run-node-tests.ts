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
  },
  webdriver: {
    type: 'boolean'
  }
}).argv;

const nyc = resolve(__dirname, '../../../node_modules/.bin/nyc');
const mocha = resolve(__dirname, '../../../node_modules/.bin/mocha');

process.env.TS_NODE_COMPILER_OPTIONS = '{"module":"commonjs", "target": "es6"}';

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
} else if (argv.webdriver) {
  testConfig = ['test/integration/webdriver/*.test.ts', '--delay'];
}

let args = [
  '--reporter',
  'lcovonly',
  mocha,
  ...testConfig,
  '--config',
  '../../config/mocharc.node.js'
];

// Make sure that the environment variables are present for local test
if (argv.local) {
  if (!process.env.GCLOUD_PROJECT || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    console.error(
      'Local testing against emulator requested, but ' +
        'GCLOUD_PROJECT and FIREBASE_AUTH_EMULATOR_HOST env variables ' +
        'are missing'
    );
    process.exit(1);
  }
}

args = args.concat(argv._ as string[]);

const spawned = spawn(nyc, args, {
  stdio: 'inherit',
  cwd: process.cwd()
});

const childProcess = spawned.childProcess;
spawned.catch(() => {
  childProcess.kill();
  process.exit(1);
});

process.once('exit', () => childProcess.kill());
process.once('SIGINT', () => childProcess.kill('SIGINT'));
process.once('SIGTERM', () => childProcess.kill('SIGTERM'));
