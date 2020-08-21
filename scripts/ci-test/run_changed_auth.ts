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

import { getTestTasks, runTests } from './run_changed';
import { spawn } from 'child-process-promise';
import { resolve } from 'path';
const root = resolve(__dirname, '../..');
/**
 * run auth tests in a separate workflow because it depends on firebase-app.js which requires building the entire repo
 */
const includeOnlyPackages = ['@firebase/auth'];

async function run() {
  let testTasks = await getTestTasks();
  testTasks = testTasks.filter(t => includeOnlyPackages.includes(t.pkgName));

  // build all because auth tests need on firebase-app.js
  await spawn('npx', ['yarn', 'build'], { stdio: 'inherit', cwd: root });
  runTests(testTasks);
}

run();
