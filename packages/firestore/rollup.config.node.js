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

const util = require('./rollup.shared');

export default [
  {
    input: 'index.node.ts',
    output: {
      file: pkg['main-esm2017'],
      format: 'es',
      sourcemap: true
    },
    plugins: [
      ...util.es2017Plugins('node'),
      // Needed as we also use the *.proto files
      copy({
        assets: ['./src/protos']
      }),
      replace({
        'process.env.FIRESTORE_PROTO_ROOT': JSON.stringify('src/protos')
      })
    ],
    external: util.resolveNodeExterns
  },
  {
    input: pkg['main-esm2017'],
    output: [{ file: pkg.main, format: 'cjs', sourcemap: true }],
    plugins: util.es2017ToES5Plugins(),
    external: util.resolveNodeExterns
  }
];
