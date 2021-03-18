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

import { resolve } from 'path';
import { projectRoot, readPackageJson } from '../utils';
import { writeFileSync } from 'fs';
import { createCompatProject } from './prepare-util';

const packagePath = `${projectRoot}/packages/firestore`;

/**
 * Transform package.json in @firebase/firestore so that we can use scripts/exp/release.ts to release Firestore exp.
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
  const litePackageJson = await readPackageJson(`${packagePath}/lite`);
  packageJson.version = '0.0.900';

  packageJson.peerDependencies = {
    '@firebase/app-exp': '0.x'
  };

  packageJson.main = expPackageJson.main.replace('../', '');
  packageJson.module = expPackageJson.module.replace('../', '');
  packageJson.browser = expPackageJson.browser.replace('../', '');
  packageJson['react-native'] = expPackageJson['react-native'].replace(
    '../',
    ''
  );
  delete packageJson['main-esm2017'];
  delete packageJson['esm2017'];

  packageJson.typings = expPackageJson.typings.replace('../', '');

  // include files to be published
  packageJson.files = [
    ...packageJson.files,
    packageJson.typings,
    'lite/package.json',
    litePackageJson.typings.replace('../', '')
  ];

  // update package.json files
  writeFileSync(
    `${packagePath}/package.json`,
    `${JSON.stringify(packageJson, null, 2)}\n`,
    { encoding: 'utf-8' }
  );
}

export async function createFirestoreCompatProject() {
  const FIRESTORE_SRC = resolve(projectRoot, 'packages/firestore');
  const FIRESTORE_COMPAT_SRC = resolve(
    projectRoot,
    'packages/firestore/compat'
  );
  const FIRESTORE_COMPAT_DEST = resolve(
    projectRoot,
    'packages-exp/firestore-compat'
  );
  const FIRESTORE_COMPAT_BINARY_SRC = resolve(FIRESTORE_SRC, 'dist/compat');
  const FIRESTORE_COMPAT_BINARY_DEST = resolve(FIRESTORE_COMPAT_DEST, 'dist');

  createCompatProject({
    srcDir: FIRESTORE_SRC,
    compatSrcDir: FIRESTORE_COMPAT_SRC,
    compatDestDir: FIRESTORE_COMPAT_DEST,
    compatBinarySrcDir: FIRESTORE_COMPAT_BINARY_SRC,
    compatBinaryDestDir: FIRESTORE_COMPAT_BINARY_DEST
  });
}
