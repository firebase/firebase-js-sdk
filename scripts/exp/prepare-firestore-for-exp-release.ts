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

import { spawn } from 'child-process-promise';
import { projectRoot, readPackageJson } from '../utils';
import { writeFile as _writeFile } from 'fs';
import { promisify } from 'util';
const writeFile = promisify(_writeFile);
const packagePath = `${projectRoot}/packages/firestore`;

// Prepare @firebase/firestore, so scripts/exp/release.ts can be used to release it
export async function prepare() {
  // Build exp and lite packages
  await spawn('yarn', ['build:exp'], {
    cwd: packagePath,
    stdio: 'inherit'
  });

  await spawn('yarn', ['build:lite'], {
    cwd: packagePath,
    stdio: 'inherit'
  });

  // Update package.json
  const packageJson = await readPackageJson(packagePath);
  const expPackageJson = await readPackageJson(`${packageJson}/exp`);
  packageJson.version = '0.0.800';

  packageJson.peerDependencies = {
    '@firebase/app-exp': '0.x',
    '@firebase/app-exp-types': '0.x'
  };

  packageJson.main = expPackageJson.main.replace('../', '');
  packageJson.module = expPackageJson.module.replace('../', '');
  packageJson.browser = expPackageJson.browser.replace('../', '');
  packageJson['react-native'] = expPackageJson['react-native'].replace(
    '../',
    ''
  );

  packageJson.typing = expPackageJson.typings.replace('../', '');

  delete packageJson.scripts.prepare;

  // update package.json files
  await writeFile(
    `${packagePath}/package.json`,
    `${JSON.stringify(packageJson, null, 2)}\n`,
    { encoding: 'utf-8' }
  );
}
