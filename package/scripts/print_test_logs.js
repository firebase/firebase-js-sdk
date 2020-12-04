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
const glob = require('glob');

const LOGDIR = process.env.CI ? process.env.HOME : '/tmp';

const EXCESSIVE_RUN_TIME = 1000 * 60 * 60; // 1 hour

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

    const summaryFiles = glob.sync(path.join(LOGDIR, '*-ci-summary.txt'));
    const logFiles = glob.sync(path.join(LOGDIR, '*-ci-log.txt'));
    for (const file of summaryFiles.concat(logFiles)) {
      if (existsSync(file)) {
        console.log(readFileSync(file, { encoding: 'utf8' }));
        unlinkSync(file);
      }
    }
  }
})();
