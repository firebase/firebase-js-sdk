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
import json from 'rollup-plugin-json';
import alias from '@rollup/plugin-alias';
import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';
import sourcemaps from 'rollup-plugin-sourcemaps';
import { terser } from 'rollup-plugin-terser';
import { importPathTransformer } from '../../scripts/exp/ts-transform-import-path';

import pkg from './lite/package.json';

const util = require('./rollup.shared');

const nodePlugins = [
  typescriptPlugin({
    typescript,
    tsconfigOverride: {
      compilerOptions: {
        target: 'es2017'
      }
    },
    cacheDir: tmp.dirSync(),
    abortOnError: false,
    transformers: [util.removeAssertTransformer, importPathTransformer]
  }),
  json({ preferConst: true })
];

const browserPlugins = [
  typescriptPlugin({
    typescript,
    tsconfigOverride: {
      compilerOptions: {
        target: 'es2017'
      }
    },
    cacheDir: tmp.dirSync(),
    abortOnError: false,
    transformers: [
      util.removeAssertAndPrefixInternalTransformer,
      importPathTransformer
    ]
  }),
  json({ preferConst: true }),
  terser(util.manglePrivatePropertiesOptions)
];

const allBuilds = [
  // Node ESM build
  {
    input: './lite/index.ts',
    output: {
      file: path.resolve('./lite', pkg['main-esm']),
      format: 'es',
      sourcemap: true
    },
    plugins: [alias(util.generateAliasConfig('node_lite')), ...nodePlugins],
    external: util.resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Node UMD build
  {
    input: path.resolve('./lite', pkg['main-esm']),
    output: {
      file: path.resolve('./lite', pkg.main),
      format: 'umd',
      name: 'firebase.firestore',
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
      sourcemaps()
    ],
    external: util.resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Browser build
  {
    input: './lite/index.ts',
    output: {
      file: path.resolve('./lite', pkg.browser),
      format: 'es',
      sourcemap: true
    },
    plugins: [
      alias(util.generateAliasConfig('browser_lite')),
      ...browserPlugins
    ],
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
    plugins: [alias(util.generateAliasConfig('rn_lite')), ...browserPlugins],
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  }
];

export default allBuilds;
