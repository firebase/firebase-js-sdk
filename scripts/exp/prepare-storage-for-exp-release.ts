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

import { projectRoot, readPackageJson } from '../utils';
import { writeFile as _writeFile, readFile as _readFile } from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';
import { createCompatProject } from './prepare-util';

const writeFile = promisify(_writeFile);
const packagePath = `${projectRoot}/packages/storage`;

/**
 * Transform package.json in @firebase/storage so that we can use scripts/exp/release.ts to release storage exp.
 * It does following things:
 * 1. Update package.json to point to exp binaries
 * 2. Update version to '0.0.900', the version number we choose for releasing exp packages
 *    (9 stands for v9, 900 to avoid conflict with official versions).
 *    The release script will append commit hash to it and release the package with that version.
 *    e.g. 0.0.900-exp.fe85035e1
 * 3. Replace peerDependencies with the exp version, so the release script can match and update them to the correct version.
 * 4. Replace imports with imports from exp packages in typing files.
 */
export async function prepare() {
  // Update package.json
  const packageJson = await readPackageJson(packagePath);
  const expPackageJson = await readPackageJson(`${packagePath}/exp`);
  packageJson.version = '0.0.900';

  packageJson.peerDependencies = {
    '@firebase/app-exp': '0.x'
  };

  packageJson.main = expPackageJson.main.replace('./', 'exp/');
  packageJson.module = expPackageJson.module.replace('./', 'exp/');
  packageJson.browser = expPackageJson.browser.replace('./', 'exp/');
  packageJson.esm5 = expPackageJson.esm5.replace('./', 'exp/');
  delete packageJson['esm2017'];

  packageJson.typings = expPackageJson.typings.replace('./', 'exp/');

  // include files to be published
  packageJson.files = ['exp/dist'];

  // update package.json files
  await writeFile(
    `${packagePath}/package.json`,
    `${JSON.stringify(packageJson, null, 2)}\n`,
    { encoding: 'utf-8' }
  );
}

export async function createStorageCompatProject() {
  const STORAGE_SRC = resolve(projectRoot, 'packages/storage');
  const STORAGE_COMPAT_SRC = resolve(projectRoot, 'packages/storage/compat');
  const STORAGE_COMPAT_DEST = resolve(
    projectRoot,
    'packages-exp/storage-compat'
  );
  const STORAGE_COMPAT_BINARY_SRC = resolve(STORAGE_SRC, 'dist/compat');
  const STORAGE_COMPAT_BINARY_DEST = resolve(STORAGE_COMPAT_DEST, 'dist');

  createCompatProject({
    srcDir: STORAGE_SRC,
    compatSrcDir: STORAGE_COMPAT_SRC,
    compatDestDir: STORAGE_COMPAT_DEST,
    compatBinarySrcDir: STORAGE_COMPAT_BINARY_SRC,
    compatBinaryDestDir: STORAGE_COMPAT_BINARY_DEST
  });
}
