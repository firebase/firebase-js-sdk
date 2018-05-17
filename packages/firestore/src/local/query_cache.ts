/**
 * Copyright 2017 Google Inc.
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

import { Query } from '../core/query';
import { SnapshotVersion } from '../core/snapshot_version';
import { TargetId } from '../core/types';
import { DocumentKeySet } from '../model/collections';

import { GarbageSource } from './garbage_source';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { QueryData } from './query_data';
import { TargetChange } from '../remote/remote_event';

/**
 * Represents cached queries received from the remote backend.
 *
 * The cache is keyed by Query and entries in the cache are QueryData instances.
 */
export interface QueryCache extends GarbageSource {
  /**
   * Starts up the query cache.
   */
  start(transaction: PersistenceTransaction): PersistencePromise<void>;

  /**
   * Returns the highest target ID of any query in the cache. Typically called
   * during startup to seed a target ID generator and avoid collisions with
   * existing queries. If there are no queries in the cache, returns zero.
   */
  getHighestTargetId(): TargetId;

  /**
   * A global snapshot version representing the last consistent snapshot we
   * received from the backend. This is monotonically increasing and any
   * snapshots received from the backend prior to this version (e.g. for targets
   * resumed with a resume_token) should be suppressed (buffered) until the
   * backend has caught up to this snapshot version again. This prevents our
   * cache from ever going backwards in time.
   *
   * This is updated whenever our we get a TargetChange with a read_time and
   * empty target_ids.
   */
  getLastRemoteSnapshotVersion(): SnapshotVersion;

  /**
   * Set the snapshot version representing the last consistent snapshot received
   * from the backend. (see getLastRemoteSnapshotVersion() for more details).
   *
   * @param snapshotVersion The new snapshot version.
   */
  setLastRemoteSnapshotVersion(
    transaction: PersistenceTransaction,
    snapshotVersion: SnapshotVersion
  ): PersistencePromise<void>;

  /**
   * Adds an entry in the cache.
   *
   * The cache key is extracted from `queryData.query`. The key must not already
   * exist in the cache.
   *
   * @param queryData A QueryData instance to put in the cache.
   */
  addQueryData(
    transaction: PersistenceTransaction,
    queryData: QueryData
  ): PersistencePromise<void>;

  /**
   * Updates an entry in the cache.
   *
   * The cache key is extracted from `queryData.query`. The entry must already
   * exist in the cache, and it will be replaced.
   * @param {QueryData} queryData The QueryData to be replaced into the cache.
   */
  updateQueryData(
    transaction: PersistenceTransaction,
    queryData: QueryData
  ): PersistencePromise<void>;

  /**
   * Removes the cached entry for the given query data. It is an error to remove
   * a query data that does not exist.
   */
  removeQueryData(
    transaction: PersistenceTransaction,
    queryData: QueryData
  ): PersistencePromise<void>;

  /**
   * The number of targets currently in the cache.
   */
  readonly count: number;

  /**
   * Looks up a QueryData entry in the cache.
   *
   * Multi-Tab Note: This operation is safe to use from secondary clients.
   *
   * @param query The query corresponding to the entry to look up.
   * @return The cached QueryData entry, or null if the cache has no entry for
   * the query.
   */
  getQueryData(
    transaction: PersistenceTransaction,
    query: Query
  ): PersistencePromise<QueryData | null>;

  /**
   * Applies the target change event to the cached query results of the given
   * target.
   */
  applyTargetChange(
    transaction: PersistenceTransaction,
    tagetId: TargetId,
    change: TargetChange
  ): PersistencePromise<void>;

  /**
   * Returns the document keys that match the provided target ID.
   *
   * Multi-Tab Note: This operation is safe to use from secondary clients.
   */
  getMatchingKeysForTargetId(
    transaction: PersistenceTransaction,
    targetId: TargetId
  ): PersistencePromise<DocumentKeySet>;

  /**
   * Returns the document keys that were updated by the given target, optionally
   * starting from the provided snapshot version (inclusive).
   *
   * Returned document keys are for documents that were added, modified or
   * removed at any intermediate snapshots and may include documents that only
   * existed temporarily.
   */
  getChangedKeysForTargetId(
    transaction: PersistenceTransaction,
    targetId: TargetId,
    fromSnapshot?: SnapshotVersion
  ): PersistencePromise<DocumentKeySet>;
}
