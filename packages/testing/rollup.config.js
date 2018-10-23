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

import resolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';
import replace from 'rollup-plugin-replace';
import copy from 'rollup-plugin-copy-assets';

const plugins = [
  typescript({
    typescript: require('typescript')
  }),
  resolve(),
  commonjs()
];

const external = Object.keys(
  Object.assign({}, pkg.peerDependencies, pkg.dependencies)
);
export default {
  input: 'index.ts',
  output: [{ file: pkg.main, format: 'cjs' }],
  plugins: [
    ...plugins,
    // Needed as we also use the *.proto files
    copy({ assets: ['./src/protos'] }),
    replace({
      'process.env.FIRESTORE_EMULATOR_PROTO_ROOT': JSON.stringify('src/protos')
    })
  ],
  external
};
