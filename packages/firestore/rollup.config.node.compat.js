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
import copy from 'rollup-plugin-copy';
import pkg from './compat/package.json';
import path from 'path';
import { getImportPathTransformer } from '../../scripts/exp/ts-transform-import-path';

const util = require('./rollup.shared');

export default [
  {
    input: {
      index: './compat/index.node.ts'
    },
    output: {
      dir: 'dist/compat/node-esm2017',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      ...util.es2017PluginsCompat(
        'node',
        getImportPathTransformer({
          // ../../exp/index
          pattern: /^.*exp\/index$/g,
          template: ['@firebase/firestore']
        })
      ),
      replace({
        'process.env.FIRESTORE_PROTO_ROOT': JSON.stringify('../protos')
      }),
      copy({
        targets: [{ src: 'src/protos', dest: 'dist' }]
      })
    ],
    external: util.resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    },
    onwarn: util.onwarn
  },
  {
    input: {
      index: path.resolve('./compat', pkg['main-esm2017'])
    },
    output: [
      {
        dir: 'dist/compat/node-cjs',
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
