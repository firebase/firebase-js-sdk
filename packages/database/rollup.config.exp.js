/**
 * @license
 * Copyright 2018 Google LLC
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
import path from 'path';
import { importPathTransformer } from '../../scripts/exp/ts-transform-import-path';

import pkg from './exp/package.json';

const deps = Object.keys(
  Object.assign({}, pkg.peerDependencies, pkg.dependencies)
);

/**
 * ES5 Builds
 */
const es5BuildPlugins = [
  typescriptPlugin({
    typescript,
    transformers: [importPathTransformer]
  }),
  json()
];

const es5Builds = [
  /**
   * Node.js Build
   */
  {
    input: 'exp/index.ts',
    output: [
      { file: path.resolve('exp', pkg.main), format: 'cjs', sourcemap: true }
    ],
    plugins: es5BuildPlugins,
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  /**
   * Browser Builds
   */
  {
    input: 'exp/index.ts',
    output: [
      { file: path.resolve('exp', pkg.module), format: 'es', sourcemap: true }
    ],
    plugins: es5BuildPlugins,
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
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
    transformers: [importPathTransformer]
  }),
  json({ preferConst: true })
];

const es2017Builds = [
  /**
   * Browser Build
   */
  {
    input: 'exp/index.ts',
    output: [
      { file: path.resolve('exp', pkg.esm2017), format: 'es', sourcemap: true }
    ],
    plugins: es2017BuildPlugins,
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  }
];

export default [...es5Builds, ...es2017Builds];
