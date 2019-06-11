/**
 * @license
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
import { TargetIdGenerator } from '../core/target_id_generator';
import { ListenSequenceNumber, TargetId } from '../core/types';
import { DocumentKeySet } from '../model/collections';
import { DocumentKey } from '../model/document_key';
import { assert, fail } from '../util/assert';
import { ObjectMap } from '../util/obj_map';

import { ActiveTargets } from './lru_garbage_collector';
import { MemoryPersistence } from './memory_persistence';
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

  constructor(private readonly persistence: MemoryPersistence) {}

  getTargetCount(txn: PersistenceTransaction): PersistencePromise<number> {
    return PersistencePromise.resolve(this.targetCount);
  }

  forEachTarget(
    txn: PersistenceTransaction,
    f: (q: QueryData) => void
  ): PersistencePromise<void> {
    this.queries.forEach((_, queryData) => f(queryData));
    return PersistencePromise.resolve();
  }

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

  removeTargets(
    transaction: PersistenceTransaction,
    upperBound: ListenSequenceNumber,
    activeTargetIds: ActiveTargets
  ): PersistencePromise<number> {
    let count = 0;
    const removals: Array<PersistencePromise<void>> = [];
    this.queries.forEach((key, queryData) => {
      if (
        queryData.sequenceNumber <= upperBound &&
        !activeTargetIds[queryData.targetId]
      ) {
        this.queries.delete(key);
        removals.push(
          this.removeMatchingKeysForTargetId(transaction, queryData.targetId)
        );
        count++;
      }
    });
    return PersistencePromise.waitFor(removals).next(() => count);
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
    const referenceDelegate = this.persistence.referenceDelegate;
    const promises: Array<PersistencePromise<void>> = [];
    if (referenceDelegate) {
      keys.forEach(key => {
        promises.push(referenceDelegate.addReference(txn, key));
      });
    }
    return PersistencePromise.waitFor(promises);
  }

  removeMatchingKeys(
    txn: PersistenceTransaction,
    keys: DocumentKeySet,
    targetId: TargetId
  ): PersistencePromise<void> {
    this.references.removeReferences(keys, targetId);
    const referenceDelegate = this.persistence.referenceDelegate;
    const promises: Array<PersistencePromise<void>> = [];
    if (referenceDelegate) {
      keys.forEach(key => {
        promises.push(referenceDelegate.removeReference(txn, key));
      });
    }
    return PersistencePromise.waitFor(promises);
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

  containsKey(
    txn: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<boolean> {
    return PersistencePromise.resolve(this.references.containsKey(key));
  }
}
