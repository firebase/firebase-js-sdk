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
import sourcemaps from 'rollup-plugin-sourcemaps';
import typescript from 'typescript';
import { terser } from 'rollup-plugin-terser';

import pkg from './package.json';
import memoryPkg from './memory/package.json';

import {
  appendPrivatePrefixTransformers,
  manglePrivatePropertiesOptions,
} from './terser.config';

// This Firestore Rollup configuration provides a number of different builds:
// - Browser builds that support persistence in ES5 CJS and ES5 ESM formats and
//   ES2017 in ESM format.
// - In-memory Browser builds that support persistence in ES5 CJS and ES5 ESM
//   formats and ES2017 in ESM format.
// - A NodeJS build that supports persistence (to be used with an IndexedDb
//  shim)
// - A in-memory only NodeJS build
//
// The in-memory builds are roughly 130 KB smaller, but throw an exception
// for calls to `enablePersistence()` or `clearPersistence()`.
//
// All browser builds rely on Terser's property name mangling to reduce code 
// size.

// MARK: Browser builds

const browserDeps = Object.keys(
  Object.assign({}, pkg.peerDependencies, pkg.dependencies)
);

const nodeDeps = [...browserDeps, 'util', 'path'];

/** Resolves the external dependencies for the browser build. */
function resolveBrowserExterns(id) {
  return browserDeps.some(dep => id === dep || id.startsWith(`${dep}/`));
}

/** Resolves the external dependencies for the NOde build. */
function resolveNodeExterns(id) {
  return nodeDeps.some(dep => id === dep || id.startsWith(`${dep}/`));
}

/**
 * Resolves the external dependencies for the Memory-based Firestore 
 * implementation. Verifies that no persistence sources are used by Firestore's 
 * memory-only implementation.
 */
export function resolveMemoryExterns(deps, externsId, referencedBy) {
  const externalRef = path
    .resolve(path.dirname(referencedBy), externsId)
    .replace('.ts', '');

  const persistenceRef = [
    'local/indexeddb_persistence.ts',
    'local/indexeddb_index_manager.ts',
    'local/indexeddb_mutation_queue.ts',
    'local/indexeddb_remote_document_cache.ts',
    'local/indexeddb_schema.ts',
    'local/indexeddb_target_cache.ts',
    'local/local_serializer.ts',
    'local/lru_garbage_collector.ts',
    'local/simple_db.ts',
    'api/persistence.ts'
  ].map(p => path.resolve(__dirname, 'src', p));

  if (persistenceRef.indexOf(externalRef) !== -1) {
    throw new Error('Unexpected reference in Memory-only client on ' + id);
  }

  return deps.some(dep => externsId === dep || externsId.startsWith(`${dep}/`));
}


const es5BuildPlugins = [
  typescriptPlugin({
    typescript,
    transformers: appendPrivatePrefixTransformers,
    cacheRoot: `./.cache/es5.mangled/`
  }),
  json(),
  terser(manglePrivatePropertiesOptions)
];

const es2017BuildPlugins = [
  typescriptPlugin({
    typescript,
    tsconfigOverride: {
      compilerOptions: {
        target: 'es2017'
      }
    },
    cacheRoot: './.cache/es2017.mangled/',
    transformers: appendPrivatePrefixTransformers
  }),
  json({ preferConst: true }),
  terser(manglePrivatePropertiesOptions)
];

const browserBuilds = [
  // ES5 ESM Build (with persistence)
  {
    input: 'index.ts',
    output: { file: pkg.module, format: 'es', sourcemap: true },
    plugins: es5BuildPlugins,
    external: resolveBrowserExterns
  },
  // ES5 ESM Build (memory-only)
  {
    input: 'index.memory.ts',
    output: {
      file: path.resolve('./memory', memoryPkg.module),
      format: 'es',
      sourcemap: true
    },
    plugins: es5BuildPlugins,
    external: (id, referencedBy) => resolveMemoryExterns(browserDeps, id, referencedBy)
  },
  // ES2017 ESM build (with persistence)
  {
    input: 'index.ts',
    output: {
      file: pkg.esm2017,
      format: 'es',
      sourcemap: true
    },
    plugins: es5BuildPlugins,
    external: resolveBrowserExterns
  },
  // ES2017 ESM build (memory-only)
  {
    input: 'index.memory.ts',
    output: {
      file: path.resolve('./memory', memoryPkg.esm2017),
      format: 'es',
      sourcemap: true
    },
    plugins: es2017BuildPlugins,
    external: (id, referencedBy) => resolveMemoryExterns(browserDeps, id, referencedBy)
  },
  // ES5 CJS Build (with persistence)
  //
  // This build is based on the mangling in the ESM build above, since
  // Terser's Property name mangling doesn't work well with CJS's syntax.
  {
    input: pkg.module,
    output: { file: pkg.browser, format: 'cjs', sourcemap: true },
    plugins: [sourcemaps()]
  },
  // ES5 CJS Build (memory-only)
  //
  // This build is based on the mangling in the ESM build above, since
  // Terser's Property name mangling doesn't work well with CJS's syntax.
  {
    input: path.resolve('./memory', memoryPkg.module),
    output: {
      file: path.resolve('./memory', memoryPkg.browser),
      format: 'cjs',
      sourcemap: true
    },
    plugins: [sourcemaps()]
  }
];

// MARK: Node builds

const nodeBuildPlugins = [
  ...es5BuildPlugins,
  // Needed as we also use the *.proto files
  copy({
    assets: ['./src/protos']
  }),
  replace({
    'process.env.FIRESTORE_PROTO_ROOT': JSON.stringify('src/protos')
  })
];

const nodeBuilds = [
  // ES5 CJS build (with persistence)
  {
    input: 'index.node.ts',
    output: [{ file: pkg.main, format: 'cjs', sourcemap: true }],
    plugins: nodeBuildPlugins,
    external: resolveNodeExterns
  },
  // ES5 CJS build (memory-only)
  {
    input: 'index.node.memory.ts',
    output: [
      {
        file: path.resolve('./memory', memoryPkg.main),
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: nodeBuildPlugins,
    external: (id, referencedBy) =>
      resolveMemoryExterns(nodeDeps, id, referencedBy)
  }
];

export default [...browserBuilds, ...nodeBuilds];
