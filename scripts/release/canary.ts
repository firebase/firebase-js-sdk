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

import { getCurrentSha } from './utils/git';
import {
  getAllPackages,
  mapPkgNameToPkgJson,
  updateWorkspaceVersions,
  mapPkgNameToPkgPath
} from './utils/workspace';
import Listr from 'listr';
import { readFile as _readFile } from 'fs';
import { promisify } from 'util';
import { exec, spawn } from 'child-process-promise';

const readFile = promisify(_readFile);

/**
 *
 * NOTE: Canary releases are performed in CI.
 * Canary release does NOT do the following compared to a regular release:
 * - Commit/Tag the release (we aren't creating new tags, just exposing the
 *   current version)
 * - Push updates to github (no updates to push)
 */
export async function runCanaryRelease(): Promise<void> {
  /**
   * Set the canary version following the pattern below:
   *
   * Version: <version>-canary.<git sha>
   *
   * A user would be able to install a package canary as follows:
   *
   * $ npm install @firebase/app@0.0.0-canary.0000000
   */
  const sha = await getCurrentSha();
  const updates = await getAllPackages();
  const pkgJsons = await Promise.all(
    updates.map(pkg => mapPkgNameToPkgJson(pkg))
  );
  const versions = pkgJsons.reduce<{ [key: string]: string }>(
    (map, pkgJson) => {
      const { version, name } = pkgJson;
      map[name] = `${version}-canary.${sha}`;
      return map;
    },
    {}
  );

  /**
   * Update the package.json dependencies throughout the SDK
   */
  await updateWorkspaceVersions(versions, true);

  await publishToNpm(updates);
}

/**
 * Given NPM package name, get env variable name for its publish token.
 * @param {string} packageName NPM package name
 */
function getEnvTokenKey(packageName: string) {
  let result = packageName.replace('@firebase/', '');
  result = result.replace(/-/g, '_');
  result = result.toUpperCase();
  return `NPM_TOKEN_${result}`;
}

async function publishPackage(pkg: string) {
  try {
    const path = await mapPkgNameToPkgPath(pkg);

    const { private: isPrivate } = JSON.parse(
      await readFile(`${path}/package.json`, 'utf8')
    );

    /**
     * Skip private packages
     */
    if (isPrivate) return;

    /**
     * publish args
     */
    const args = [
      'publish',
      '--access',
      'public',
      '--tag',
      'canary',
      '--registry',
      'https://wombat-dressing-room.appspot.com'
    ];

    // Write proxy registry token for this package to .npmrc.
    await exec(
      `echo "//wombat-dressing-room.appspot.com/:_authToken=${
        process.env[getEnvTokenKey(pkg)]
      }" >> ~/.npmrc`
    );

    return spawn('npm', args, { cwd: path });
  } catch (err) {
    throw err;
  }
}

async function publishToNpm(updatedPkgs: string[]) {
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
        task: () => publishPackage(pkg)
      };
    })
  );
  const tasks = new Listr(taskArray, {
    concurrent: false,
    exitOnError: false
  });

  console.log('\r\nPublishing Packages to NPM:');
  return tasks.run();
}
