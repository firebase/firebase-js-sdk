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
const path = require('path');
const request = require('request');
const tmp = require('tmp');

const { spawn } = require('child-process-promise');

const EMULATOR_LINK =
  'https://storage.googleapis.com/firebase-preview-drop/emulator/firebase-database-emulator-v3.5.0.jar';
const EMULATOR_FILENAME = 'database-emulator.jar';

const EMULATOR_PORT = 8088;
const EMULATOR_NAMESPACE = 'test-emulator';

async function downloadEmulator() {
  return new Promise((resolve, reject) => {
    tmp.dir((err, dir) => {
      if (err) reject(err);
      console.log(`Created temporary directory at [${dir}].`);
      const filepath = path.resolve(dir, EMULATOR_FILENAME);
      const writeStream = fs.createWriteStream(filepath);
      console.log(`Downloading emulator from [${EMULATOR_LINK}] ...`);
      request(EMULATOR_LINK)
        .pipe(writeStream)
        .on('finish', () => {
          console.log(`Saved emulator binary file to [${filepath}].`);
          resolve(filepath);
        })
        .on('error', reject);
    });
  });
}

async function launchEmulator(filepath) {
  return new Promise((resolve, reject) => {
    const promise = spawn(
      'java',
      ['-jar', path.basename(filepath), '--port', EMULATOR_PORT],
      {
        cwd: path.dirname(filepath),
        stdio: 'inherit'
      }
    );
    promise.catch(reject);

    const timeout = 10; // seconds
    console.log(`Waiting for emulator to start up ...`);
    const start = Date.now();
    setTimeout(function wait() {
      if (Date.now() - start > timeout * 1000) {
        reject(`Emulator not ready after ${timeout}s. Exiting ...`);
      } else {
        console.log(`Ping emulator at [http://localhost:${EMULATOR_PORT}] ...`);
        request(`http://localhost:${EMULATOR_PORT}`, (error, response) => {
          if (error && error.code === 'ECONNREFUSED') {
            setTimeout(wait, 1000);
          } else if (response && response.statusCode === 400) {
            // The emulator is ready to serve requests as long as it can return
            // a response instead of a 'ECONNREFUSED' error.
            // It is not necessary to send a valid requests here, as they
            // are doing some certain things like setting data or rules to the
            // emulator.
            // More information on valid requests that emulator recognizes:
            // https://firebase.google.com/docs/database/security/test-rules-emulator#interact_with_the_emulator
            console.log('Emulator has started up successfully!');
            resolve(promise.childProcess);
          } else {
            // This should not happen.
            reject({ error, response });
          }
        });
      }
    }, 1000);
  });
}

async function setPublicRules() {
  console.log('Setting rule {".read": true, ".write": true} to emulator ...');
  return new Promise((resolve, reject) => {
    request.put(
      {
        uri: `http://localhost:${EMULATOR_PORT}/.settings/rules.json?ns=${EMULATOR_NAMESPACE}`,
        headers: { Authorization: 'Bearer owner' },
        body: '{ "rules": { ".read": true, ".write": true } }'
      },
      (error, response, body) => {
        if (error) reject(error);
        console.log(`Done setting public rule to emulator. Response: ${body}.`);
        resolve(response.statusCode);
      }
    );
  });
}

async function runTest() {
  const options = {
    cwd: path.resolve(__dirname, '../../packages/database'),
    env: Object.assign({}, process.env, {
      RTDB_EMULATOR_PORT: EMULATOR_PORT,
      RTDB_EMULATOR_NAMESPACE: EMULATOR_NAMESPACE
    }),
    stdio: 'inherit'
  };
  return spawn('yarn', ['test'], options);
}

async function start() {
  let emulator;
  try {
    const filepath = await downloadEmulator();
    emulator = await launchEmulator(filepath);
    await setPublicRules();
    await runTest();
  } finally {
    if (emulator) {
      console.log(`Shutting down emulator, pid: [${emulator.pid}] ...`);
      emulator.kill();
    }
  }
}

start().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
