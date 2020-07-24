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
 */
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
    return __assign.apply(this, arguments);
  };
exports.__esModule = true;
var yargs = require('yargs');
var path_1 = require('path');
var child_process_promise_1 = require('child-process-promise');
var argv = yargs.options({
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
var nyc = path_1.resolve(__dirname, '../../../node_modules/.bin/nyc');
var mocha = path_1.resolve(__dirname, '../../../node_modules/.bin/mocha');
var env = __assign(__assign({}, process.env), {
  TS_NODE_CACHE: 'NO',
  TS_NODE_COMPILER_OPTIONS: '{"module":"commonjs"}'
});
var args = [
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
var childProcess = child_process_promise_1.spawn(nyc, args, {
  stdio: 'inherit',
  env: env,
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
