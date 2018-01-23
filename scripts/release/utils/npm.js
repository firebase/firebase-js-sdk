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

exports.publishToNpm = async (updatedPkgs, releaseType) => {
  for (const pkg of updatedPkgs) {
    const path = await mapPkgNameToPkgPath(pkg);
    const pkgJson = require(`${path}/package.json`);

    /**
     * Skip private packages
     */
    if (pkgJson.private) return;

    let args = ['publish'];

    /**
     * Ensure prereleases are tagged with the `next` tag
     */
    if (releaseType === 'Staging') {
      args = [...args, '--tag', 'next'];
    } else if (releaseType === 'Canary') {
      args = [...args, '--tag', 'canary'];
    }

    console.log(`📦  Publishing: ${pkg}@${pkgJson.version}`);
    await spawn('npm', args, { cwd: path, stdio: 'inherit' });
  }
};
