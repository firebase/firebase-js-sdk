/**
 * @license
 * Copyright 2018 Google LLC
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
import alias from '@rollup/plugin-alias';
import typescriptPlugin from 'rollup-plugin-typescript2';
import replace from 'rollup-plugin-replace';
import copy from 'rollup-plugin-copy-assets';
import typescript from 'typescript';
import { terser } from 'rollup-plugin-terser';

import pkg from './package.json';
import memoryPkg from './memory/package.json';

import {
  firestoreTransformers,
  manglePrivatePropertiesOptions,
  resolveNodeExterns,
  resolveBrowserExterns,
  generateAliasConfig
} from './rollup.shared';

// Firestore is released in a number of different build configurations:
// - Browser builds that support persistence in ES5 CJS and ES5 ESM formats and
//   ES2017 in ESM format.
// - In-memory Browser builds that support persistence in ES5 CJS and ES5 ESM
//   formats and ES2017 in ESM format.
// - A NodeJS build that supports persistence (to be used with an IndexedDb
//   shim)
// - A in-memory only NodeJS build
//
// The in-memory builds are roughly 130 KB smaller, but throw an exception
// for calls to `enablePersistence()` or `clearPersistence()`.
//
// We use two different rollup pipelines to take advantage of tree shaking,
// as Rollup does not support tree shaking for Typescript classes transpiled
// down to ES5 (see https://bit.ly/340P23U). The build pipeline in this file
// produces tree-shaken ES2017 builds that are consumed by the ES5 builds in
// `rollup.config.es.js`.
//
// All browser builds rely on Terser's property name mangling to reduce code
// size.
//
// See https://g3doc/firebase/jscore/g3doc/contributing/builds.md
// for a description of the various JavaScript formats used in our SDKs.

// MARK: Browser builds

const browserBuildPlugins = [
  alias(generateAliasConfig('browser')),
  typescriptPlugin({
    typescript,
    tsconfigOverride: {
      compilerOptions: {
        target: 'es2017'
      }
    },
    clean: true,
    transformers: firestoreTransformers
  }),
  json({ preferConst: true }),
  terser(manglePrivatePropertiesOptions)
];

const browserBuilds = [
  // Persistence build
  {
    input: 'index.ts',
    output: {
      file: pkg.esm2017,
      format: 'es',
      sourcemap: true
    },
    plugins: browserBuildPlugins,
    external: resolveBrowserExterns
  },
  // Memory-only build
  {
    input: 'index.memory.ts',
    output: {
      file: path.resolve('./memory', memoryPkg.esm2017),
      format: 'es',
      sourcemap: true
    },
    plugins: browserBuildPlugins,
    external: resolveBrowserExterns
  }
];

const reactNativeBuildPlugins = [
  alias(generateAliasConfig('rn')),
  ...browserBuildPlugins.slice(1)
];

const reactNativeBuilds = [
  // Persistence build
  {
    input: 'index.rn.ts',
    output: {
      file: pkg['react-native'],
      format: 'es',
      sourcemap: true
    },
    plugins: reactNativeBuildPlugins,
    external: resolveBrowserExterns
  },
  // Memory-only build
  {
    input: 'index.rn.memory.ts',
    output: {
      file: path.resolve('./memory', memoryPkg['react-native']),
      format: 'es',
      sourcemap: true
    },
    plugins: reactNativeBuildPlugins,
    external: resolveBrowserExterns
  }
];

// MARK: Node builds

const nodeBuildPlugins = [
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
  json(),
  // Needed as we also use the *.proto files
  copy({
    assets: ['./src/protos']
  }),
  replace({
    'process.env.FIRESTORE_PROTO_ROOT': JSON.stringify('src/protos')
  })
];

const nodeBuilds = [
  // Persistence build
  {
    input: 'index.node.ts',
    output: [{ file: pkg['main-esm2017'], format: 'es', sourcemap: true }],
    plugins: nodeBuildPlugins,
    external: resolveNodeExterns
  },
  // Memory-only build
  {
    input: 'index.node.memory.ts',
    output: [
      {
        file: path.resolve('./memory', memoryPkg['main-esm2017']),
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: nodeBuildPlugins,
    external: resolveNodeExterns
  }
];

export default [...browserBuilds, ...reactNativeBuilds, ...nodeBuilds];
