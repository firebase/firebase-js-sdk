/**
 * @license
 * Copyright 2018 Google LLC
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

// @ts-ignore
import {
  spawn,
  ChildProcessPromise,
  SpawnPromiseResult
} from 'child-process-promise';
import * as path from 'path';
// @ts-ignore
import freePortFinder from 'find-free-port';

import { FirestoreEmulator } from './emulators/firestore-emulator';

function runTest(port: number, projectId: string, withPersistence: boolean) {
  const options = {
    cwd: path.resolve(__dirname, '../../packages/firestore'),
    env: {
      ...process.env,
      FIRESTORE_TARGET_BACKEND: 'emulator',
      FIRESTORE_EMULATOR_PORT: port.toString(),
      FIRESTORE_EMULATOR_PROJECT_ID: projectId
    },
    stdio: 'inherit' as const
  };
  // TODO(b/113267261): Include browser test once WebChannel support is
  // ready in Firestore emulator.
  const childProcesses: ChildProcessPromise<SpawnPromiseResult>[] = [];
  if (withPersistence) {
    childProcesses.push(
      spawn('yarn', ['test:node:persistence'], options),
      spawn('yarn', ['test:lite'], options)
    );
  } else {
    childProcesses.push(
      spawn('yarn', ['test:node'], options),
      spawn('yarn', ['test:lite'], options)
    );
  }

  process.once('exit', () =>
    childProcesses.forEach(p => p.childProcess.kill())
  );
  process.once('SIGINT', () =>
    childProcesses.forEach(p => p.childProcess.kill('SIGINT'))
  );
  process.once('SIGTERM', () =>
    childProcesses.forEach(p => p.childProcess.kill('SIGTERM'))
  );

  return Promise.all(childProcesses);
}

async function run(): Promise<void> {
  const port = await findFreePort();
  const emulator = new FirestoreEmulator(port);
  try {
    await emulator.download();
    await emulator.setUp();
    // When persistence is enabled, the test runner runs all tests
    // twice (once with and once without persistence).
    await runTest(emulator.port, emulator.projectId, true);
  } finally {
    await emulator.tearDown();
  }
}

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    freePortFinder(10000, (err: Error, port: number) => {
      return err ? reject(err) : resolve(port);
    });
  });
}

run().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
