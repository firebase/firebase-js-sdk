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
    comments: false
  },
  mangle: {
    properties: {
      regex: /^__PRIVATE_/
    }
  }
};

/**
 * ES5 Builds
 */
const es5BuildPlugins = [
  typescriptPlugin({
    typescript,
    transformers,
    cacheRoot: './.cache/es5.min/'
  }),
  json(),
  terser(terserOptions)
];

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

/**
 * List of source paths that are used by Firestore's persistence implementation.
 */
const persistenceDeps = [
  'local/indexeddb_persistence.ts',
  'local/indexeddb_index_manager.ts',
  'local/indexeddb_mutation_queue.ts',
  'local/indexeddb_remote_document_cache.ts',
  'local/indexeddb_schema.ts',
  'local/indexeddb_target_cache.ts',
  'local/local_serializer.ts',
  'local/simple_db.ts',
  'api/persistence.ts'
].map(p => path.resolve(__dirname, 'src', p));

const es5Builds = [
  /**
   * Node.js Build
   */
  {
    input: 'index.node.ts',
    output: [{ file: pkg.main, format: 'cjs', sourcemap: true }],
    plugins: nodeBuildPlugins,
    external: id =>
      [...deps, 'util', 'path'].some(
        dep => id === dep || id.startsWith(`${dep}/`)
      )
  },
  {
    input: 'index.node.memory.ts',
    output: [
      { file: pkg.mainMemoryPersistence, format: 'cjs', sourcemap: true }
    ],
    plugins: nodeBuildPlugins,
    external: (id, referencedBy) => {
      const externalRef = path
        .resolve(path.dirname(referencedBy), id)
        .replace('.ts', '');
      if (persistenceDeps.indexOf(externalRef) !== -1) {
        throw new Error('Unexpected reference in Memory-only client on ' + id);
      }
      return [...deps, 'util', 'path'].some(
        dep => id === dep || id.startsWith(`${dep}/`)
      );
    }
  },
  /**
   * Browser Builds
   */
  {
    input: 'index.ts',
    output: [
      { file: pkg.browser, format: 'cjs', sourcemap: true },
      { file: pkg.module, format: 'es', sourcemap: true }
    ],
    plugins: es5BuildPlugins,
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  {
    input: 'index.memory.ts',
    output: [
      {
        file: pkg.browserMemoryPersistence,
        format: 'cjs',
        sourcemap: true
      },
      {
        file: pkg.moduleMemoryPersistence,
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: es5BuildPlugins,
    external: (id, referencedBy) => {
      const externalRef = path
        .resolve(path.dirname(referencedBy), id)
        .replace('.ts', '');
      if (persistenceDeps.indexOf(externalRef) !== -1) {
        throw new Error('Unexpected reference in Memory-only client on ' + id);
      }
      return deps.some(dep => id === dep || id.startsWith(`${dep}/`));
    }
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
    cacheRoot: './.cache/es2017.min/',
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
<<<<<<< HEAD
  },
  {
    input: 'index.ts',
    output: {
      file: pkg.esm2017Minified,
      format: 'es',
      sourcemap: true
    },
    plugins: es2017MinifiedBuildPlugins,
    external: id => deps.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  {
    input: 'index.memory.ts',
    output: {
      file: pkg.esm2017MemoryPersistence,
      format: 'es',
      sourcemap: true
    },
    plugins: es2017BuildPlugins,
    external: (id, referencedBy) => {
      const externalRef = path.resolve(path.dirname(referencedBy), id);
      if (persistenceDeps.indexOf(externalRef) !== -1) {
        throw new Error('Unexpected reference in Memory-only client on ' + id);
      }
      return deps.some(dep => id === dep || id.startsWith(`${dep}/`));
    }
=======
>>>>>>> master
  }
];

export default [...es5Builds, ...es2017Builds];
