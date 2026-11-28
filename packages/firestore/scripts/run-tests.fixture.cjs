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

const childProcessPromise = require('child-process-promise');

// Preload only for CLI tests: inspect the command without starting Vitest or an inspector.
childProcessPromise.spawn = (executable, args, options) => {
  const env = {};
  for (const key of [
    'TEST_PLATFORM',
    'FIRESTORE_TARGET_BACKEND',
    'USE_MOCK_PERSISTENCE',
    'FIRESTORE_TARGET_DB_ID',
    'RUN_ENTERPRISE_TESTS'
  ]) {
    if (process.env[key] !== undefined) {
      env[key] = process.env[key];
    }
  }
  process.stdout.write(JSON.stringify({ executable, args, options, env }));
  const promise = Promise.resolve();
  promise.childProcess = { kill: () => {} };
  return promise;
};
