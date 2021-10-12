/**
 * @license
 * Copyright 2017 Google LLC
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
const { exec, spawn } = require('child-process-promise');
const chalk = require('chalk');

const root = resolve(__dirname, '../..');
const packageJson = require(root + '/package.json');

async function checkVersion() {
  const { stdout } = await exec('yarn prettier --version', {
    stdio: 'inherit',
    cwd: root
  });
  const lines = stdout.split('\n');
  let runtimeVersion;
  for (const line of lines) {
    if (line.match(/^\d+\.\d+\.\d+$/)) {
      runtimeVersion = line;
      break;
    }
  }
  if (!runtimeVersion) {
    console.warn('Was not able to find runtime version of prettier.');
    return;
  }
  const packageVersion = packageJson.devDependencies.prettier;
  if (packageVersion !== runtimeVersion) {
    const mismatchText =
      `Installed version of prettier (${runtimeVersion}) does not match ` +
      `required version (${packageVersion}).`;
    const versionMismatchMessage = chalk`
      {red ${mismatchText}}

      {yellow Please re-run {reset 'yarn'} from the root of the repo and try again.}
      `;
    throw new Error(versionMismatchMessage);
  }
}

async function doPrettier(changedFiles) {
  try {
    await checkVersion();
  } catch (e) {
    console.error(e);
    return process.exit(1);
  }

  console.log(chalk`{green Validating ${changedFiles.length} files with Prettier}`);
  await spawn(
    'yarn',
    [
      'prettier',
      '--config',
      `${resolve(root, '.prettierrc')}`,
      '--write',
      ...changedFiles
    ],
    {
      stdio: 'inherit',
      cwd: root
    }
  );
}

module.exports = {
  doPrettier
};
