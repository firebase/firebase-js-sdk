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
import { promisify } from 'util';
import { resolve } from 'path';
import { createCompatProject } from './prepare-util';

const writeFile = promisify(_writeFile);
const packagePath = `${projectRoot}/packages/database`;

/**
 * Transform package.json in @firebase/database so that we can use scripts/exp/release.ts to release Database exp.
 * It does following things:
 * 1. Update package.json to point to exp binaries
 * 2. Update version to '0.0.900', the version number we choose for releasing exp packages
 *    (9 stands for v9, 900 to avoid conflict with official versions).
 *    The release script will append commit hash to it and release the package with that version.
 *    e.g. 0.0.900-exp.fe85035e1
 * 3. Replace peerDependencies with the exp version, so the release script can match and update them to the correct version.
 */
export async function prepare() {
  // Update package.json
  const packageJson = await readPackageJson(packagePath);
  const expPackageJson = await readPackageJson(`${packagePath}/exp`);
  packageJson.version = '0.0.900';

  packageJson.peerDependencies = {
    '@firebase/app-exp': '0.x'
  };

  packageJson.main = expPackageJson.main.replace('../', '');
  packageJson.module = expPackageJson.module.replace('../', '');
  packageJson.browser = expPackageJson.browser.replace('../', '');
  packageJson.esm5 = expPackageJson.esm5.replace('../', '');
  delete packageJson['esm2017'];

  packageJson.typings = expPackageJson.typings.replace('../', '');

  // include files to be published
  packageJson.files = [...packageJson.files, packageJson.typings];

  // update package.json files
  await writeFile(
    `${packagePath}/package.json`,
    `${JSON.stringify(packageJson, null, 2)}\n`,
    { encoding: 'utf-8' }
  );
}

export async function createDatabaseCompatProject() {
  const DATABASE_SRC = resolve(projectRoot, 'packages/database');
  const DATABASE_COMPAT_SRC = resolve(projectRoot, 'packages/database/compat');
  const DATABASE_COMPAT_DEST = resolve(
    projectRoot,
    'packages-exp/database-compat'
  );
  const DATABASE_COMPAT_BINARY_SRC = resolve(DATABASE_SRC, 'dist/compat');
  const DATABASE_COMPAT_BINARY_DEST = resolve(DATABASE_COMPAT_DEST, 'dist');

  createCompatProject({
    srcDir: DATABASE_SRC,
    compatSrcDir: DATABASE_COMPAT_SRC,
    compatDestDir: DATABASE_COMPAT_DEST,
    compatBinarySrcDir: DATABASE_COMPAT_BINARY_SRC,
    compatBinaryDestDir: DATABASE_COMPAT_BINARY_DEST
  });
}
