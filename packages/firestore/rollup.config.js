/**
 * Copyright 2018 Google Inc.
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

import resolveNode from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import commonjs from 'rollup-plugin-commonjs';
import replace from 'rollup-plugin-replace';
import copy from 'rollup-plugin-copy-assets';
import pkg from './package.json';
import { dirname, resolve } from 'path';

const plugins = [
  typescript({
    typescript: require('typescript')
  }),
  resolveNode(),
  commonjs()
];

const external = Object.keys(
  Object.assign({}, pkg.peerDependencies, pkg.dependencies)
);

export default [
  /**
   * Browser Builds
   */
  {
    input: 'index.ts',
    output: [
      { file: pkg.browser, format: 'cjs' },
      { file: pkg.module, format: 'es' }
    ],
    plugins,
    external
  },
  /**
   * Node.js Build
   */
  {
    input: 'index.node.ts',
    output: [{ file: pkg.main, format: 'cjs' }],
    plugins: [
      ...plugins,
      // Needed as we also use the *.proto files
      copy({
        assets: ['./src/protos']
      }),
      replace({
        'process.env.FIRESTORE_PROTO_ROOT': JSON.stringify('src/protos')
      })
    ],
    external: [...external, 'util', 'path']
  }
];
