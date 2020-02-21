/**
 * @license
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

import * as path from 'path';

import json from 'rollup-plugin-json';
import typescriptPlugin from 'rollup-plugin-typescript2';
import replace from 'rollup-plugin-replace';
import copy from 'rollup-plugin-copy-assets';
import typescript from 'typescript';
import { terser } from 'rollup-plugin-terser';

import { renameInternals } from './scripts/rename-internals';
import { extractPublicIdentifiers } from './scripts/extract-api';
import pkg from './package.json';
import { externs } from './externs.json';

const deps = Object.keys(
  Object.assign({}, pkg.peerDependencies, pkg.dependencies)
);

// Extract all identifiers used in external APIs (to be used as a blacklist by
// the SDK minifier).
const externsPaths = externs.map(p => path.resolve(__dirname, '../../', p));
const publicIdentifiers = extractPublicIdentifiers(externsPaths);
const transformers = [
  service => ({
    before: [
      renameInternals(service.getProgram(), {
        publicIdentifiers,
        prefix: '__PRIVATE_'
      })
    ],
    after: []
  })
];

const terserOptions = {
  output: {
    comments: "all",
    beautify: true
  },
  mangle: {
    properties: {
      regex: /^__PRIVATE_/
    }
  }
};

const es5Builds = [
  /**
   * Node.js Build
   */
  {
    input: 'index.node.ts',
    output: [{ file: pkg.main, format: 'cjs', sourcemap: true }],
    plugins: [
      typescriptPlugin({
        typescript,
        cacheRoot: './.cache/node.cjs/'
      }),
      json(),
      // Needed as we also use the *.proto files
      copy({
        assets: ['./src/protos']
      }),
      replace({
        'process.env.FIRESTORE_PROTO_ROOT': JSON.stringify('src/protos')
      })
    ],
    external: id =>
      [...deps, 'util', 'path'].some(
        dep => id === dep || id.startsWith(`${dep}/`)
      )
  },
  /**
   * Browser CJS Build
   * 
   * The Browser CJS build is not mangled as Terser's property name mangling 
   * does not work well with CommonJS-style files.
   */
  {
    input: 'index.ts',
    output:{ file: pkg.browser, format: 'cjs', sourcemap: true },
    plugins: [
      typescriptPlugin({
        typescript,
        cacheRoot: './.cache/cjs/'
      }),
      json()
    ],
  },
  /**
   * Browser ESM Build
   */
  {
    input: 'index.ts',
    output: { file: pkg.module, format: 'es', sourcemap: true },
    plugins: [
      typescriptPlugin({
        typescript,
        transformers,
        cacheRoot: './.cache/esm/'
      }),
      json(),
      terser(terserOptions)
    ],
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  }
];

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
    cacheRoot: './.cache/esm2017/',
    transformers
  }),
  json({ preferConst: true }),
  terser(terserOptions)
];

const es2017Builds = [
  /**
   * Browser Build
   */
  {
    input: 'index.ts',
    output: {
      file: pkg.esm2017,
      format: 'es',
      sourcemap: true
    },
    plugins: es2017BuildPlugins,
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  }
];

export default [...es5Builds, ...es2017Builds];
