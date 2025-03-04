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
const { spawn } = require('child-process-promise');
const { writeFileSync } = require('fs');

const LOGDIR = process.env.CI ? process.env.HOME : '/tmp';
// Maps the packages where we should not run `test:all` and instead isolate the cross-browser tests.
// TODO(dwyfrequency): Update object with `storage` and `firestore` packages.
const crossBrowserPackages = {
  'packages/auth': 'test:browser:unit',
  'packages/auth-compat': 'test:browser:unit',
  'packages/firestore': 'test:browser:unit',
  'packages/firestore-compat': 'test:browser'
};

function writeLogs(status, name, logText) {
  const safeName = name.replace(/@/g, 'at_').replace(/\//g, '_');
  writeFileSync(path.join(LOGDIR, `${safeName}-ci-log.txt`), logText, {
    encoding: 'utf8'
  });
  writeFileSync(
    path.join(LOGDIR, `${safeName}-ci-summary.txt`),
    `${status}: ${name}`,
    { encoding: 'utf8' }
  );
}

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
  const { name } = require(`${dir}/package.json`);

  let testProcessOutput = '';
  try {
    if (process.env?.BROWSERS) {
      for (const package in crossBrowserPackages) {
        if (dir.endsWith(package)) {
          scriptName = crossBrowserPackages[package];
        }
      }
    }
    console.log('Starting: ' + name);
    const testProcess = spawn('yarn', ['--cwd', dir, scriptName]);

    testProcess.childProcess.stdout.on('data', data => {
      testProcessOutput += '[stdout]' + data.toString();
    });
    testProcess.childProcess.stderr.on('data', data => {
      testProcessOutput += '[stderr]' + data.toString();
    });

    await testProcess;
    console.log('Success: ' + name);
    writeLogs('Success', name, testProcessOutput);
  } catch (e) {
    console.error('Failure: ' + name);
    console.error(testProcessOutput);

    if (process.env.CHROME_VERSION_NOTES) {
      console.error();
      console.error(process.env.CHROME_VERSION_NOTES);
      console.error();
    }

    writeLogs('Failure', name, testProcessOutput);

    process.exit(1);
  }
})();
