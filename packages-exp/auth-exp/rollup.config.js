/**
 * @license
 * Copyright 2019 Google LLC
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

import strip from '@rollup/plugin-strip';
import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';
import pkg from './package.json';

const deps = Object.keys(
  Object.assign({}, pkg.peerDependencies, pkg.dependencies)
);

/**
 * Common plugins for all builds
 */
const commonPlugins = [
  strip({
    functions: ['debugAssert.*']
  })
];

/**
 * ES5 Builds
 */
const es5BuildPlugins = [
  ...commonPlugins,
  typescriptPlugin({
    typescript
  })
];

const es5Builds = [
  /**
   * Browser Builds
   */
  {
    input: 'index.ts',
    output: [{ file: pkg.browser, format: 'cjs', sourcemap: true }],
    plugins: es5BuildPlugins,
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  {
    input: 'index.ts',
    output: [{ file: pkg.module, format: 'es', sourcemap: true }],
    plugins: es5BuildPlugins,
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  /**
  * Web Worker Build (compiled without DOM)
  */
  {
    input: 'index.webworker.ts',
    output: [{ file: pkg.webworker, format: 'es', sourcemap: true }],
    plugins: [
      ...commonPlugins,
      typescriptPlugin({
        typescript,
        tsconfigOverride: {
          compilerOptions: {
            lib: [
              // Remove dom after we figure out why navigator stuff doesn't exist
              "dom", 
              "es6",
              "webworker"
            ]
          }
        }
      })
    ],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  /**
   * Node.js Build
   */
  {
    input: 'index.node.ts',
    output: [{ file: pkg.main, format: 'cjs', sourcemap: true }],
    plugins: es5BuildPlugins,
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  }
];

/**
 * ES2017 Builds
 */
const es2017BuildPlugins = [
  ...commonPlugins,
  typescriptPlugin({
    typescript,
    tsconfigOverride: {
      compilerOptions: {
        target: 'es2017'
      }
    }
  })
];

const es2017Builds = [
  /**
   *  Browser Builds
   */
  {
    input: 'index.ts',
    output: {
      file: pkg.esm2017,
      format: 'es',
      sourcemap: true
    },
    plugins: es2017BuildPlugins,
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  }
];

export default [...es5Builds, ...es2017Builds];
