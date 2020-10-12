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
import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';
import { importPathTransformer } from '../../scripts/exp/ts-transform-import-path';
import { es2017BuildsNoPlugin, es5BuildsNoPlugin } from './rollup.shared';

/**
 * ES5 Builds
 */
const es5BuildPlugins = [
  typescriptPlugin({
    typescript,
    clean: true,
    abortOnError: false,
    transformers: [importPathTransformer]
  }),
  json()
];

const es5Builds = es5BuildsNoPlugin.map(build => ({
  ...build,
  plugins: es5BuildPlugins,
  treeshake: {
    moduleSideEffects: ['@firebase/installations']
  }
}));

/**
 * ES2017 Builds
 */
const es2017BuildPlugins = [
  typescriptPlugin({
    typescript,
    tsconfigOverride: {
      compilerOptions: {
        target: 'es2017'
      }
    },
    abortOnError: false,
    clean: true,
    transformers: [importPathTransformer]
  }),
  json({ preferConst: true })
];

const es2017Builds = es2017BuildsNoPlugin.map(build => ({
  ...build,
  plugins: es2017BuildPlugins,
  treeshake: {
    moduleSideEffects: ['@firebase/installations']
  }
}));

export default [...es5Builds, ...es2017Builds];
