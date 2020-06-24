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

import { resolveNodeExterns, generateAliasConfig } from './rollup.shared';

import pkg from './lite/package.json';
import path from 'path';

const defaultPlugins = [
  alias(generateAliasConfig('node')),
  typescriptPlugin({
    typescript,
    tsconfigOverride: {
      compilerOptions: {
        target: 'es2017'
      }
    },
    clean: true
  }),
  json({ preferConst: true })
];

const nodeBuilds = [
  {
    input: 'lite/index.node.ts',
    output: {
      file: path.resolve('./lite', pkg.main),
      format: 'es'
    },
    plugins: defaultPlugins,
    external: resolveNodeExterns,
    treeshake: {
      tryCatchDeoptimization: false
    }
  }
];

// TODO(firestorelite): Add browser builds

export default [...nodeBuilds];
