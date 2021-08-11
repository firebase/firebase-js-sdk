/**
 * @license
 * Copyright 2021 Google LLC
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

import json from '@rollup/plugin-json';
import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';

import pkg from './package.json';

const deps = Object.keys(
  Object.assign({}, pkg.peerDependencies, pkg.dependencies)
);

function onWarn(warning, defaultWarn) {
  if (warning.code === 'CIRCULAR_DEPENDENCY') {
    throw new Error(warning);
  }
  defaultWarn(warning);
}

/**
 * ES5 Builds
 */
const es5BuildPlugins = [
  typescriptPlugin({
    typescript,
    abortOnError: false
  }),
  json()
];

const es5Builds = [
  /**
   * Node.js Build
   */
  {
    input: 'src/index.node.ts',
    output: [
      {
        file: pkg.main,
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: es5BuildPlugins,
    treeshake: {
      moduleSideEffects: false
    },
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    onwarn: onWarn
  },
  /**
   * Browser Builds
   */
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.esm5,
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: es5BuildPlugins,
    treeshake: {
      moduleSideEffects: false
    },
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    onwarn: onWarn
  }
];

/**
 * ES2017 Builds
 */
const es2017BuildPlugins = [
  typescriptPlugin({
    typescript,
    tsconfigOverride: {
      compilerOptions: {
        target: 'es2017'
      }
    },
    abortOnError: false
  }),
  json({ preferConst: true })
];

const es2017Builds = [
  /**
   * Browser Build
   */
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.browser,
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: es2017BuildPlugins,
    treeshake: {
      moduleSideEffects: false
    },
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    onwarn: onWarn
  }
];

export default [...es5Builds, ...es2017Builds];
