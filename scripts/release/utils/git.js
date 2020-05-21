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

const simpleGit = require('simple-git/promise');
const { projectRoot: root } = require('../../utils');
const git = simpleGit(root);
const { exec } = require('child-process-promise');
const ora = require('ora');

exports.cleanTree = async () => {
  const spinner = ora(' Cleaning git tree').start();
  await exec('git clean -xdf', {
    cwd: root
  });
  spinner.stopAndPersist({
    symbol: '✅'
  });
};

/**
 * Commits the current state of the repository and tags it with the appropriate
 * version changes.
 *
 * Returns the tagged commits
 */
exports.commitAndTag = async updatedVersions => {
  await exec('git add */package.json yarn.lock');

  let result = await exec(
    `git commit -m "Publish firebase@${updatedVersions.firebase}"`
  );

  const tags = [];
  await Promise.all(
    Object.keys(updatedVersions)
      .map(name => ({ name, version: updatedVersions[name] }))
      .map(async ({ name, version }) => {
        const tag = `${name}@${version}`;
        const result = await exec(`git tag ${tag}`);
        tags.push(tag);
      })
  );
  return tags;
};

exports.pushUpdatesToGithub = async tags => {
  let { stdout: currentBranch, stderr } = await exec(
    `git rev-parse --abbrev-ref HEAD`
  );
  currentBranch = currentBranch.trim();

  await exec(`git push origin ${currentBranch} --no-verify -u`, { cwd: root });
  await exec(`git push origin ${tags.join(' ')} --no-verify`, { cwd: root });
};

exports.resetWorkingTree = async () => {
  await git.checkout('.');
};

exports.getCurrentSha = async () => {
  return (await git.revparse(['--short', 'HEAD'])).trim();
};

exports.hasDiff = async () => {
  const diff = await git.diff();
  console.log(diff);
  return !!diff;
};

export async function pushReleaseTagsToGithub() {
  // Get tags pointing to HEAD
  // When running the release script, these tags should be release tags created by changeset
  const { stdout: rawTags, stderr } = await exec(`git tag --points-at HEAD`);

  const tags = rawTags.split('\r\n');

  let { stdout: currentBranch, stderr } = await exec(
    `git rev-parse --abbrev-ref HEAD`
  );
  currentBranch = currentBranch.trim();

  await exec(`git push origin ${tags.join(' ')} --no-verify`, { cwd: root });
}
