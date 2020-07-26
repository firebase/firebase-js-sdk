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
import path from 'path';

const writeFile = promisify(_writeFile);
const readFile = promisify(_readFile);
const packagePath = `${projectRoot}/packages/firestore`;

//
/**
 * Transform package.json in @firebase/firestore so that we can use scripts/exp/release.ts to release Firestore exp.
 * It does following things:
 * 1. Update package.json to point to exp binaries
 * 2. Update version to '0.0.800', the version number we choose for releasing exp packages
 *    (8 stands for v8, 800 to avoid conflict with official versions).
 *    The release script will append commit hash to it and release the package with that version.
 *    e.g. 0.0.800-exp.fe85035e1
 * 3. Replace peerDependencies with the exp version, so the release script can match and update them to the correct version.
 * 4. Replace imports with imports from exp packages in typing files.
 */
export async function prepare() {
  // Update package.json
  const packageJson = await readPackageJson(packagePath);
  const expPackageJson = await readPackageJson(`${packagePath}/exp`);
  const litePackageJson = await readPackageJson(`${packagePath}/lite`);
  packageJson.version = '0.0.800';

  packageJson.peerDependencies = {
    '@firebase/app-exp': '0.x',
    '@firebase/app-types-exp': '0.x'
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

  delete packageJson.scripts.prepare;

  // update package.json files
  await writeFile(
    `${packagePath}/package.json`,
    `${JSON.stringify(packageJson, null, 2)}\n`,
    { encoding: 'utf-8' }
  );

  const expTypingPath = `${packagePath}/${packageJson.typings}`;
  const liteTypingPath = path.resolve(
    `${packagePath}/lite`,
    litePackageJson.typings
  );

  // remove -exp in typings files
  await replaceAppTypesExpInFile(expTypingPath);
  await replaceAppTypesExpInFile(liteTypingPath);
}

async function replaceAppTypesExpInFile(filePath: string): Promise<void> {
  const fileContent = await readFile(filePath, { encoding: 'utf-8' });
  const newFileContent = fileContent.replace(
    '@firebase/app-types-exp',
    '@firebase/app-types'
  );

  await writeFile(filePath, newFileContent, { encoding: 'utf-8' });
}
