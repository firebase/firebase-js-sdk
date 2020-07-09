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

import { spawn } from 'child-process-promise';
const { projectRoot: root } = require('../../utils');
const ora = require('ora');

export async function reinstallDeps() {
  const spinner = ora(' Reinstalling Dependencies').start();
  await spawn('yarn', null, {
    cwd: root
  });
  spinner.stopAndPersist({
    symbol: '✅'
  });
}

export async function buildPackages() {
  const spinner = ora(' Building Packages').start();
  await spawn('yarn', ['build:release'], {
    cwd: root
  });
  spinner.stopAndPersist({
    symbol: '✅'
  });
}
