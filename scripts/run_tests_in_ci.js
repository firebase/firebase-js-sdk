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

const yargs = require('yargs');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child-process-promise');

const LOGDIR =
  process.env.FIREBASE_CI_LOG_DIR ||
  (process.env.CI ? process.env.HOME : '/tmp');

// Maps the packages where we should not run `test:all` and instead isolate the cross-browser tests.
// TODO(dwyfrequency): Update object with `storage` and `firestore` packages.
const crossBrowserPackages = {
  'packages/auth': 'test:browser:unit',
  'packages/auth-compat': 'test:browser:unit',
  'packages/firestore': 'test:browser:unit',
  'packages/firestore-compat': 'test:browser',
  'packages/storage': 'test:browser:unit',
  'packages/storage-compat': 'test:browser:unit'
};

const argv = yargs.options({
  d: {
    type: 'string',
    desc: 'current working directory',
    default: '.'
  },
  s: {
    type: 'string',
    desc: 'the npm script to run',
    default: 'test'
  }
}).argv;

(async () => {
  const myPath = argv.d;
  let scriptName = argv.s;
  const dir = path.resolve(myPath);
  const { name, scripts } = require(`${dir}/package.json`);

  if (process.env?.BROWSERS) {
    if (scripts['test:browser']) {
      scriptName = 'test:browser';
    }
    for (const package in crossBrowserPackages) {
      if (dir.endsWith(package)) {
        scriptName = crossBrowserPackages[package];
      }
    }
  }

  const browser = process.env.BROWSERS ?? 'chrome/node';
  const safeName = name.replace(/@/g, 'at_').replace(/\//g, '_');

  const logFile = path.join(LOGDIR, `${safeName}-ci-log.txt`);
  const summaryFile = path.join(LOGDIR, `${safeName}-ci-summary.txt`);
  const logStream = fs.createWriteStream(logFile);

  console.log(`[${name}][${browser}]: Running script ${scriptName}`);

  const testProcess = spawn('yarn', ['--cwd', dir, scriptName]);

  testProcess.childProcess.stdout.pipe(logStream, { end: false });
  testProcess.childProcess.stderr.pipe(logStream, { end: false });

  try {
    await testProcess;
    await new Promise(resolve => logStream.end(resolve));
    fs.writeFileSync(summaryFile, `Success: ${name}`);
    console.log('Success: ' + name);
  } catch (e) {
    await new Promise(resolve => logStream.end(resolve));
    fs.writeFileSync(summaryFile, `Failure: ${name}`);
    console.error('Failure: ' + name);

    if (process.env.CHROME_VERSION_NOTES) {
      console.error();
      console.error(process.env.CHROME_VERSION_NOTES);
      console.error();
    }

    process.exit(1);
  }
})();
