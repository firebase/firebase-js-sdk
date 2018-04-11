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

const { projectRoot: root } = require('./constants');
const { spawn } = require('child-process-promise');
const { mapPkgNameToPkgPath } = require('./workspace');
const { readFile: _readFile } = require('fs');
const { promisify } = require('util');
const Listr = require('listr');
const readFile = promisify(_readFile);

async function publishPackage(pkg, releaseType) {
  try {
    const path = await mapPkgNameToPkgPath(pkg);

    const { private } = JSON.parse(
      await readFile(`${path}/package.json`, 'utf8')
    );

    /**
     * Skip private packages
     */
    if (private) return;

    /**
     * Default publish args
     */

    let args = ['publish', '--access', 'public'];

    /**
     * Ensure prereleases are tagged with the `next` tag
     */
    if (releaseType === 'Staging') {
      args = [...args, '--tag', 'next'];
    } else if (releaseType === 'Canary') {
      args = [...args, '--tag', 'canary'];
    }

    return spawn('npm', args, { cwd: path });
  } catch (err) {
    throw err;
  }
}

exports.publishToNpm = async (updatedPkgs, releaseType) => {
  const taskArray = await Promise.all(
    updatedPkgs.map(async pkg => {
      const path = await mapPkgNameToPkgPath(pkg);

      /**
       * Can't require here because we have a cached version of the required JSON
       * in memory and it doesn't contain the updates
       */
      const { version } = JSON.parse(
        await readFile(`${path}/package.json`, 'utf8')
      );
      return {
        title: `📦  ${pkg}@${version}`,
        task: () => publishPackage(pkg, releaseType)
      };
    })
  );
  const tasks = new Listr(taskArray, {
    concurrent: false,
    exitOnError: false
  });

  console.log('\r\nPublishing Packages to NPM:');
  return tasks.run();
};
