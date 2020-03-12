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

import * as path from 'path';

import { externs } from './externs.json';
import { renameInternals } from './scripts/rename-internals';
import { extractPublicIdentifiers } from './scripts/extract-api';

const externsPaths = externs.map(p => path.resolve(__dirname, '../../', p));
const publicIdentifiers = extractPublicIdentifiers(externsPaths);


/**
 * A transformer that appends a __PRIVATE_ prefix to all internal symbols.
 */
export const appendPrivatePrefixTransformers = [
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

/**
 * Terser options that mangle all properties prefixed with __PRIVATE_.
 */
export const manglePrivatePropertiesOptions = {
  output: {
    comments: 'all',
    beautify: true
  },
  mangle: {
    properties: {
      regex: /^__PRIVATE_/
    }
  }
};

/**
 * Returns the externs locations for the Memory-based Firestore implementation.
 * Verifies that no persistence sources are used by Firestore's memory-only
 * implementation.
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
    'local/simple_db.ts',
    'api/persistence.ts'
  ].map(p => path.resolve(__dirname, 'src', p));

  if (persistenceRef.indexOf(externalRef) !== -1) {
    throw new Error('Unexpected reference in Memory-only client on ' + id);
  }

  return deps.some(dep => externsId === dep || externsId.startsWith(`${dep}/`));
}
