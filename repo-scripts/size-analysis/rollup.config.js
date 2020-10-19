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

import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';
import pkg from './package.json';
import json from '@rollup/plugin-json';

const deps = Object.keys(
  Object.assign({}, pkg.peerDependencies, pkg.dependencies)
);

export default [
  {
    input: 'test/test-inputs/subsetExports.ts',
    output: [
      {
        file: 'test/test-inputs/dist/subsetExportsBundle.js',
        format: 'es',
        sourcemap: false
      }
    ],
    plugins: [
      typescriptPlugin({
        typescript,
        tsconfigOverride: {
          compilerOptions: {
            target: 'es2017',
            module: 'es2015'
          }
        }
      }),
      json({
        preferConst: true
      })
    ],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  }
];
