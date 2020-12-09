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
import pkgExp from './exp/package.json';
import pkg from './package.json';
import path from 'path';
import { importPathTransformer } from '../../scripts/exp/ts-transform-import-path';

const deps = Object.keys(
  Object.assign({}, pkg.peerDependencies, pkg.dependencies)
).concat('@firebase/app-exp');

const plugins = [
  typescriptPlugin({
    typescript,
    tsconfigOverride: {
      compilerOptions: {
        target: 'es2017'
      }
    },
    abortOnError: false,
    transformers: [importPathTransformer]
  }),
  json({ preferConst: true })
];

const browserBuilds = [
  {
    input: './exp/index.ts',
    output: [
      {
        file: path.resolve('./exp', pkgExp.main),
        format: 'cjs',
        sourcemap: true
      },
      {
        file: path.resolve('./exp', pkgExp.browser),
        format: 'es',
        sourcemap: true
      }
    ],
    plugins,
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    treeshake: {
      moduleSideEffects: false
    }
  }
];

// eslint-disable-next-line import/no-default-export
export default browserBuilds;
