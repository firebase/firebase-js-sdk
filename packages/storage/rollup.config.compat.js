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

import json from '@rollup/plugin-json';
import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';
import alias from '@rollup/plugin-alias';
import pkg from './package.json';

import { getImportPathTransformer } from '../../scripts/exp/ts-transform-import-path';

const { generateAliasConfig } = require('./rollup.shared');

const deps = [
  ...Object.keys(Object.assign({}, pkg.peerDependencies, pkg.dependencies)),
  '@firebase/storage'
];
/**
 * ES5 Builds
 */
const es5BuildPlugins = [
  typescriptPlugin({
    typescript,
    abortOnError: false,
    transformers: [
      getImportPathTransformer({
        // ../exp/index
        pattern: /^.*exp\/api$/g,
        template: ['@firebase/storage']
      })
    ]
  }),
  json()
];

const es5Builds = [
  {
    input: './compat/index.ts',
    output: [
      {
        dir: 'dist/compat/cjs',
        format: 'cjs',
        sourcemap: true
      },
      {
        dir: 'dist/compat/esm5',
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [alias(generateAliasConfig('browser')), ...es5BuildPlugins],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    treeshake: {
      moduleSideEffects: false
    }
  }
];

/**
 * ES2017 Builds
 */
const es2017BuildPlugins = [
  typescriptPlugin({
    typescript,
    abortOnError: false,
    transformers: [
      getImportPathTransformer({
        // ../exp/index
        pattern: /^.*exp\/api$/g,
        template: ['@firebase/storage']
      })
    ],
    tsconfigOverride: {
      compilerOptions: {
        target: 'es2017'
      }
    }
  }),
  json({ preferConst: true })
];

const es2017Builds = [
  {
    input: './compat/index.ts',
    output: {
      dir: 'dist/compat/esm2017',
      format: 'es',
      sourcemap: true
    },
    plugins: [alias(generateAliasConfig('browser')), ...es2017BuildPlugins],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    treeshake: {
      moduleSideEffects: false
    }
  }
];

// eslint-disable-next-line import/no-default-export
export default [...es5Builds, ...es2017Builds];
