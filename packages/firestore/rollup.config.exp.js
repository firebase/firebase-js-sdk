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
import json from 'rollup-plugin-json';
import alias from '@rollup/plugin-alias';
import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';
import path from 'path';
import replace from 'rollup-plugin-replace';
import copy from 'rollup-plugin-copy-assets';
import { terser } from 'rollup-plugin-terser';
import { importPathTransformer } from '../../scripts/exp/ts-transform-import-path';

import pkg from './exp/package.json';

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
  json({ preferConst: true }),
  // Needed as we also use the *.proto files
  copy({
    assets: ['./src/protos']
  }),
  replace({
    'process.env.FIRESTORE_PROTO_ROOT': JSON.stringify('../src/protos')
  })
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
    input: './exp/index.ts',
    output: {
      file: path.resolve('./exp', pkg['main-esm']),
      format: 'es',
      sourcemap: true
    },
    plugins: [alias(util.generateAliasConfig('node')), ...nodePlugins],
    external: util.resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Node UMD build
  {
    input: path.resolve('./exp', pkg['main-esm']),
    output: {
      file: path.resolve('./exp', pkg.main),
      format: 'umd',
      name: 'firebase.firestore',
      sourcemap: true
    },
    plugins: util.es2017ToEs5Plugins(false),
    external: util.resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Browser build
  {
    input: './exp/index.ts',
    output: {
      file: path.resolve('./exp', pkg.browser),
      format: 'es',
      sourcemap: true
    },
    plugins: [alias(util.generateAliasConfig('browser')), ...browserPlugins],
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // RN build
  {
    input: './exp/index.ts',
    output: {
      file: path.resolve('./exp', pkg['react-native']),
      format: 'es',
      sourcemap: true
    },
    plugins: [alias(util.generateAliasConfig('rn')), ...browserPlugins],
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  }
];

export default allBuilds;
