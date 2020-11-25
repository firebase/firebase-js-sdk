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
import copy from 'rollup-plugin-copy-assets';
import pkg from './package.json';
import bundlePkg from './bundle/package.json';
import memoryPkg from './memory/package.json';
import path from 'path';

const util = require('./rollup.shared');

export default [
  {
    input: {
      index: 'index.node.ts',
      memory: 'index.node.memory.ts',
      bundle: 'index.bundle.ts'
    },
    output: {
      dir: 'dist/node-esm2017',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      ...util.es2017Plugins('node'),
      replace({
        'process.env.FIRESTORE_PROTO_ROOT': JSON.stringify('src/protos')
      }),
      copy({
        assets: ['./src/protos']
      })
    ],
    external: util.resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  {
    input: {
      index: pkg['main-esm2017'],
      memory: path.resolve('./memory', memoryPkg['main-esm2017']),
      bundle: path.resolve('./bundle', bundlePkg['main-esm2017'])
    },
    output: [
      {
        dir: 'dist/node-cjs',
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: util.es2017ToEs5Plugins(),
    external: util.resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    }
  }
];
