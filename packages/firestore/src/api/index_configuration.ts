/**
 * @license
 * Copyright 2021 Google LLC
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

import { firestoreClientSetIndexConfiguration } from '../core/firestore_client';
import { fieldPathFromDotSeparatedString } from '../lite-api/user_data_reader';
import {
  FieldIndex,
  IndexKind,
  IndexSegment,
  IndexState
} from '../model/field_index';
import { Code, FirestoreError } from '../util/error';
import { logWarn } from '../util/log';

import { Firestore } from './database';
import {
  ensureFieldIndexPluginFactoriesInitialized,
  getPersistentCacheIndexManager
} from './persistent_cache_index_manager';

export {
  connectFirestoreEmulator,
  EmulatorMockTokenOptions
} from '../lite-api/database';

/**
 * A single field element in an index configuration.
 *
 * @deprecated Instead of creating cache indexes manually, consider using
 * `enablePersistentCacheIndexAutoCreation()` to let the SDK decide whether to
 * create cache indexes for queries running locally.
 *
 * @beta
 */
export interface IndexField {
  /** The field path to index. */
  readonly fieldPath: string;
  /**
   * What type of array index to create. Set to `CONTAINS` for `array-contains`
   * and `array-contains-any` indexes.
   *
   * Only one of `arrayConfig` or `order` should be set;
   */
  readonly arrayConfig?: 'CONTAINS';
  /**
   * What type of array index to create. Set to `ASCENDING` or 'DESCENDING` for
   * `==`, `!=`, `<=`, `<=`, `in` and `not-in` filters.
   *
   * Only one of `arrayConfig` or `order` should be set.
   */
  readonly order?: 'ASCENDING' | 'DESCENDING';

  [key: string]: unknown;
}

/**
 * The SDK definition of a Firestore index.
 *
 * @deprecated Instead of creating cache indexes manually, consider using
 * `enablePersistentCacheIndexAutoCreation()` to let the SDK decide whether to
 * create cache indexes for queries running locally.
 *
 * @beta
 */
export interface Index {
  /** The ID of the collection to index. */
  readonly collectionGroup: string;
  /** A list of fields to index. */
  readonly fields?: IndexField[];

  [key: string]: unknown;
}

/**
 * A list of Firestore indexes to speed up local query execution.
 *
 * See {@link https://firebase.google.com/docs/reference/firestore/indexes/#json_format | JSON Format}
 * for a description of the format of the index definition.
 *
 * @deprecated Instead of creating cache indexes manually, consider using
 * `enablePersistentCacheIndexAutoCreation()` to let the SDK decide whether to
 * create cache indexes for queries running locally.
 *
 * @beta
 */
export interface IndexConfiguration {
  /** A list of all Firestore indexes. */
  readonly indexes?: Index[];

  [key: string]: unknown;
}

/**
 * Configures indexing for local query execution. Any previous index
 * configuration is overridden. The `Promise` resolves once the index
 * configuration has been persisted.
 *
 * The index entries themselves are created asynchronously. You can continue to
 * use queries that require indexing even if the indices are not yet available.
 * Query execution will automatically start using the index once the index
 * entries have been written.
 *
 * Indexes are only supported with IndexedDb persistence. If IndexedDb is not
 * enabled, any index configuration is ignored.
 *
 * @param firestore - The {@link Firestore} instance to configure indexes for.
 * @param configuration -The index definition.
 * @throws FirestoreError if the JSON format is invalid.
 * @returns A `Promise` that resolves once all indices are successfully
 * configured.
 *
 * @deprecated Instead of creating cache indexes manually, consider using
 * `enablePersistentCacheIndexAutoCreation()` to let the SDK decide whether to
 * create cache indexes for queries running locally.
 *
 * @beta
 */
export function setIndexConfiguration(
  firestore: Firestore,
  configuration: IndexConfiguration
): Promise<void>;

/**
 * Configures indexing for local query execution. Any previous index
 * configuration is overridden. The `Promise` resolves once the index
 * configuration has been persisted.
 *
 * The index entries themselves are created asynchronously. You can continue to
 * use queries that require indexing even if the indices are not yet available.
 * Query execution will automatically start using the index once the index
 * entries have been written.
 *
 * Indexes are only supported with IndexedDb persistence. Invoke either
 * `enableIndexedDbPersistence()` or `enableMultiTabIndexedDbPersistence()`
 * before setting an index configuration. If IndexedDb is not enabled, any
 * index configuration is ignored.
 *
 * The method accepts the JSON format exported by the Firebase CLI (`firebase
 * firestore:indexes`). If the JSON format is invalid, this method throws an
 * error.
 *
 * @param firestore - The {@link Firestore} instance to configure indexes for.
 * @param json -The JSON format exported by the Firebase CLI.
 * @throws FirestoreError if the JSON format is invalid.
 * @returns A `Promise` that resolves once all indices are successfully
 * configured.
 *
 * @deprecated Instead of creating cache indexes manually, consider using
 * `enablePersistentCacheIndexAutoCreation()` to let the SDK decide whether to
 * create cache indexes for queries running locally.
 *
 * @beta
 */
export function setIndexConfiguration(
  firestore: Firestore,
  json: string
): Promise<void>;

export function setIndexConfiguration(
  firestore: Firestore,
  jsonOrConfiguration: string | IndexConfiguration
): Promise<void> {
  const persistentCacheIndexManager = getPersistentCacheIndexManager(firestore);
  if (!persistentCacheIndexManager) {
    // PORTING NOTE: We don't return an error if the user has not enabled
    // persistence since `enableIndexeddbPersistence()` can fail on the Web.
    logWarn('Cannot enable indexes when persistence is disabled');
    return Promise.resolve();
  }

  persistentCacheIndexManager._client.verifyNotTerminated();

  const parsedIndexes = parseIndexes(jsonOrConfiguration);

  ensureFieldIndexPluginFactoriesInitialized(persistentCacheIndexManager);
  return firestoreClientSetIndexConfiguration(
    persistentCacheIndexManager._client,
    persistentCacheIndexManager._fieldIndexPluginFactories
      .queryEngineFieldIndexPluginFactory,
    persistentCacheIndexManager._fieldIndexPluginFactories
      .indexManagerFieldIndexPluginFactory,
    persistentCacheIndexManager._fieldIndexPluginFactories
      .indexBackfillerSchedulerFactory,
    parsedIndexes
  );
}

export function parseIndexes(
  jsonOrConfiguration: string | IndexConfiguration
): FieldIndex[] {
  const indexConfiguration =
    typeof jsonOrConfiguration === 'string'
      ? (tryParseJson(jsonOrConfiguration) as IndexConfiguration)
      : jsonOrConfiguration;
  const parsedIndexes: FieldIndex[] = [];

  if (Array.isArray(indexConfiguration.indexes)) {
    for (const index of indexConfiguration.indexes) {
      const collectionGroup = tryGetString(index, 'collectionGroup');

      const segments: IndexSegment[] = [];
      if (Array.isArray(index.fields)) {
        for (const field of index.fields) {
          const fieldPathString = tryGetString(field, 'fieldPath');
          const fieldPath = fieldPathFromDotSeparatedString(
            'setIndexConfiguration',
            fieldPathString
          );

          if (field.arrayConfig === 'CONTAINS') {
            segments.push(new IndexSegment(fieldPath, IndexKind.CONTAINS));
          } else if (field.order === 'ASCENDING') {
            segments.push(new IndexSegment(fieldPath, IndexKind.ASCENDING));
          } else if (field.order === 'DESCENDING') {
            segments.push(new IndexSegment(fieldPath, IndexKind.DESCENDING));
          }
        }
      }

      parsedIndexes.push(
        new FieldIndex(
          FieldIndex.UNKNOWN_ID,
          collectionGroup,
          segments,
          IndexState.empty()
        )
      );
    }
  }
  return parsedIndexes;
}

function tryParseJson(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json);
  } catch (e) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      'Failed to parse JSON: ' + (e as Error)?.message
    );
  }
}

function tryGetString(data: Record<string, unknown>, property: string): string {
  if (typeof data[property] !== 'string') {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      'Missing string value for: ' + property
    );
  }
  return data[property] as string;
}
