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

import replace from 'rollup-plugin-replace';

import { generateBuildTargetReplaceConfig } from '../../scripts/build/rollup_replace_build_target';

import pkg from './package.json';

const util = require('./rollup.shared');

const allBuilds = [
  // Intermediate Node ESM build without build target reporting
  // this is an intermediate build used to generate the actual esm and cjs builds
  // which add build target reporting
  {
    input: './src/index.node.ts',
    output: {
      file: pkg['main-esm'],
      format: 'es',
      sourcemap: true
    },
    plugins: util.es2017Plugins('node'),
    external: util.resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    },
    onwarn: util.onwarn
  },
  // Node CJS build
  {
    input: pkg['main-esm'],
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true
    },
    plugins: [
      ...util.es2017ToEs5Plugins(/* mangled= */ false),
      replace(generateBuildTargetReplaceConfig('cjs', 2017))
    ],
    external: util.resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Node ESM build with build target reporting
  {
    input: pkg['main-esm'],
    output: {
      file: pkg['main-esm'],
      format: 'es',
      sourcemap: true
    },
    plugins: [replace(generateBuildTargetReplaceConfig('esm', 2017))],
    external: util.resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Intermediate browser build without build target reporting
  // this is an intermediate build used to generate the actual esm and cjs builds
  // which add build target reporting
  {
    input: './src/index.ts',
    output: {
      file: pkg.browser,
      format: 'es',
      sourcemap: true
    },
    plugins: util.es2017Plugins('browser', /* mangled= */ true),
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Convert es2017 build to ES5
  {
    input: pkg['browser'],
    output: [
      {
        file: pkg['esm5'],
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [
      ...util.es2017ToEs5Plugins(/* mangled= */ true),
      replace(generateBuildTargetReplaceConfig('esm', 5))
    ],
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Convert es2017 build to cjs
  {
    input: pkg['browser'],
    output: [
      {
        file: './dist/index.cjs.js',
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: [replace(generateBuildTargetReplaceConfig('cjs', 2017))],
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // es2017 build with build target reporting
  {
    input: pkg['browser'],
    output: [
      {
        file: pkg['browser'],
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
      file: pkg['react-native'],
      format: 'es',
      sourcemap: true
    },
    plugins: [
      ...util.es2017Plugins('rn', /* mangled= */ true),
      replace(generateBuildTargetReplaceConfig('esm', 2017))
    ],
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  }
];

export default allBuilds;
