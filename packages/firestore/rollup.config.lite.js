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

import tmp from 'tmp';
import path from 'path';
import json from '@rollup/plugin-json';
import alias from '@rollup/plugin-alias';
import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';
import sourcemaps from 'rollup-plugin-sourcemaps';
import replace from 'rollup-plugin-replace';
import { terser } from 'rollup-plugin-terser';

import pkg from './lite/package.json';
import { generateBuildTargetReplaceConfig } from '../../scripts/build/rollup_replace_build_target';

const util = require('./rollup.shared');

const nodePlugins = function () {
  return [
    typescriptPlugin({
      typescript,
      tsconfigOverride: {
        compilerOptions: {
          target: 'es2017'
        }
      },
      cacheDir: tmp.dirSync(),
      abortOnError: false,
      transformers: [util.removeAssertTransformer]
    }),
    json({ preferConst: true })
  ];
};

const browserPlugins = function () {
  return [
    typescriptPlugin({
      typescript,
      tsconfigOverride: {
        compilerOptions: {
          target: 'es2017'
        }
      },
      cacheDir: tmp.dirSync(),
      abortOnError: false,
      transformers: [util.removeAssertAndPrefixInternalTransformer]
    }),
    json({ preferConst: true }),
    terser(util.manglePrivatePropertiesOptions)
  ];
};

const allBuilds = [
  // Intermidiate Node ESM build without build target reporting
  // this is an intermidiate build used to generate the actual esm and cjs builds
  // which add build target reporting
  {
    input: './lite/index.ts',
    output: {
      file: path.resolve('./lite', pkg['main-esm']),
      format: 'es',
      sourcemap: true
    },
    plugins: [
      alias(util.generateAliasConfig('node_lite')),
      ...nodePlugins(),
      replace({
        '__RUNTIME_ENV__': 'node'
      })
    ],
    external: util.resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    },
    onwarn: util.onwarn
  },
  // Node CJS build
  {
    input: path.resolve('./lite', pkg['main-esm']),
    output: {
      file: path.resolve('./lite', pkg.main),
      format: 'cjs',
      sourcemap: true
    },
    plugins: [
      typescriptPlugin({
        typescript,
        compilerOptions: {
          allowJs: true,
          target: 'es5'
        },
        include: ['dist/lite/*.js']
      }),
      json(),
      sourcemaps(),
      replace(generateBuildTargetReplaceConfig('cjs', 5))
    ],
    external: util.resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Node ESM build
  {
    input: path.resolve('./lite', pkg['main-esm']),
    output: {
      file: path.resolve('./lite', pkg['main-esm']),
      format: 'es',
      sourcemap: true
    },
    plugins: [replace(generateBuildTargetReplaceConfig('esm', 2017))],
    external: util.resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Intermidiate browser build without build target reporting
  // this is an intermidiate build used to generate the actual esm and cjs builds
  // which add build target reporting
  {
    input: './lite/index.ts',
    output: {
      file: path.resolve('./lite', pkg.browser),
      format: 'es',
      sourcemap: true
    },
    plugins: [
      alias(util.generateAliasConfig('browser_lite')),
      ...browserPlugins(),
      // setting it to empty string because browser is the default env
      replace({
        '__RUNTIME_ENV__': ''
      })
    ],
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Convert es2017 build to ES5
  {
    input: path.resolve('./lite', pkg.browser),
    output: [
      {
        file: path.resolve('./lite', pkg.esm5),
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
  // Browser es2017 build
  {
    input: path.resolve('./lite', pkg.browser),
    output: [
      {
        file: path.resolve('./lite', pkg.browser),
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
    input: './lite/index.ts',
    output: {
      file: path.resolve('./lite', pkg['react-native']),
      format: 'es',
      sourcemap: true
    },
    plugins: [
      alias(util.generateAliasConfig('rn_lite')),
      ...browserPlugins(),
      replace({
        ...generateBuildTargetReplaceConfig('esm', 2017),
        '__RUNTIME_ENV__': 'rn'
      })
    ],
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  }
];

export default allBuilds;
