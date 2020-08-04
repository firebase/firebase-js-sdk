/**
 * @license
 * Copyright 2020 Google LLC
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

import path from 'path';
import json from 'rollup-plugin-json';
import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';
import { terser } from 'rollup-plugin-terser';

import pkg from './internal/package.json';

const util = require('./rollup.shared');

const nodePlugins = [
  typescriptPlugin({
    typescript,
    clean: true,
    abortOnError: false
  }),
  json()
];

const browserPlugins = [
  typescriptPlugin({
    typescript,
    clean: true,
    abortOnError: false
  }),
  json()
];

const allBuilds = [
  // Node CJS build
  {
    input: './internal/index.ts',
    output: {
      file: path.resolve('./internal', pkg.main),
      format: 'cjs',
      sourcemap: true
    },
    plugins: nodePlugins,
    external: util.resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Browser build
  {
    input: './internal/index.ts',
    output: {
      file: path.resolve('./internal', pkg.browser),
      format: 'es',
      sourcemap: true
    },
    plugins: browserPlugins,
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  }
];

export default allBuilds;