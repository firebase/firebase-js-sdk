/**
 * @license
 * Copyright 2023 Google LLC
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

import {
  FirestoreClient,
  firestoreClientDeleteAllFieldIndexes,
  firestoreClientDisablePersistentCacheIndexAutoCreation,
  firestoreClientEnablePersistentCacheIndexAutoCreation
} from '../core/firestore_client';
import { cast } from '../util/input_validation';
import { logDebug, logWarn } from '../util/log';

import { ensureFirestoreConfigured, Firestore } from './database';
import { FieldIndexManagementApiImpl } from '../index/field_index_management';
import { FieldIndexManagementApi } from '../index/field_index_management_api';

interface PersistentCacheIndexManagerState {
  readonly firestoreClient: FirestoreClient;
  fieldIndexManagementApi?: FieldIndexManagementApi;
}

/**
 * A `PersistentCacheIndexManager` for configuring persistent cache indexes used
 * for local query execution.
 *
 * To use, call `getPersistentCacheIndexManager()` to get an instance.
 */
export class PersistentCacheIndexManager {
  /** A type string to uniquely identify instances of this class. */
  readonly type: 'PersistentCacheIndexManager' = 'PersistentCacheIndexManager';

  readonly _state: PersistentCacheIndexManagerState;

  /** @hideconstructor */
  constructor(firestoreClient: FirestoreClient) {
    this._state = { firestoreClient };
  }
}

/**
 * Returns the PersistentCache Index Manager used by the given `Firestore`
 * object.
 *
 * @return The `PersistentCacheIndexManager` instance, or `null` if local
 * persistent storage is not in use.
 */
export function getPersistentCacheIndexManager(
  firestore: Firestore
): PersistentCacheIndexManager | null {
  firestore = cast(firestore, Firestore);

  const cachedInstance = persistentCacheIndexManagerByFirestore.get(firestore);
  if (cachedInstance) {
    return cachedInstance;
  }

  const client = ensureFirestoreConfigured(firestore);
  if (client._uninitializedComponentsProvider?._offlineKind !== 'persistent') {
    return null;
  }

  const instance = new PersistentCacheIndexManager(client);
  persistentCacheIndexManagerByFirestore.set(firestore, instance);
  return instance;
}

/**
 * Gets the `FieldIndexManagementApi` associated with the given
 * `PersistentCacheIndexManager`, creating it if it does not already exist.
 *
 * @param indexManager The `PersistentCacheIndexManager` instance whose
 * `FieldIndexManagementApi` to get (or create).
 * @return The `FieldIndexManagementApi` instance associated with the given
 * `PersistentCacheIndexManager`; this function will return the exact same
 * object for a given `PersistentCacheIndexManager` object.
 */
export function persistentCacheIndexManagerGetOrCreateFieldIndexManagementApi(
  indexManager: PersistentCacheIndexManager
): FieldIndexManagementApi {
  const client = persistentCacheIndexManagerGetFirestoreClient(indexManager);
  if (!indexManager._state.fieldIndexManagementApi) {
    indexManager._state.fieldIndexManagementApi =
      new FieldIndexManagementApiImpl(
        client.configuration.databaseInfo.databaseId
      );
  }
  return indexManager._state.fieldIndexManagementApi;
}

/**
 * Gets the `FirestoreClient` associated with the given
 * `PersistentCacheIndexManager`.
 *
 * @param indexManager The `PersistentCacheIndexManager` instance whose
 * `FirestoreClient` to get.
 * @return The `FirestoreClient` instance associated with the given
 * `PersistentCacheIndexManager`; this function will return the exact same
 * object for a given `PersistentCacheIndexManager` object.
 */
export function persistentCacheIndexManagerGetFirestoreClient(
  indexManager: PersistentCacheIndexManager
): FirestoreClient {
  return indexManager._state.firestoreClient;
}

/**
 * Enables the SDK to create persistent cache indexes automatically for local
 * query execution when the SDK believes cache indexes can help improve
 * performance.
 *
 * This feature is disabled by default.
 */
export function enablePersistentCacheIndexAutoCreation(
  indexManager: PersistentCacheIndexManager
): void {
  const client = persistentCacheIndexManagerGetFirestoreClient(indexManager);
  client.verifyNotTerminated();

  const fieldIndexManagementApi =
    persistentCacheIndexManagerGetOrCreateFieldIndexManagementApi(indexManager);

  firestoreClientEnablePersistentCacheIndexAutoCreation(
    client,
    fieldIndexManagementApi
  )
    .then(() =>
      logDebug('enabling persistent cache index auto creation succeeded')
    )
    .catch(error =>
      logWarn('enabling persistent cache index auto creation failed', error)
    );
}

/**
 * Stops creating persistent cache indexes automatically for local query
 * execution. The indexes which have been created by calling
 * `enablePersistentCacheIndexAutoCreation()` still take effect.
 */
export function disablePersistentCacheIndexAutoCreation(
  indexManager: PersistentCacheIndexManager
): void {
  const client = persistentCacheIndexManagerGetFirestoreClient(indexManager);
  client.verifyNotTerminated();

  firestoreClientDisablePersistentCacheIndexAutoCreation(client)
    .then(() =>
      logDebug('disabling persistent cache index auto creation succeeded')
    )
    .catch(error =>
      logWarn('disabling persistent cache index auto creation failed', error)
    );
}

/**
 * Removes all persistent cache indexes.
 *
 * Please note this function will also delete indexes generated by
 * `setIndexConfiguration()`, which is deprecated.
 */
export function deleteAllPersistentCacheIndexes(
  indexManager: PersistentCacheIndexManager
): void {
  const client = persistentCacheIndexManagerGetFirestoreClient(indexManager);
  client.verifyNotTerminated();

  const fieldIndexManagementApi =
    persistentCacheIndexManagerGetOrCreateFieldIndexManagementApi(indexManager);

  firestoreClientDeleteAllFieldIndexes(client, fieldIndexManagementApi)
    .then(_ => logDebug('deleting all persistent cache indexes succeeded'))
    .catch(error =>
      logWarn('deleting all persistent cache indexes failed', error)
    );
}

/**
 * Maps `Firestore` instances to their corresponding
 * `PersistentCacheIndexManager` instances.
 *
 * Use a `WeakMap` so that the mapping will be automatically dropped when the
 * `Firestore` instance is garbage collected. This emulates a private member
 * as described in https://goo.gle/454yvug.
 */
const persistentCacheIndexManagerByFirestore = new WeakMap<
  Firestore,
  PersistentCacheIndexManager
>();
