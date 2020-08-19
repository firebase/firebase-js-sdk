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

const path = require('path');
const { existsSync, unlinkSync, readFileSync } = require('fs');

const LOGDIR = process.env.CI ? process.env.HOME : '/tmp';
const LOGFILE = path.join(LOGDIR, 'firebase-ci-log.txt');
const SUMMARY_FILE = path.join(LOGDIR, 'firebase-ci-summary.txt');

// const EXCESSIVE_RUN_TIME = 1000 * 60 * 60; // 1 hour
const EXCESSIVE_RUN_TIME = 1000 * 5; // 5 seconds, TEST

(async () => {
  const now = Date.now();
  const startTimeMillis = process.env.FIREBASE_CI_TEST_START_TIME
    ? process.env.FIREBASE_CI_TEST_START_TIME * 1000
    : null;
  if (startTimeMillis && now - startTimeMillis > EXCESSIVE_RUN_TIME) {
    console.log(
      `Runtime of ${
        (now - startTimeMillis) / 1000
      } seconds exceeded threshold of ${EXCESSIVE_RUN_TIME / 1000} seconds.`
    );
    console.log(`Printing full logs.`);
    if (existsSync(SUMMARY_FILE)) {
      console.log(readFileSync(SUMMARY_FILE, { encoding: 'utf8' }));
      unlinkSync(SUMMARY_FILE);
    }
    if (existsSync(LOGFILE)) {
      console.log(readFileSync(LOGFILE, { encoding: 'utf8' }));
      unlinkSync(LOGFILE);
    }
  }
})();
