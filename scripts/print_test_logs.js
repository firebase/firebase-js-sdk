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
const fs = require('fs');
const glob = require('glob');

const LOGDIR =
  process.env.FIREBASE_CI_LOG_DIR ||
  (process.env.CI ? process.env.HOME : '/tmp');

const summaryFiles = glob.sync(path.join(LOGDIR, '*-ci-summary.txt'));
const logFiles = glob.sync(path.join(LOGDIR, '*-ci-log.txt'));

const failedLogs = [];

for (const summaryFile of summaryFiles) {
  const summary = fs.readFileSync(summaryFile, 'utf8').trim();
  if (summary.startsWith('Failure')) {
    const logFile = summaryFile.replace('-ci-summary.txt', '-ci-log.txt');
    failedLogs.push({ title: summary, logFile });
  }
}

// Also check for log files without a summary (crashed before writing summary)
for (const logFile of logFiles) {
  const summaryFile = logFile.replace('-ci-log.txt', '-ci-summary.txt');
  if (!fs.existsSync(summaryFile)) {
    failedLogs.push({ title: `Crashed: ${path.basename(logFile)}`, logFile });
  }
}

if (failedLogs.length === 0) {
  console.log('All tests passed.');
  process.exit(0);
}

console.log(
  `\n--- Printing Full Logs for ${failedLogs.length} Failed Suite(s) ---\n`
);

for (const { title, logFile } of failedLogs) {
  if (fs.existsSync(logFile)) {
    console.log(
      '================================================================================'
    );
    console.log(`TEST LOG: ${title}`);
    console.log(
      '================================================================================'
    );
    console.log(fs.readFileSync(logFile, 'utf8'));
    console.log(`─── End of log for ${title} ───\n`);
  }
}
