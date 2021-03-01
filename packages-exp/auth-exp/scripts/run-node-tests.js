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

'use strict';
var __spreadArrays =
  (this && this.__spreadArrays) ||
  function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++)
      s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
      for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
        r[k] = a[j];
    return r;
  };
exports.__esModule = true;
var path_1 = require('path');
var child_process_promise_1 = require('child-process-promise');
var yargs = require('yargs');
var argv = yargs.options({
  local: { type: 'boolean' },
  integration: { type: 'boolean' }
}).argv;
var nyc = path_1.resolve(__dirname, '../../../node_modules/.bin/nyc');
var mocha = path_1.resolve(__dirname, '../../../node_modules/.bin/mocha');
process.env.TS_NODE_COMPILER_OPTIONS = '{"module":"commonjs"}';
var testConfig = [
  'src/!(platform_browser|platform_react_native|platform_cordova)/**/*.test.ts',
  '--file',
  'index.node.ts'
];
if (argv.integration) {
  testConfig = ['test/integration/flows/{email,anonymous}.test.ts'];
}
var args = __spreadArrays(['--reporter', 'lcovonly', mocha], testConfig, [
  '--config',
  '../../config/mocharc.node.js'
]);
if (argv.local) {
  process.env.AUTH_EMULATOR_PORT = '9099';
  process.env.AUTH_EMULATOR_PROJECT_ID = 'test-emulator';
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
