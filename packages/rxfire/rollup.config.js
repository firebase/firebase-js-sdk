/**
 * @license
 * Copyright 2018 Google Inc.
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
import resolveModule from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import typescriptPlugin from 'rollup-plugin-typescript2';
import { uglify } from 'rollup-plugin-uglify';
import typescript from 'typescript';
import pkg from './package.json';

import authPkg from './auth/package.json';
import storagePkg from './storage/package.json';
import functionsPkg from './functions/package.json';
import firestorePkg from './firestore/package.json';
import databasePkg from './database/package.json';

const pkgsByName = {
  auth: authPkg,
  storage: storagePkg,
  functions: functionsPkg,
  firestore: firestorePkg,
  database: databasePkg
};

const plugins = [resolveModule(), commonjs()];

const external = [...Object.keys(pkg.peerDependencies || {}), 'rxjs/operators'];

/**
 * Global UMD Build
 */
const GLOBAL_NAME = 'rxfire';

const components = ['auth', 'storage', 'functions', 'firestore', 'database'];
const componentBuilds = components
  .map(component => {
    const pkg = pkgsByName[component];
    return [
      {
        input: `${component}/index.ts`,
        output: [
          {
            file: resolve(component, pkg.main),
            format: 'cjs',
            sourcemap: true
          },
          {
            file: resolve(component, pkg.module),
            format: 'es',
            sourcemap: true
          }
        ],
        plugins: [
          ...plugins,
          typescriptPlugin({
            typescript
          })
        ],
        external
      },
      {
        input: `${component}/index.ts`,
        output: {
          file: `rxfire-${component}.js`,
          format: 'iife',
          sourcemap: true,
          extend: true,
          name: GLOBAL_NAME,
          globals: {
            rxfire: GLOBAL_NAME,
            rxjs: 'rxjs',
            'rxjs/operators': 'rxjs.operators'
          }
        },
        plugins: [
          ...plugins,
          typescriptPlugin({
            typescript,
            tsconfigOverride: {
              compilerOptions: {
                declaration: false
              }
            }
          }),
          uglify()
        ],
        external
      }
    ];
  })
  .reduce((a, b) => a.concat(b), []);

export default [...componentBuilds];
