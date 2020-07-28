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

import * as path from 'path';

import typescriptPlugin from 'rollup-plugin-typescript2';
import sourcemaps from 'rollup-plugin-sourcemaps';
import typescript from 'typescript';
import { terser } from 'rollup-plugin-terser';

import pkg from './package.json';
import memoryPkg from './memory/package.json';

const util = require('./rollup.shared');

// This file defines the second rollup pipeline and transpiles the ES2017 SDK
// into ES5 code. By splitting the build process into two independent build
// pipelines, we take advantage of tree shaking in ES2017 builds even for
// language levels that don't support tree shaking.

const browserPlugins = [
  typescriptPlugin({
    typescript,
    compilerOptions: {
      allowJs: true
    },
    include: ['dist/*.js']
  }),
  terser({
    output: {
      comments: 'all',
      beautify: true
    },
    mangle: true
  }),
  sourcemaps()
];

const nodePlugins = [
  typescriptPlugin({
    typescript,
    compilerOptions: {
      allowJs: true
    },
    include: ['dist/*.js']
  }),
  sourcemaps()
];

const browserBuilds = [
  {
    input: pkg.esm2017,
    output: { file: pkg.module, format: 'es', sourcemap: true },
    plugins: browserPlugins,
    external: util.resolveBrowserExterns
  },
  {
    input: pkg.esm2017,
    output: { file: pkg.browser, format: 'cjs', sourcemap: true },
    plugins: browserPlugins,
    external: util.resolveBrowserExterns
  }
];

const nodeBuilds = [
  {
    input: pkg['main-esm2017'],
    output: [{ file: pkg.main, format: 'cjs', sourcemap: true }],
    plugins: nodePlugins,
    external: util.resolveNodeExterns
  }
];

export default [...browserBuilds, ...nodeBuilds];
