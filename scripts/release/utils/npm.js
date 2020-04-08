/**
 * @license
 * Copyright 2018 Google LLC
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

const { projectRoot: root } = require('../../utils');
const { spawn, exec } = require('child-process-promise');
const { mapPkgNameToPkgPath } = require('./workspace');
const { readFile: _readFile } = require('fs');
const { promisify } = require('util');
const Listr = require('listr');
const readFile = promisify(_readFile);

/**
 * Given NPM package name, get env variable name for its publish token.
 * @param {string} packageName NPM package name
 */
function getEnvTokenKey(packageName) {
  let result = packageName.replace('@firebase/', '');
  result = result.replace(/-/g, '_');
  result = result.toUpperCase();
  return `NPM_TOKEN_${result}`;
}

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
      // Write proxy registry token for this package to .npmrc.
      await exec(
        `echo "//wombat-dressing-room.appspot.com/:_authToken=${
          process.env[getEnvTokenKey(pkg)]
        }" >> ~/.npmrc`
      );
      args = [
        ...args,
        '--tag',
        'canary',
        '--registry',
        `https://wombat-dressing-room.appspot.com`
      ];
    }
    return spawn('npm', args, { cwd: path });
  } catch (err) {
    throw err;
  }
}

exports.publishToNpm = async (updatedPkgs, releaseType, renderer) => {
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
    exitOnError: false,
    renderer
  });

  console.log('\r\nPublishing Packages to NPM:');
  return tasks.run();
};
