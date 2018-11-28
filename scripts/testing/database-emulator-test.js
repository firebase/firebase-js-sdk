/**
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

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child-process-promise');

const EMULATOR_LINK =
  'https://firebase.google.com/docs/database/downloads/database-emulator.jar';
const EMULATOR_DIRECTORY = path.join(os.tmpdir(), 'firebase-emulators');
const EMULATOR_FILENAME = 'database-emulator.jar';

const EMULATOR_PORT = 8088;
const EMULATOR_NAMESPACE = 'test-emulator';

async function delay(seconds) {
  return new Promise(resolve => setTimeout(resolve, 1000 * seconds));
}

async function downloadEmulator() {
  return new Promise((resolve, reject) => {
    console.log(`Creating directory [${EMULATOR_DIRECTORY}] ...`);
    fs.mkdir(EMULATOR_DIRECTORY, err => {
      if (err && err.code !== 'EEXIST') reject(err);
      console.log(`Downloading emulator binary from [${EMULATOR_LINK}] ...`);
      // const promise = spawn('firebase', ['setup:emulators:database']);
      const promise = spawn('curl', [EMULATOR_LINK, '-o', EMULATOR_FILENAME], {
        cwd: EMULATOR_DIRECTORY,
        stdio: 'inherit'
      });
      resolve(promise);
    });
  });
}

async function launchEmulator(locked) {
  const emulator = new Promise((resolve, reject) => {
    // const promise = spawn('firebase', ['serve', '--only', 'database']);
    const promise = spawn(
      'java',
      ['-jar', EMULATOR_FILENAME, '--port', EMULATOR_PORT],
      { cwd: EMULATOR_DIRECTORY }
    );
    promise.catch(reject);
    const process = promise.childProcess;
    console.log(`Bringing up emulator, pid: [${process.pid}] ...`);
    process.stdout.on('data', data => {
      console.log(`[emulator-logs]: ${data}`);
      // Working on better ways to signal readiness.
      if (data.includes(`Listening on port ${EMULATOR_PORT}`)) {
        setTimeout(() => resolve(process), 5000);
      }
    });
  });
  await emulator;
  if (!locked) {
    console.log('Loading rule {".read": true, ".write": true} to emulator ...');
    await spawn(
      'curl',
      [
        '-H',
        'Authorization: Bearer owner',
        '-X',
        'PUT',
        '-d',
        '{"rules": {".read": true, ".write": true}}',
        `http://localhost:${EMULATOR_PORT}/.settings/rules.json?ns=${EMULATOR_NAMESPACE}`
      ],
      { stdio: 'inherit' }
    );
  }
  console.log('\n\nEmulator has started up successfully!\n\n');
  return emulator;
}

async function runTest() {
  const options = {
    cwd: path.resolve(__dirname, '../../packages/database'),
    env: Object.assign({}, process.env, {
      USE_RTDB_EMULATOR: true,
      RTDB_EMULATOR_PORT: EMULATOR_PORT,
      RTDB_EMULATOR_NAMESPACE: EMULATOR_NAMESPACE
    }),
    stdio: 'inherit'
  };
  return Promise.all([
    spawn('yarn', ['test:node'], options),
    spawn('yarn', ['test:browser'], options)
  ]);
}

(async () => {
  let emulator;
  try {
    await downloadEmulator();
    emulator = await launchEmulator(false);
    await runTest();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    if (emulator) {
      console.log(`Shutting down emulator, pid: [${emulator.pid}] ...`);
      emulator.kill();
    }
  }
})();
