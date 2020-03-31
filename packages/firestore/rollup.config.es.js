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

import * as path from 'path';

import typescriptPlugin from 'rollup-plugin-typescript2';
import sourcemaps from 'rollup-plugin-sourcemaps';
import typescript from 'typescript';

import pkg from './package.json';
import memoryPkg from './memory/package.json';

const es5BuildPlugins = [
  typescriptPlugin({
    typescript,
    compilerOptions: {
      allowJs: true,
    },
    include: [
      "dist/*.js"
    ],
  }),
];

const browserBuilds = [
  {
    input: pkg.esm2017,
    output: { file: pkg.module, format: 'es', sourcemap: true },
    plugins: es5BuildPlugins
  },
  {
    input: path.resolve('./memory', memoryPkg.esm2017),
    output: {
      file: path.resolve('./memory', memoryPkg.module),
      format: 'es',
      sourcemap: true
    },
    plugins: es5BuildPlugins
  },
  {
    input: pkg.esm2017,
    output: { file: pkg.browser, format: 'cjs', sourcemap: true },
    plugins: [sourcemaps()]
  },
  {
    input: path.resolve('./memory', memoryPkg.esm2017),
    output: {
      file: path.resolve('./memory', memoryPkg.browser),
      format: 'cjs',
      sourcemap: true
    },
    plugins: [sourcemaps()]
  }
];

const nodeBuilds = [
  {
    input: pkg.mainES2017,
    output: [{ file: pkg.main, format: 'cjs', sourcemap: true }],
    plugins: [sourcemaps()]
  },
  {
    input: path.resolve('./memory', memoryPkg.mainES2017),
    output: [
      {
        file: path.resolve('./memory', memoryPkg.main),
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: [sourcemaps()]
  }
];

export default [...browserBuilds, ...nodeBuilds];
