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

import simpleGit from 'simple-git';
import { projectRoot as root } from '../../utils';
import { exec } from 'child-process-promise';
import ora from 'ora';
const git = simpleGit(root);

export async function cleanTree() {
  const spinner = ora(' Cleaning git tree').start();
  await exec('git clean -xdf', {
    cwd: root
  });
  spinner.stopAndPersist({
    symbol: '✅'
  });
}

export async function resetWorkingTree() {
  await git.checkout('.');
}

export async function getCurrentSha() {
  return (await git.revparse(['--short', 'HEAD'])).trim();
}

export async function hasDiff() {
  const diff = await git.diff();
  console.log(diff);
  return !!diff;
}

// TODO(yifany): remove console log output that is for debugging purpose
export async function pushReleaseTagsToGithub() {
  console.log('Pushing release tags to GitHub ...');

  // Get tags pointing to HEAD
  // When running the release script, these tags should be release tags created by changeset
  console.log(`Running git tag --points-at HEAD at ${process.cwd()}`);
  const { stdout: rawTags } = await exec(`git tag --points-at HEAD`);
  console.log(`stdout for git tag: ${rawTags}`);

  const tags = rawTags.split(/\r?\n/).join(' ');

  console.log(`Running git rev-parse --abbrev-ref HEAD at ${process.cwd()}`);
  let { stdout: currentBranch } = await exec(`git rev-parse --abbrev-ref HEAD`);
  console.log(`stdout for git rev-parse: ${currentBranch}`);
  currentBranch = currentBranch.trim();

  console.log(
    `Running git push origin ${currentBranch} ${tags} --no-verify at ${root}`
  );
  const result = await exec(
    `git push origin ${currentBranch} ${tags} --no-verify`,
    { cwd: root }
  );
  console.log(`stdout for git push: ${result.stdout}`);
  console.log(`stderr for git push: ${result.stderr}`);

  console.log(`Pushing release tags to GitHub done.`);
}
