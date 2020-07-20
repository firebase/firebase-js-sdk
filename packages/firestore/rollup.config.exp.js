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

import json from 'rollup-plugin-json';
import alias from '@rollup/plugin-alias';
import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';
import path from 'path';
import { terser } from 'rollup-plugin-terser';

import {
  resolveNodeExterns,
  generateAliasConfig,
  resolveBrowserExterns,
  removeAssertTransformer,
  removeAssertAndPrefixInternalTransformer,
  manglePrivatePropertiesOptions
} from './rollup.shared';

import pkg from './exp/package.json';

const nodePlugins = [
  typescriptPlugin({
    typescript,
    tsconfigOverride: {
      compilerOptions: {
        target: 'es5'
      }
    },
    clean: true,
    transformers: removeAssertTransformer
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
    clean: true,
    transformers: removeAssertAndPrefixInternalTransformer
  }),
  json({ preferConst: true }),
  terser(manglePrivatePropertiesOptions)
];

const allBuilds = [
  // Node build
  {
    input: './exp/index.ts',
    output: {
      file: path.resolve('./exp', pkg.main),
      format: 'umd',
      name: 'firebase.firestore'
    },
    plugins: [alias(generateAliasConfig('node')), ...nodePlugins],
    external: resolveNodeExterns
  },
  // Browser build
  {
    input: './exp/index.ts',
    output: {
      file: path.resolve('./exp', pkg.browser),
      format: 'es'
    },
    plugins: [alias(generateAliasConfig('browser')), ...browserPlugins],
    external: resolveBrowserExterns
  },
  // RN build
  {
    input: './exp/index.ts',
    output: {
      file: path.resolve('./exp', pkg['react-native']),
      format: 'es'
    },
    plugins: [alias(generateAliasConfig('rn')), ...browserPlugins],
    external: resolveBrowserExterns
  }
];

export default allBuilds;
