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

const { root } = require('./constants');
const { spawn } = require('child-process-promise');
const { mapPkgNameToPkgPath } = require('./workspace');
const { readFile: _readFile } = require('fs');
const { promisify } = require('util');
const ora = require('ora');
const readFile = promisify(_readFile);

exports.publishToNpm = async (updatedPkgs, releaseType) => {
  const publishPromises = updatedPkgs.map(async pkg => {
    const status = { status: 'pending' };
    let spinner;
    try {
      const path = await mapPkgNameToPkgPath(pkg);
      /**
       * Can't require here because we have a cached version of the required JSON
       * in memory and it doesn't contain the updates
       */
      const pkgJson = JSON.parse(await readFile(`${path}/package.json`, 'utf8'));

      /**
       * Skip private packages
       */
      if (pkgJson.private) return;

      /**
       * Start the publishing tracker
       */
      spinner = ora(` 📦  Publishing: ${pkg}@${pkgJson.version}`).start();

      let args = ['publish'];

      /**
       * Ensure prereleases are tagged with the `next` tag
       */
      if (releaseType === 'Staging') {
        args = [...args, '--tag', 'next'];
      } else if (releaseType === 'Canary') {
        args = [...args, '--tag', 'canary'];
      }

      await spawn('npm', args, { cwd: path });
      spinner.stopAndPersist({
        symbol: '✅'
      });
      status.status = 'success';
    } catch(err) {
      spinner.stopAndPersist({
        symbol: '❌'
      });
      status.status = 'failed';
      status.data = err;
    }
    return status;
  });

  const processes = await publishPromises;
  if (processes.every(process => process.status === 'success')) {
    console.log('Publish Successful!');
  } else {
    processes
    .filter(process => process.status !== 'success')
    .forEach(process => {
      console.error(process.data);
    });
  }
};
