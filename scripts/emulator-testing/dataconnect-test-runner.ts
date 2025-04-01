/**
 * @license
 * Copyright 2024 Google LLC
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

import { DataConnectEmulator } from './emulators/dataconnect-emulator';
import { spawn } from 'child-process-promise';
import * as path from 'path';
const useGenSDK = process.env.FIREBASE_GEN_SDK;
function runTest(port: number) {
  console.log(
    'path: ' + path.resolve(__dirname, '../../packages/data-connect')
  );
  const options = {
    cwd: path.resolve(__dirname, '../../packages/data-connect'),
    env: Object.assign({}, process.env, {
      DC_EMULATOR_PORT: port
    }),
    stdio: 'inherit' as const
  };
  return spawn('yarn', ['test:' + (useGenSDK ? 'gensdk' : 'all')], options);
}
async function run(): Promise<void> {
  const emulator = new DataConnectEmulator();
  try {
    await emulator.download();
    await emulator.setUp();
    await runTest(emulator.port);
  } finally {
    await emulator.tearDown();
  }
}
run().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
