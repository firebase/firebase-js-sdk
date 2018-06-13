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
import { DocumentKey } from '../model/document_key';
import { ObjectMap } from '../util/obj_map';

import { GarbageCollector } from './garbage_collector';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { QueryCache } from './query_cache';
import { QueryData } from './query_data';
import { ReferenceSet } from './reference_set';
import { assert } from '../util/assert';
import { TargetIdGenerator } from '../core/target_id_generator';

export class MemoryQueryCache implements QueryCache {
  /**
   * Maps a query to the data about that query
   */
  private queries = new ObjectMap<Query, QueryData>(q => q.canonicalId());

  /** The last received snapshot version. */
  private lastRemoteSnapshotVersion = SnapshotVersion.MIN;
  /** The highest numbered target ID encountered. */
  private highestTargetId: TargetId = 0;
  /**
   * A ordered bidirectional mapping between documents and the remote target
   * IDs.
   */
  private references = new ReferenceSet();

  private targetCount = 0;

  private targetIdGenerator = TargetIdGenerator.forQueryCache();

  start(transaction: PersistenceTransaction): PersistencePromise<void> {
    // Nothing to do.
    return PersistencePromise.resolve();
  }

  getLastRemoteSnapshotVersion(
    transaction: PersistenceTransaction
  ): PersistencePromise<SnapshotVersion> {
    return PersistencePromise.resolve(this.lastRemoteSnapshotVersion);
  }

  allocateTargetId(
    transaction: PersistenceTransaction
  ): PersistencePromise<TargetId> {
    const nextTargetId = this.targetIdGenerator.after(this.highestTargetId);
    this.highestTargetId = nextTargetId;
    return PersistencePromise.resolve(nextTargetId);
  }

  setLastRemoteSnapshotVersion(
    transaction: PersistenceTransaction,
    snapshotVersion: SnapshotVersion
  ): PersistencePromise<void> {
    this.lastRemoteSnapshotVersion = snapshotVersion;
    return PersistencePromise.resolve();
  }

  private saveQueryData(queryData: QueryData): void {
    this.queries.set(queryData.query, queryData);
    const targetId = queryData.targetId;
    if (targetId > this.highestTargetId) {
      this.highestTargetId = targetId;
    }
    // TODO(GC): track sequence number
  }

  addQueryData(
    transaction: PersistenceTransaction,
    queryData: QueryData
  ): PersistencePromise<void> {
    assert(
      !this.queries.has(queryData.query),
      'Adding a query that already exists'
    );
    this.saveQueryData(queryData);
    this.targetCount += 1;
    return PersistencePromise.resolve();
  }

  updateQueryData(
    transaction: PersistenceTransaction,
    queryData: QueryData
  ): PersistencePromise<void> {
    assert(this.queries.has(queryData.query), 'Updating a non-existent query');
    this.saveQueryData(queryData);
    return PersistencePromise.resolve();
  }

  removeQueryData(
    transaction: PersistenceTransaction,
    queryData: QueryData
  ): PersistencePromise<void> {
    assert(this.targetCount > 0, 'Removing a target from an empty cache');
    assert(
      this.queries.has(queryData.query),
      'Removing a non-existent target from the cache'
    );
    this.queries.delete(queryData.query);
    this.references.removeReferencesForId(queryData.targetId);
    this.targetCount -= 1;
    return PersistencePromise.resolve();
  }

  getQueryCount(
    transaction: PersistenceTransaction
  ): PersistencePromise<number> {
    return PersistencePromise.resolve(this.targetCount);
  }

  getQueryData(
    transaction: PersistenceTransaction,
    query: Query
  ): PersistencePromise<QueryData | null> {
    const queryData = this.queries.get(query) || null;
    return PersistencePromise.resolve(queryData);
  }

  getQueryDataForTarget(
    transaction: PersistenceTransaction,
    targetId: TargetId
  ): PersistencePromise<QueryData | null> {
    this.queries.forEach((query, queryData) => {
      if (queryData.targetId === targetId) {
        return PersistencePromise.resolve(queryData);
      }
    });
    return PersistencePromise.resolve(null);
  }

  addMatchingKeys(
    txn: PersistenceTransaction,
    keys: DocumentKeySet,
    targetId: TargetId
  ): PersistencePromise<void> {
    this.references.addReferences(keys, targetId);
    return PersistencePromise.resolve();
  }

  removeMatchingKeys(
    txn: PersistenceTransaction,
    keys: DocumentKeySet,
    targetId: TargetId
  ): PersistencePromise<void> {
    this.references.removeReferences(keys, targetId);
    return PersistencePromise.resolve();
  }

  removeMatchingKeysForTargetId(
    txn: PersistenceTransaction,
    targetId: TargetId
  ): PersistencePromise<void> {
    this.references.removeReferencesForId(targetId);
    return PersistencePromise.resolve();
  }

  getMatchingKeysForTargetId(
    txn: PersistenceTransaction,
    targetId: TargetId
  ): PersistencePromise<DocumentKeySet> {
    const matchingKeys = this.references.referencesForId(targetId);
    return PersistencePromise.resolve(matchingKeys);
  }

  setGarbageCollector(gc: GarbageCollector | null): void {
    this.references.setGarbageCollector(gc);
  }

  containsKey(
    txn: PersistenceTransaction | null,
    key: DocumentKey
  ): PersistencePromise<boolean> {
    return this.references.containsKey(txn, key);
  }
}
