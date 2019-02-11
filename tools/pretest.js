/**
 * @license
 * Copyright 2017 Google Inc.
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

const { resolve } = require('path');
const { spawn } = require('child-process-promise');
const chalk = require('chalk');
const fs = require('mz/fs');
const semver = require('semver');

// CONSTANTS
const root = resolve(__dirname, '..');
const REQ_YARN_VERSION = '1.0.0';

/**
 * Potential Problem #1:
 * Developer has not yet specified a valid test project
 */
function checkTestConfigExists() {
  if (!fs.existsSync(resolve(root, 'config/project.json'))) {
    throw chalk`
{red You have not yet specified a Firebase project to use for testing.}

To create a test project, please visit {underline https://console.firebase.google.com/}. 
After doing so, or if you already have a test project, please run the following command
at the root of this package:

$ npm run test:setup
`;
  }
}

/**
 * Potential Problem #2:
 * Developer is not using a valid version of `yarn`
 */
async function validateCompatibleYarnVersion() {
  const promise = spawn('yarn', ['-v']);
  const { childProcess } = promise;
  let version = '';

  childProcess.stdout.on('data', data => {
    version += data.toString();
  });

  await promise;

  if (semver.lt(version, REQ_YARN_VERSION)) {
    throw chalk`
{red Your globally installed version of yarn is not compatible}

We use yarn workspaces to manage this project and your version of yarn is not
compatible. Please visit {underline https://yarnpkg.com/lang/en/docs/install/}
for upgrade/installation instructions
`;
  }
}

/**
 * Potential Problem #3:
 * Developers yarn setup was misconfigured
 */
async function validateYarnInstall() {
  try {
    await spawn('yarn', ['check', '--integrity']);
  } catch (err) {
    throw chalk`
{red Your yarn workspace didn't pass the integrity check}

To fix the integrity of your test environment please run the following at the
root of this package:

$ yarn install
`;
  }
}

Promise.resolve()
  .then(() => checkTestConfigExists())
  .then(() => validateCompatibleYarnVersion())
  .then(() => validateYarnInstall())
  .catch(err => {
    console.error(err);
    return process.exit(1);
  });
