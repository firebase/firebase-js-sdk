/**
 * @license
 * Copyright 2022 Google LLC
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

import glob from 'glob';
import { existsSync } from 'fs';
import { resolve, parse } from 'path';
import { projectRoot as root } from '../utils';

/**
 * Top level fields in package.json that may point to entry point and
 * typings files.
 */
const TOP_LEVEL_FIELDS = [
  'main',
  'browser',
  'module',
  'typings',
  'react-native',
  'cordova',
  'webworker',
  'main-esm'
];

interface Result {
  packageName: string;
  found: boolean;
  filePath: string;
  fieldPath: string;
}
const results: Result[] = [];

/**
 * Get paths to packages. Only check the ones we actually
 * publish (packages/*).
 */
function getPkgJsonPaths(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    glob('packages/**/package.json', (err, paths) => {
      if (err) reject(err);
      resolve(paths);
    });
  });
}

/**
 * Recursively check `exports` field in package.json.
 */
function checkExports(
  pkgName: string,
  pkgRoot: string,
  path: string = '',
  exports: Record<string, any>
) {
  for (const key in exports) {
    if (typeof exports[key] === 'string') {
      const filePath = resolve(pkgRoot, exports[key]);
      const result = {
        packageName: pkgName,
        found: false,
        filePath,
        fieldPath: `exports${path}[${key}]`
      };
      if (existsSync(filePath)) {
        result.found = true;
      }
      results.push(result);
    } else {
      checkExports(
        pkgName,
        pkgRoot,
        path ? `${path}[${key}]` : `[${key}]`,
        exports[key]
      );
    }
  }
}

async function main() {
  const paths = await getPkgJsonPaths();

  for (const path of paths) {
    const { dir } = parse(path);
    if (dir.includes('node_modules') || dir.includes('/demo')) {
      continue;
    }
    const pkgRoot = resolve(root, dir);
    if (existsSync(`${pkgRoot}/package.json`)) {
      const pkg = require(`${pkgRoot}/package.json`);
      if (!pkg.name) {
        // Probably dummy package.json with 'type: module'
        continue;
      }
      console.log(`Checking ${dir}/package.json`);

      /**
       * Check top level fields.
       */
      for (const field of TOP_LEVEL_FIELDS) {
        if (pkg[field]) {
          const filePath = resolve(pkgRoot, pkg[field]);
          const result = {
            packageName: pkg.name,
            found: false,
            filePath,
            fieldPath: field
          };
          if (existsSync(filePath)) {
            result.found = true;
          }
          results.push(result);
        }
      }
      /**
       * Check all levels of exports field.
       */
      if (pkg.exports) {
        checkExports(pkg.name, pkgRoot, '', pkg.exports);
      }
    }
  }

  let missingPaths: boolean = false;

  for (const result of results) {
    if (!result.found) {
      missingPaths = true;
      console.log(
        `${result.packageName}: Field "${result.fieldPath}" ` +
          `points to ${result.filePath} which is not found.`
      );
    }
  }

  /**
   * Fail CI if any missing paths found.
   */
  if (missingPaths) {
    process.exit(1);
  }
}

main();
