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
import { ListenSequenceNumber, TargetId } from '../core/types';
import { DocumentKeySet } from '../model/collections';
import { DocumentKey } from '../model/document_key';
import { ObjectMap } from '../util/obj_map';

import { TargetIdGenerator } from '../core/target_id_generator';
import { assert, fail } from '../util/assert';
import { GarbageCollector } from './garbage_collector';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { QueryCache } from './query_cache';
import { QueryData } from './query_data';
import { ReferenceSet } from './reference_set';

export class MemoryQueryCache implements QueryCache {
  /**
   * Maps a query to the data about that query
   */
  private queries = new ObjectMap<Query, QueryData>(q => q.canonicalId());

  /** The last received snapshot version. */
  private lastRemoteSnapshotVersion = SnapshotVersion.MIN;
  /** The highest numbered target ID encountered. */
  private highestTargetId: TargetId = 0;
  /** The highest sequence number encountered. */
  private highestSequenceNumber: ListenSequenceNumber = 0;
  /**
   * A ordered bidirectional mapping between documents and the remote target
   * IDs.
   */
  private references = new ReferenceSet();

  private targetCount = 0;

  private targetIdGenerator = TargetIdGenerator.forQueryCache();

  getLastRemoteSnapshotVersion(
    transaction: PersistenceTransaction
  ): PersistencePromise<SnapshotVersion> {
    return PersistencePromise.resolve(this.lastRemoteSnapshotVersion);
  }

  getHighestSequenceNumber(
    transaction: PersistenceTransaction
  ): PersistencePromise<ListenSequenceNumber> {
    return PersistencePromise.resolve(this.highestSequenceNumber);
  }

  allocateTargetId(
    transaction: PersistenceTransaction
  ): PersistencePromise<TargetId> {
    const nextTargetId = this.targetIdGenerator.after(this.highestTargetId);
    this.highestTargetId = nextTargetId;
    return PersistencePromise.resolve(nextTargetId);
  }

  setTargetsMetadata(
    transaction: PersistenceTransaction,
    highestListenSequenceNumber: number,
    lastRemoteSnapshotVersion?: SnapshotVersion
  ): PersistencePromise<void> {
    if (lastRemoteSnapshotVersion) {
      this.lastRemoteSnapshotVersion = lastRemoteSnapshotVersion;
    }
    if (highestListenSequenceNumber > this.highestSequenceNumber) {
      this.highestSequenceNumber = highestListenSequenceNumber;
    }
    return PersistencePromise.resolve();
  }

  private saveQueryData(queryData: QueryData): void {
    this.queries.set(queryData.query, queryData);
    const targetId = queryData.targetId;
    if (targetId > this.highestTargetId) {
      this.highestTargetId = targetId;
    }
    if (queryData.sequenceNumber > this.highestSequenceNumber) {
      this.highestSequenceNumber = queryData.sequenceNumber;
    }
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
  ): never {
    // This method is only needed for multi-tab and we can't implement it
    // efficiently without additional data structures.
    return fail('Not yet implemented.');
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
