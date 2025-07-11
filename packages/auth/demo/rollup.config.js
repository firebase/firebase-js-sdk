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

const workerPlugins = [
  strip({ functions: ['debugAssert.*'] }),
  resolve({
    mainFields: ['webworker', 'module', 'main']
  }),
  typescriptPlugin({
    typescript,
    tsconfigOverride: {
      compilerOptions: {
        declaration: false,
        target: 'es2020',
        lib: [
          // TODO: remove this
          'dom',
          'es2020',
          'webworker'
        ]
      }
    }
  })
];

const esmBuilds = [
  {
    input: 'src/index.js',
    output: [{ file: pkg.browser, format: 'esm', sourcemap: true }],
    plugins: [
      strip({ functions: ['debugAssert.*'] }),
      resolve({ mainFields: ['module', 'main'] })
    ]
  },
  {
    input: 'src/worker/web-worker.ts',
    output: {
      file: pkg.webworker,
      format: 'esm',
      sourcemap: true
    },
    plugins: workerPlugins
  },
  {
    input: 'src/worker/service-worker.ts',
    output: {
      file: pkg.serviceworker,
      format: 'esm',
      sourcemap: true
    },
    plugins: workerPlugins
  }
];

export default [...esmBuilds];
