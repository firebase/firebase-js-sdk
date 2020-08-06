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
import resolve from '@rollup/plugin-node-resolve';
import strip from '@rollup/plugin-strip';
import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';

import pkg from './package.json';

/**
 * Common plugins for all builds
 */
const commonPlugins = [
  strip({
    functions: ['debugAssert.*']
  }),
  resolve()
];

const es5Builds = [
  /**
   * Browser Builds
   */
  {
    input: 'src/index.js',
    output: [{ file: pkg.bundle, format: 'esm', sourcemap: true }],
    plugins: commonPlugins
  },
  {
    input: 'src/worker/index.ts',
    output: [{ file: pkg.worker, format: 'esm', sourcemap: true }],
    plugins: [
      ...commonPlugins,
      typescriptPlugin({
        typescript,
        tsconfigOverride: {
          compilerOptions: {
            lib: [
              // TODO: remove this
              'dom',
              'es2015',
              'webworker'
            ]
          }
        }
      })
    ]
  }
];

export default [...es5Builds];
