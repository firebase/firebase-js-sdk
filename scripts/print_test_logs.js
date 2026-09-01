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

const LOG_DIR =
  process.env.FIREBASE_CI_LOG_DIR ||
  (process.env.CI
    ? path.join(process.env.HOME, '.firebase-ci-logs')
    : path.resolve(__dirname, '../.ci-logs'));

function loadSuites(logDir = LOG_DIR) {
  const suites = new Map();

  // Read individual manifest files: manifests/*.json
  const manifestsDir = path.join(logDir, 'manifests');
  if (fs.existsSync(manifestsDir)) {
    try {
      const files = fs.readdirSync(manifestsDir);
      for (const file of files) {
        if (file.endsWith('.json') && !file.startsWith('.')) {
          try {
            const raw = fs.readFileSync(path.join(manifestsDir, file), 'utf8');
            const entry = JSON.parse(raw);
            if (entry && entry.packageName) {
              const key = `${entry.packageName}:${entry.scriptName || 'test'}`;
              suites.set(key, entry);
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  // Fallback for raw log files without a manifest (e.g. killed abruptly before completion)
  if (fs.existsSync(logDir)) {
    try {
      const recordedLogFiles = new Set(
        Array.from(suites.values())
          .map(s => s.logFile)
          .filter(Boolean)
      );
      const files = fs.readdirSync(logDir);
      for (const file of files) {
        if (file.endsWith('-ci-log.txt')) {
          const logFile = path.join(logDir, file);
          if (!recordedLogFiles.has(logFile)) {
            const safeName = file.replace(/-ci-log\.txt$/, '');
            suites.set(`${safeName}:test`, {
              packageName: safeName,
              scriptName: 'test',
              status: 'Failure',
              logFile
            });
          }
        }
      }
    } catch (e) {}
  }

  return Array.from(suites.values());
}

function dumpSuiteLog(s) {
  if (fs.existsSync(s.logFile)) {
    console.log(
      '\n================================================================================'
    );
    console.log(
      `TEST LOG: ${s.packageName} (${s.scriptName || 'test'}) [${s.status}]`
    );
    console.log(`Log File: ${s.logFile}`);
    console.log(
      '================================================================================'
    );
    console.log(fs.readFileSync(s.logFile, 'utf8'));
    console.log(`─── End of log for ${s.packageName} ───\n`);
  } else {
    console.warn(`\nLog file not found for ${s.packageName}: ${s.logFile}\n`);
  }
}

module.exports = {
  loadSuites,
  dumpSuiteLog
};

if (require.main === module) {
  const logDir = LOG_DIR;
  if (!fs.existsSync(logDir)) {
    process.exit(0);
  }

  const suites = loadSuites(logDir);
  const failedSuites = suites.filter(s => s.status !== 'Success');

  if (failedSuites.length === 0) {
    console.log('All tests passed.');
    process.exit(0);
  }

  console.log(
    `\n--- Printing Full Logs for ${failedSuites.length} Failed Suite(s) ---\n`
  );

  for (const suite of failedSuites) {
    dumpSuiteLog(suite);
  }
}
