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

import { projectRoot as root } from '../../utils';
import { exec } from 'child-process-promise';
import ora from 'ora';

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
  await exec('git checkout .', { cwd: root });
}

export async function getCurrentSha() {
  return (
    await exec('git rev-parse --short HEAD', { cwd: root })
  ).stdout.trim();
}

export async function hasDiff() {
  const { stdout: diff } = await exec('git diff', { cwd: root });
  console.log(diff);
  return !!diff.trim();
}
