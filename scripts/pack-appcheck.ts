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
import { resolve } from 'path';
import { projectRoot, readPackageJson } from './utils';
import fs from 'fs';

const outputDir = `${projectRoot}/appcheck`;
async function packAppCheck() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const appCheckPkgPath = resolve(projectRoot, 'packages/app-check');
  // make @firebase/app-check tarball
  await spawn('yarn', ['build:deps'], {
    cwd: appCheckPkgPath,
    stdio: 'inherit'
  });

  // Remove app-check-types and app-check-interop-types from the dependencies.
  // Otherwise an error will occur when installing the tarball because these packages have not been published to npm yet.
  const packageJson = await readPackageJson(appCheckPkgPath);

  delete packageJson.dependencies['@firebase/app-check-types'];
  delete packageJson.dependencies['@firebase/app-check-interop-types'];

  fs.writeFileSync(
    `${appCheckPkgPath}/package.json`,
    `${JSON.stringify(packageJson, null, 2)}\n`,
    { encoding: 'utf-8' }
  );

  // make a firebase tarball that bundles @firebase/app-check and with typings. Also creates firebase-app-check.js

  // build app-exp first because firestore needs it
  await spawn('yarn', ['build'], {
    cwd: resolve(projectRoot, 'packages-exp/app-exp'),
    stdio: 'inherit'
  });

  const firebasePkgPath = resolve(projectRoot, 'packages/firebase');
  await spawn('yarn', ['build:deps'], {
    cwd: firebasePkgPath,
    stdio: 'inherit'
  });

  // Remove @firebase/app-check from the dependencies.
  // Otherwise an error will occur when installing the tarball because @firebase/app-check has not been published to npm yet.
  const firebasePackageJson = await readPackageJson(firebasePkgPath);
  delete firebasePackageJson.dependencies['@firebase/app-check'];
  fs.writeFileSync(
    `${firebasePkgPath}/package.json`,
    `${JSON.stringify(firebasePackageJson, null, 2)}\n`,
    { encoding: 'utf-8' }
  );

  await spawn('npm', ['pack', firebasePkgPath], {
    cwd: outputDir,
    stdio: 'inherit'
  });

  // copy CDN scripts to the output folder
  const filesToCopy = [
    'firebase.js',
    'firebase-app-check.js',
    'firebase-database.js',
    'firebase-storage.js',
    'firebase-functions.js',
    'firebase-app-check.js.map',
    'firebase-database.js.map',
    'firebase-storage.js.map',
    'firebase-functions.js.map'
  ];
  for (const fileName of filesToCopy) {
    fs.copyFileSync(
      `${firebasePkgPath}/${fileName}`,
      `${outputDir}/${fileName}`
    );
  }
}

packAppCheck();
