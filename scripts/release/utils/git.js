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

const simpleGit = require('simple-git/promise');
const { projectRoot: root } = require('./constants');
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

exports.commitAndTag = async (updatedVersions, releaseType) => {
  await exec('git add */package.json');

  let result = await exec(`git commit -m "Publish firebase@${updatedVersions.firebase}"`);

  console.log(result);

  await Promise.all(
    Object.keys(updatedVersions)
      .map(name => ({ name, version: updatedVersions[name] }))
      .map(async ({name, version}) => {
        const result = await exec(`git tag ${name}@${version}`);
        console.log(result);
      })
  );
};

exports.pushUpdatesToGithub = async () => {
  let { stdout:currentBranch, stderr } = await exec(`git rev-parse --abbrev-ref HEAD`);
  currentBranch = currentBranch.trim();
  
  await exec(`git push origin ${currentBranch} --follow-tags --no-verify -u`, { cwd: root });
};

exports.resetWorkingTree = async () => {
  await git.checkout('.');
};

exports.getCurrentSha = async () => {
  return (await git.revparse(['--short', 'HEAD'])).trim();
};

exports.hasDiff = async () => {
  return !!await git.diff();
};
