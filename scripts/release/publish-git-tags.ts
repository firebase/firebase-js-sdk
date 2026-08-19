/**
 * @license
 * Copyright 2026 Google LLC
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

import { exec } from 'child-process-promise';
import { projectRoot as root } from '../utils';
import { getAllPackages, mapPkgNameToPkgJson } from './utils/workspace';

async function pushReleaseTagsToGithub() {
  let tags;
  let { stdout: currentBranch } = await exec(`git rev-parse --abbrev-ref HEAD`);
  currentBranch = currentBranch.trim();
  // Get tags pointing to HEAD
  // When running the release script, these tags should be release tags created by changeset
  const { stdout: rawTags } = await exec(`git tag --points-at HEAD`);

  if (rawTags.trim()) {
    tags = rawTags.split(/\r?\n/);
  } else {
    console.log(
      'No tags found pointing to HEAD. Diffing tags in this branch vs main.'
    );
    const pkgNames = await getAllPackages();
    const mainVersions = new Map();
    await exec('git checkout main');
    await exec('git pull origin main');
    for (const pkgName of pkgNames) {
      const json = await mapPkgNameToPkgJson(pkgName);
      mainVersions.set(pkgName, json.version);
    }
    await exec(`git checkout ${currentBranch}`);
    for (const pkgName of pkgNames) {
      const json = await mapPkgNameToPkgJson(pkgName);
      if (mainVersions.get(pkgName) !== json.version) {
        console.log('diff found');
        const tag = `${pkgName}@${json.version}`;
        const tagExists = await exec(`git tag -l ${tag}`);
        if (!tagExists) {
          console.log('going to tag', tag);
          // await exec(`git tag ${tag}`);
        }
      }
    }
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('Unable to find GITHUB_TOKEN env variable.');
    process.exit(1);
  }

  // const authHeader = Buffer.from(`x-access-token:${token}`).toString('base64');

  // await exec(
  //   'git -c http.extraHeader="Authorization: Basic ' +
  //     authHeader +
  //     '"' +
  //     ` push origin ${currentBranch} ${tags.join(' ')} --no-verify`,
  //   {
  //     cwd: root
  //   }
  // );
}

pushReleaseTagsToGithub();
