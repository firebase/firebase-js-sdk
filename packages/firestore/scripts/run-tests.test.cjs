/**
 * @license
 * Copyright 2026 Google LLC
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

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const yargs = require('yargs/yargs');

const source = readFileSync(path.join(__dirname, 'run-tests.js'), 'utf8');

function launch(args) {
  const calls = [];
  const env = {};
  const childProcess = { kill: () => {} };
  const promise = Promise.resolve();
  promise.childProcess = childProcess;
  vm.runInNewContext(source, {
    __dirname,
    exports: {},
    console,
    require(name) {
      if (name === 'yargs') {
        return yargs(args);
      }
      if (name === 'child-process-promise') {
        return {
          spawn(executable, argv, options) {
            calls.push({ executable, args: Array.from(argv), options });
            return promise;
          }
        };
      }
      return require(name);
    },
    process: {
      env,
      cwd: () => __dirname,
      once: () => {},
      exit(code) {
        throw new Error(`Unexpected process exit: ${code}`);
      }
    }
  });
  assert.equal(calls.length, 1);
  return { ...calls[0], env };
}

for (const [platform, project] of [
  ['node', 'node'],
  ['node_lite', 'node'],
  ['browser', 'browser'],
  ['browser_lite', 'browser']
]) {
  for (const debug of [false, true]) {
    test(`${platform} selects its Vitest project (debug=${debug})`, () => {
      const args = ['--main', 'test', '--platform', platform];
      if (debug) {
        args.push('--debug');
      }
      const result = launch(args);
      assert.equal(result.env.TEST_PLATFORM, platform);
      assert.ok(result.args.includes(`--project=${project}`));
      assert.equal(
        result.executable,
        debug
          ? 'node'
          : path.resolve(__dirname, '../../../node_modules/.bin/vitest')
      );
      assert.equal(result.args.includes('--inspect-brk'), debug);
      assert.equal(result.args.includes('--no-file-parallelism'), debug);
      assert.equal(result.options.stdio, 'inherit');
    });
  }
}

test('defaults to Node and forwards file/name filters', () => {
  const result = launch([
    '--main',
    'test',
    '--grep',
    'SortedSet',
    'test/unit/util/sorted_set.test.ts'
  ]);
  assert.equal(result.env.TEST_PLATFORM, 'node');
  assert.deepEqual(result.args, [
    'run',
    '--project=node',
    '-t',
    'SortedSet',
    'test/unit/util/sorted_set.test.ts'
  ]);
});

test('preserves backend and persistence options for browser Lite', () => {
  const result = launch([
    '--main',
    'test',
    '--platform',
    'browser_lite',
    '--targetBackend',
    'prod',
    '--emulator',
    '--persistence',
    '--databaseId',
    'enterprise',
    '--firestoreEdition',
    'ENTERPRISE'
  ]);
  assert.equal(result.env.TEST_PLATFORM, 'browser_lite');
  assert.equal(result.env.FIRESTORE_TARGET_BACKEND, 'emulator');
  assert.equal(result.env.USE_MOCK_PERSISTENCE, 'YES');
  assert.equal(result.env.FIRESTORE_TARGET_DB_ID, 'enterprise');
  assert.equal(result.env.RUN_ENTERPRISE_TESTS, 'true');
  assert.ok(result.args.includes('--project=browser'));
});
