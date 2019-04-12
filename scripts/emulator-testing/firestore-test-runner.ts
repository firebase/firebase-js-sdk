/**
 * @license
 * Copyright 2018 Google Inc.
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

import { spawn } from 'child-process-promise';
import * as path from 'path';

import { ChildProcessPromise } from './emulators/emulator';
import { FirestoreEmulator } from './emulators/firestore-emulator';

function runTest(port: number, projectId: string): ChildProcessPromise {
  const options = {
    cwd: path.resolve(__dirname, '../../packages/firestore'),
    env: Object.assign({}, process.env, {
      FIRESTORE_EMULATOR_PORT: port,
      FIRESTORE_EMULATOR_PROJECT_ID: projectId
    }),
    stdio: 'inherit'
  };
  // TODO(b/113267261): Include browser test once WebChannel support is
  // ready in Firestore emulator.
  return spawn('yarn', ['test:node'], options);
}

async function run(): Promise<void> {
  const emulator = new FirestoreEmulator();
  try {
    await emulator.download();
    await emulator.setUp();
    await runTest(emulator.port, emulator.projectId);
  } finally {
    await emulator.tearDown();
  }
}

run().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
