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
import { existsSync, writeFileSync } from 'fs';
import { resolve, parse } from 'path';
import { projectRoot as root } from '../utils';

interface Result {
  packageName: string;
  found: boolean;
  filePath: string;
  fieldPath: string;
}
const results: Result[] = [];

const nodeOnlyMessages: string[] = [];
const singleNodeFieldMessages: string[]  =  [];
const requireOnlyMessages: string[]  =  [];
const changedPackages:string[] = [];

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
      if (key === 'node') {
        singleNodeFieldMessages.push(`${pkgName} > ${filePath}`)
      }
      if (key === 'require' && !path.includes('node') && !path.includes('browser')) {
        console.log(path.includes('browser'));
        requireOnlyMessages.push(`${pkgName} > ${filePath}`)
      }
    } else {
      if (key === 'node') {
        let requirePath = exports[key]['require'];
        if (!requirePath) {
          requirePath = exports[key]['default'];
        }
        if (!requirePath) {
          console.log(`Couldnt find node require bundle for ${pkgName}`);
        }
        if (!exports.default) {
          console.log(`Couldnt find default bundle for ${pkgName}`);
        }
        // if (requirePath.includes('node')) {
        //   requirePath = 'NODE_ONLY_BUNDLE_FIXME';
        //   nodeOnlyMessages.push(`${pkgName} ${path} cjs bundle is Node only`);
        // }
        if (!exports['browser']) {
          exports['browser'] = {
            require: requirePath,
            import: exports['default']
          }
          changedPackages.push(pkgName);
        }
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
      // console.log(`Checking ${dir}/package.json`);

      /**
       * Check all levels of exports field.
       */
      if (pkg.exports) {
        checkExports(pkg.name, pkgRoot, '', pkg.exports);
        // console.log(pkg.exports);
      }
      if (changedPackages.includes(pkg.name)) {
        writeFileSync(`${pkgRoot}/package.json`, JSON.stringify(pkg, null, 2) + '\n', { encoding: 'utf-8'});
      }
    }
  }

  console.log('SINGLE NODE FIELD');
  console.log(singleNodeFieldMessages.join('\n'));
  console.log('SINGLE REQUIRE FIELD');
  console.log(requireOnlyMessages.join('\n'));
  console.log(nodeOnlyMessages.join('\n'));

  let missingPaths: boolean = false;

  // for (const result of results) {
  //   if (!result.found) {
  //     missingPaths = true;
  //     console.log(
  //       `${result.packageName}: Field "${result.fieldPath}" ` +
  //         `points to ${result.filePath} which is not found.`
  //     );
  //   }
  // }

  /**
   * Fail CI if any missing paths found.
   */
  if (missingPaths) {
    process.exit(1);
  }
}

main();
