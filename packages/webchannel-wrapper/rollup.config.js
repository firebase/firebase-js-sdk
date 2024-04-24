/**
 * @license
 * Copyright 2019 Google LLC
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

import { join } from 'path';
import copy from 'rollup-plugin-copy';
import commonjs from '@rollup/plugin-commonjs';
import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';
import { emitModulePackageFile } from '../../scripts/build/rollup_emit_module_package_file';
import pkg from './package.json';

const closureBlobsDir = '../../node_modules/closure-net/firebase/';

const deps = [
  ...Object.keys(Object.assign({}, pkg.peerDependencies, pkg.dependencies))
];

const es2017BuildPlugins = [
  copy({
    targets: [
      { src: join(closureBlobsDir, 'webchannel_blob_*.*'), dest: 'dist/webchannel-blob'},
      { src: join(closureBlobsDir, 'bloom_blob_*.*'), dest: 'dist/bloom-blob'},
    ]
  }),
  typescriptPlugin({
    typescript,
    tsconfigOverride: {
      compilerOptions: {
        target: 'es2017'
      }
    }
  }),
  commonjs()
];

/**
 * ESM builds
 */
const esm2017Builds = [
  {
    input: join(closureBlobsDir, 'webchannel_blob_es2018.js'),
    output: {
      file: pkg.exports['./webchannel-blob'].default,
      format: 'es',
      sourcemap: true
    },
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    plugins: [
      ...es2017BuildPlugins,
      emitModulePackageFile()
    ]
  },
  {
    input: join(closureBlobsDir, 'bloom_blob_es2018.js'),
    output: {
      file: pkg.exports['./bloom-blob'].default,
      format: 'es',
      sourcemap: true
    },
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`)),
    plugins: [
      ...es2017BuildPlugins,
      emitModulePackageFile()
    ]
  }
];

export default esm2017Builds;
