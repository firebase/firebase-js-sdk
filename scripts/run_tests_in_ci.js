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
const { spawn } = require('node:child_process');
const fs = require('node:fs');

const LOGDIR = process.env.CI ? process.env.HOME : '/tmp';
// Maps the packages where we should not run `test:all` and instead isolate the cross-browser tests.
// TODO(dwyfrequency): Update object with `storage` and `firestore` packages.
const crossBrowserPackages = {
  'packages/auth': 'test:browser:unit',
  'packages/auth-compat': 'test:browser:unit',
  'packages/firestore': 'test:browser:unit',
  'packages/firestore-compat': 'test:browser'
};

function getPathSafeName(name) {
  return name.replace(/@/g, 'at_').replace(/\//g, '_');
}

async function printFile(path) {
  const readStream = fs.createReadStream(path);
  readStream.pipe(process.stdout);
  await new Promise((resolve, reject) => {
    readStream.once('end', resolve);
    readStream.once('error', reject);
  });
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
  const safeName = name.replace(/@/g, 'at_').replace(/\//g, '_');
  const testOutputFile = path.join(
    LOGDIR,
    `${getPathSafeName(name)}-ci-log.txt`
  );

  if (process.env?.BROWSERS) {
    for (const package in crossBrowserPackages) {
      if (dir.endsWith(package)) {
        scriptName = crossBrowserPackages[package];
      }
    }
  }

  const testOutputFileHandle = fs.openSync(testOutputFile, 'w');
  const testProcess = spawn('yarn', ['--cwd', dir, scriptName], {
    stdio: ['inherit', testOutputFileHandle, testOutputFileHandle]
  });

  const exitCode = await new Promise((resolve, reject) => {
    testProcess.once('close', resolve);
    testProcess.once('error', reject);
  }).finally(() => {
    fs.closeSync(testOutputFileHandle);
  });

  const resultStr = exitCode === 0 ? 'Success' : 'Failure';
  console.log(`${resultStr}: ` + name);
  await printFile(testOutputFile);

  fs.writeFileSync(
    path.join(LOGDIR, `${getPathSafeName(name)}-ci-summary.txt`),
    `${resultStr}: ${name}`,
    { encoding: 'utf8' }
  );

  // NOTE: Set `process.exitCode` rather than calling `process.exit()` because
  // the latter will exit forcefully even if stdout/stderr have not been fully
  // flushed, leading to truncated output.
  process.exitCode = exitCode;
})();
