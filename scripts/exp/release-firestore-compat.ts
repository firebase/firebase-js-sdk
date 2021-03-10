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
import {
  mkdirSync,
  existsSync,
  rmdirSync,
  copyFileSync,
  statSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from 'fs';
import { projectRoot, readPackageJson } from '../utils';

const FIRESTORE_SRC = resolve(projectRoot, 'package/firestore');
const FIRESTORE_COMPAT_SRC = resolve(projectRoot, 'packages/firestore/compat');
const FIRESTORE_COMPAT_DEST = resolve(
  projectRoot,
  'packages-exp/firestore-compat'
);
const FIRESTORE_COMPAT_BINARY_SRC = resolve(
  FIRESTORE_COMPAT_SRC,
  'dist/compat'
);
const FIRESTORE_COMPAT_BINARY_DEST = resolve(
  FIRESTORE_COMPAT_DEST,
  'packages-exp/firestore-compat/dist'
);
function buildFirestoreCompat() {}

async function createFirestoreCompatProject() {
  // remove the dir if it exists
  if (existsSync(FIRESTORE_COMPAT_DEST)) {
    rmdirSync(FIRESTORE_COMPAT_DEST, { recursive: true });
  }

  copyRescursiveSync(FIRESTORE_COMPAT_SRC, FIRESTORE_COMPAT_DEST);
  copyRescursiveSync(FIRESTORE_COMPAT_BINARY_SRC, FIRESTORE_COMPAT_BINARY_DEST);

  // update root package.json
  transformFile(
    resolve(FIRESTORE_COMPAT_DEST, 'package.json'),
    async content => {
      const updatedContent = content.replace('../dist/compat', './dist');
      const compatPkgJson = JSON.parse(updatedContent);

      const firestorePkgJson = await readPackageJson(FIRESTORE_SRC);

      compatPkgJson.dependencies = {
        ...firestorePkgJson.dependencies,
        '@firebase/firestore': '0.0.900'
      };

      compatPkgJson.peerDependencies = {
        '@firebase/app': '0.x'
      };

      compatPkgJson.files = ['dist', 'memory', 'bundle'];

      return `${JSON.stringify(compatPkgJson, null, 2)}\n`;
    }
  );

  // update bundle/package.json
  await transformFile(
    resolve(FIRESTORE_COMPAT_DEST, 'bundle/package.json'),
    async content => content.replace('../../dist/compat', '../dist')
  );

  // update memory/package.json
  await transformFile(
    resolve(FIRESTORE_COMPAT_DEST, 'memory/package.json'),
    async content => content.replace('../../dist/compat', '../dist')
  );

  // update memory/bundle/packages.json
  await transformFile(
    resolve(FIRESTORE_COMPAT_DEST, 'memory/bundle/package.json'),
    async content => content.replace('../../../dist/compat', '../../dist')
  );
}

function copyRescursiveSync(src: string, dest: string) {
  if (!existsSync(src)) {
    return;
  }

  const srcStat = statSync(src);
  const isDirectory = srcStat.isDirectory();
  if (isDirectory) {
    mkdirSync(dest);
    for (const item of readdirSync(src)) {
      copyRescursiveSync(resolve(src, item), resolve(dest, item));
    }
  } else {
    // do not copy source file
    if (!src.includes('.ts')) {
      copyFileSync(src, dest);
    }
  }
}

function transformFile(
  path: string,
  transformer: (content: string) => Promise<string>
) {
  let content = readFileSync(path, 'utf8');

  writeFileSync(path, transformer(content), { encoding: 'utf8' });
}
