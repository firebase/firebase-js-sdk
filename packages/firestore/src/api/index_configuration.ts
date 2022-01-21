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

import { fieldPathFromDotSeparatedString } from '../lite-api/user_data_reader';
import { FieldIndex, Kind, Segment } from '../model/field_index';
import { Code, FirestoreError } from '../util/error';
import { cast } from '../util/input_validation';

import { ensureFirestoreConfigured, Firestore } from './database';

export {
  connectFirestoreEmulator,
  EmulatorMockTokenOptions
} from '../lite-api/database';

// TODO(indexing): Remove "@internal" from the API.

/**
 * A single field element in an index configuration.
 *
 * @internal
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
 * @internal
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
 * @internal
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
 * Indexes are only supported with IndexedDb persistence. Invoke either
 * `enableIndexedDbPersistence()` or `enableMultiTabIndexedDbPersistence()`
 * before setting an index configuration. If IndexedDb is not enabled, any
 * index configuration is ignored.
 *
 * @internal
 * @param firestore - The {@link Firestore} instance to configure indexes for.
 * @param configuration -The index definition.
 * @throws FirestoreError if the JSON format is invalid.
 * @returns A `Promise` that resolves once all indices are successfully
 * configured.
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
 * @internal
 * @param firestore - The {@link Firestore} instance to configure indexes for.
 * @param json -The JSON format exported by the Firebase CLI.
 * @throws FirestoreError if the JSON format is invalid.
 * @returns A `Promise` that resolves once all indices are successfully
 * configured.
 */
export function setIndexConfiguration(
  firestore: Firestore,
  json: string
): Promise<void>;
export function setIndexConfiguration(
  firestore: Firestore,
  jsonOrConfiguration: string | IndexConfiguration
): Promise<void> {
  firestore = cast(firestore, Firestore);
  ensureFirestoreConfigured(firestore);

  const indexConfiguration =
    typeof jsonOrConfiguration === 'string'
      ? (tryParseJson(jsonOrConfiguration) as IndexConfiguration)
      : jsonOrConfiguration;
  const parsedIndexes: FieldIndex[] = [];

  // PORTING NOTE: We don't return an error if the user has not enabled
  // persistence since `enableIndexeddbPersistence()` can fail on the Web.

  if (Array.isArray(indexConfiguration.indexes)) {
    for (const index of indexConfiguration.indexes) {
      const collectionGroup = tryGetString(index, 'collectionGroup');

      const segments: Segment[] = [];
      if (Array.isArray(index.fields)) {
        for (const field of index.fields) {
          const fieldPathString = tryGetString(field, 'fieldPath');
          const fieldPath = fieldPathFromDotSeparatedString(
            'setIndexConfiguration',
            fieldPathString
          );

          if (field.arrayConfig === 'CONTAINS') {
            segments.push(new Segment(fieldPath, Kind.CONTAINS));
          } else if (field.order === 'ASCENDING') {
            segments.push(new Segment(fieldPath, Kind.ASCENDING));
          } else if (field.order === 'DESCENDING') {
            segments.push(new Segment(fieldPath, Kind.DESCENDING));
          }
        }
      }

      parsedIndexes.push(
        new FieldIndex(FieldIndex.UNKNOWN_ID, collectionGroup, segments)
      );
    }
  }

  // TODO(indexing): Configure indexes
  return Promise.resolve();
}

function tryParseJson(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json);
  } catch (e) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      'Failed to parse JSON:' + e.message
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
