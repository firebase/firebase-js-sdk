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

import path from 'path';
import replace from 'rollup-plugin-replace';

import { generateBuildTargetReplaceConfig } from '../../scripts/build/rollup_replace_build_target';

import pkg from './debug/package.json';

const util = require('./rollup.shared');

// This rollup configuration creates non-minified builds that can be used by
// by customers who need additional debug information.
// Only browser debug builds are added as Node builds are already not minified.

const browserBuilds = [
  // Intermediate browser build without build target reporting.
  // This is an intermediate build used to generate the actual esm and cjs
  // builds which add build target reporting
  {
    input: './src/index.ts',
    output: {
      file: path.resolve('./debug', pkg['browser']),
      format: 'es',
      sourcemap: true
    },
    plugins: util.es2017Plugins('browser'),
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Convert es2017 build to ES5
  {
    input: path.resolve('./debug', pkg['browser']),
    output: [
      {
        file: path.resolve('./debug', pkg['esm5']),
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [
      ...util.es2017ToEs5Plugins(),
      replace(generateBuildTargetReplaceConfig('esm', 5))
    ],
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // es2017 build with build target reporting
  {
    input: path.resolve('./debug', pkg['browser']),
    output: [
      {
        file: path.resolve('./debug', pkg['browser']),
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [replace(generateBuildTargetReplaceConfig('esm', 2017))],
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // RN build
  {
    input: './src/index.rn.ts',
    output: {
      file: path.resolve('./debug', pkg['react-native']),
      format: 'es',
      sourcemap: true
    },
    plugins: [
      ...util.es2017Plugins('rn'),
      replace(generateBuildTargetReplaceConfig('esm', 2017))
    ],
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  }
];

export default browserBuilds;
