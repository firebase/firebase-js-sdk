'use strict';
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
 */ exports.__esModule = true;
var yargs = require('yargs');
var path_1 = require('path');
var child_process_promise_1 = require('child-process-promise');
var argv = yargs.options({
  main: { type: 'string', demandOption: true },
  platform: { type: 'string', default: 'node' },
  emulator: { type: 'boolean' },
  persistence: { type: 'boolean' }
}).argv;
var nyc = path_1.resolve(__dirname, '../../../node_modules/.bin/nyc');
var mocha = path_1.resolve(__dirname, '../../../node_modules/.bin/mocha');
process.env.TS_NODE_CACHE = 'NO';
process.env.TS_NODE_COMPILER_OPTIONS = '{"module":"commonjs"}';
process.env.TEST_PLATFORM = argv.platform;
var args = [
  '--reporter',
  'lcovonly',
  mocha,
  '--require',
  'ts-node/register',
  '--require',
  argv.main,
  '--config',
  '../../config/mocharc.node.js'
];
if (argv.emulator) {
  process.env.FIRESTORE_EMULATOR_PORT = '8080';
  process.env.FIRESTORE_EMULATOR_PROJECT_ID = 'test-emulator';
}
if (argv.persistence) {
  process.env.USE_MOCK_PERSISTENCE = 'YES';
  args.push('--require', 'test/util/node_persistence.ts');
}
args = args.concat(argv._);
var childProcess = child_process_promise_1.spawn(nyc, args, {
  stdio: 'inherit',
  cwd: process.cwd()
}).childProcess;
process.once('exit', function () {
  return childProcess.kill();
});
process.once('SIGINT', function () {
  return childProcess.kill('SIGINT');
});
process.once('SIGTERM', function () {
  return childProcess.kill('SIGTERM');
});
