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
  writeFileSync,
  statSync,
  readFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
  copyFileSync,
  rmdirSync
} from 'fs';
import { projectRoot, readPackageJson } from '../utils';

export interface CompatConfig {
  srcDir: string;
  compatSrcDir: string;
  compatDestDir: string;
  compatBinarySrcDir: string;
  compatBinaryDestDir: string;
}

export async function createCompatProject(config: CompatConfig) {
  const {
    srcDir,
    compatSrcDir,
    compatDestDir,
    compatBinarySrcDir,
    compatBinaryDestDir
  } = config;
  // remove the dir if it exists
  if (existsSync(compatDestDir)) {
    rmdirSync(compatDestDir, { recursive: true });
  }

  copyRecursiveSync(compatSrcDir, compatDestDir);
  copyRecursiveSync(
    compatBinarySrcDir,
    compatBinaryDestDir,
    /* include d.ts files*/ true
  );

  // update root package.json
  await transformFile(resolve(compatDestDir, 'package.json'), async content => {
    const updatedContent = content.replace(/\.\.\/dist\/compat/g, './dist');
    const compatPkgJson = JSON.parse(updatedContent);

    const srcPkgJson = await readPackageJson(srcDir);

    compatPkgJson.dependencies = {
      ...srcPkgJson.dependencies,
      [srcPkgJson.name]: srcPkgJson.version
    };

    compatPkgJson.files = ['dist'];

    return `${JSON.stringify(compatPkgJson, null, 2)}\n`;
  });
}

const FIREBASE_EXP_DIR = `${projectRoot}/packages-exp/firebase-exp`;
export async function addCompatToFirebasePkgJson(compatPkgNames: string[]) {
  const compatDeps: Record<string, string> = {};
  for (const pkgName of compatPkgNames) {
    compatDeps[pkgName] = '0.0.900';
  }

  const firebasePkgJson = await readPackageJson(FIREBASE_EXP_DIR);
  firebasePkgJson.dependencies = {
    ...firebasePkgJson.dependencies,
    ...compatDeps
  };

  writeFileSync(
    `${FIREBASE_EXP_DIR}/package.json`,
    `${JSON.stringify(firebasePkgJson, null, 2)}\n`,
    { encoding: 'utf-8' }
  );
}

export function copyRecursiveSync(
  src: string,
  dest: string,
  includeTs: boolean = false
) {
  if (!existsSync(src)) {
    return;
  }

  const srcStat = statSync(src);
  const isDirectory = srcStat.isDirectory();
  if (isDirectory) {
    mkdirSync(dest);
    for (const item of readdirSync(src)) {
      copyRecursiveSync(resolve(src, item), resolve(dest, item), includeTs);
    }
  } else {
    // do not copy source file
    if (src.includes('.ts') && !includeTs) {
      return;
    }

    copyFileSync(src, dest);
  }
}

export async function transformFile(
  path: string,
  transformer: (content: string) => Promise<string>
) {
  let content = readFileSync(path, 'utf8');

  writeFileSync(path, await transformer(content), { encoding: 'utf8' });
}
