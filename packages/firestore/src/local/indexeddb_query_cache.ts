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

import { Timestamp } from '../api/timestamp';
import { Query } from '../core/query';
import { SnapshotVersion } from '../core/snapshot_version';
import { ListenSequenceNumber, TargetId } from '../core/types';
import { DocumentKeySet, documentKeySet } from '../model/collections';
import { DocumentKey } from '../model/document_key';
import { assert } from '../util/assert';
import { immediateSuccessor } from '../util/misc';

import { TargetIdGenerator } from '../core/target_id_generator';
import * as EncodedResourcePath from './encoded_resource_path';
import { GarbageCollector } from './garbage_collector';
import {
  IndexedDbPersistence,
  IndexedDbTransaction
} from './indexeddb_persistence';
import {
  DbTarget,
  DbTargetDocument,
  DbTargetDocumentKey,
  DbTargetGlobal,
  DbTargetGlobalKey,
  DbTargetKey
} from './indexeddb_schema';
import { LocalSerializer } from './local_serializer';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { QueryCache } from './query_cache';
import { QueryData } from './query_data';
import { SimpleDb, SimpleDbStore, SimpleDbTransaction } from './simple_db';

export class IndexedDbQueryCache implements QueryCache {
  constructor(private serializer: LocalSerializer) {}

  /** The garbage collector to notify about potential garbage keys. */
  private garbageCollector: GarbageCollector | null = null;

  // PORTING NOTE: We don't cache global metadata for the query cache, since
  // some of it (in particular `highestTargetId`) can be modified by secondary
  // tabs. We could perhaps be more granular (and e.g. still cache
  // `lastRemoteSnapshotVersion` in memory) but for simplicity we currently go
  // to IndexedDb whenever we need to read metadata. We can revisit if it turns
  // out to have a meaningful performance impact.

  private targetIdGenerator = TargetIdGenerator.forQueryCache();

  allocateTargetId(
    transaction: PersistenceTransaction
  ): PersistencePromise<TargetId> {
    return this.retrieveMetadata(transaction).next(metadata => {
      metadata.highestTargetId = this.targetIdGenerator.after(
        metadata.highestTargetId
      );
      return this.saveMetadata(transaction, metadata).next(
        () => metadata.highestTargetId
      );
    });
  }

  getLastRemoteSnapshotVersion(
    transaction: PersistenceTransaction
  ): PersistencePromise<SnapshotVersion> {
    return this.retrieveMetadata(transaction).next(metadata => {
      return SnapshotVersion.fromTimestamp(
        new Timestamp(
          metadata.lastRemoteSnapshotVersion.seconds,
          metadata.lastRemoteSnapshotVersion.nanoseconds
        )
      );
    });
  }

  getHighestSequenceNumber(
    transaction: PersistenceTransaction
  ): PersistencePromise<ListenSequenceNumber> {
    return getHighestListenSequenceNumber(
      (transaction as IndexedDbTransaction).simpleDbTransaction
    );
  }

  setTargetsMetadata(
    transaction: PersistenceTransaction,
    highestListenSequenceNumber: number,
    lastRemoteSnapshotVersion?: SnapshotVersion
  ): PersistencePromise<void> {
    return this.retrieveMetadata(transaction).next(metadata => {
      metadata.highestListenSequenceNumber = highestListenSequenceNumber;
      if (lastRemoteSnapshotVersion) {
        metadata.lastRemoteSnapshotVersion = lastRemoteSnapshotVersion.toTimestamp();
      }
      if (highestListenSequenceNumber > metadata.highestListenSequenceNumber) {
        metadata.highestListenSequenceNumber = highestListenSequenceNumber;
      }
      return this.saveMetadata(transaction, metadata);
    });
  }

  addQueryData(
    transaction: PersistenceTransaction,
    queryData: QueryData
  ): PersistencePromise<void> {
    return this.saveQueryData(transaction, queryData).next(() => {
      return this.retrieveMetadata(transaction).next(metadata => {
        metadata.targetCount += 1;
        this.updateMetadataFromQueryData(queryData, metadata);
        return this.saveMetadata(transaction, metadata);
      });
    });
  }

  updateQueryData(
    transaction: PersistenceTransaction,
    queryData: QueryData
  ): PersistencePromise<void> {
    return this.saveQueryData(transaction, queryData);
  }

  removeQueryData(
    transaction: PersistenceTransaction,
    queryData: QueryData
  ): PersistencePromise<void> {
    return this.removeMatchingKeysForTargetId(transaction, queryData.targetId)
      .next(() => targetsStore(transaction).delete(queryData.targetId))
      .next(() => this.retrieveMetadata(transaction))
      .next(metadata => {
        assert(metadata.targetCount > 0, 'Removing from an empty query cache');
        metadata.targetCount -= 1;
        return this.saveMetadata(transaction, metadata);
      });
  }

  private retrieveMetadata(
    transaction: PersistenceTransaction
  ): PersistencePromise<DbTargetGlobal> {
    return retrieveMetadata(
      (transaction as IndexedDbTransaction).simpleDbTransaction
    );
  }

  private saveMetadata(
    transaction: PersistenceTransaction,
    metadata: DbTargetGlobal
  ): PersistencePromise<void> {
    return globalTargetStore(transaction).put(DbTargetGlobal.key, metadata);
  }

  private saveQueryData(
    transaction: PersistenceTransaction,
    queryData: QueryData
  ): PersistencePromise<void> {
    return targetsStore(transaction).put(this.serializer.toDbTarget(queryData));
  }

  /**
   * In-place updates the provided metadata to account for values in the given
   * QueryData. Saving is done separately. Returns true if there were any
   * changes to the metadata.
   */
  private updateMetadataFromQueryData(
    queryData: QueryData,
    metadata: DbTargetGlobal
  ): boolean {
    let updated = false;
    if (queryData.targetId > metadata.highestTargetId) {
      metadata.highestTargetId = queryData.targetId;
      updated = true;
    }

    if (queryData.sequenceNumber > metadata.highestListenSequenceNumber) {
      metadata.highestListenSequenceNumber = queryData.sequenceNumber;
      updated = true;
    }
    return updated;
  }

  getQueryCount(
    transaction: PersistenceTransaction
  ): PersistencePromise<number> {
    return this.retrieveMetadata(transaction).next(
      metadata => metadata.targetCount
    );
  }

  getQueryData(
    transaction: PersistenceTransaction,
    query: Query
  ): PersistencePromise<QueryData | null> {
    // Iterating by the canonicalId may yield more than one result because
    // canonicalId values are not required to be unique per target. This query
    // depends on the queryTargets index to be efficient.
    const canonicalId = query.canonicalId();
    const range = IDBKeyRange.bound(
      [canonicalId, Number.NEGATIVE_INFINITY],
      [canonicalId, Number.POSITIVE_INFINITY]
    );
    let result: QueryData | null = null;
    return targetsStore(transaction)
      .iterate(
        { range, index: DbTarget.queryTargetsIndexName },
        (key, value, control) => {
          const found = this.serializer.fromDbTarget(value);
          // After finding a potential match, check that the query is
          // actually equal to the requested query.
          if (query.isEqual(found.query)) {
            result = found;
            control.done();
          }
        }
      )
      .next(() => result);
  }

  addMatchingKeys(
    txn: PersistenceTransaction,
    keys: DocumentKeySet,
    targetId: TargetId
  ): PersistencePromise<void> {
    // PORTING NOTE: The reverse index (documentsTargets) is maintained by
    // IndexedDb.
    const promises: Array<PersistencePromise<void>> = [];
    const store = documentTargetStore(txn);
    keys.forEach(key => {
      const path = EncodedResourcePath.encode(key.path);
      promises.push(store.put(new DbTargetDocument(targetId, path)));
    });
    return PersistencePromise.waitFor(promises);
  }

  removeMatchingKeys(
    txn: PersistenceTransaction,
    keys: DocumentKeySet,
    targetId: TargetId
  ): PersistencePromise<void> {
    // PORTING NOTE: The reverse index (documentsTargets) is maintained by
    // IndexedDb.
    const promises: Array<PersistencePromise<void>> = [];
    const store = documentTargetStore(txn);
    keys.forEach(key => {
      const path = EncodedResourcePath.encode(key.path);
      promises.push(store.delete([targetId, path]));
      if (this.garbageCollector !== null) {
        this.garbageCollector.addPotentialGarbageKey(key);
      }
    });
    return PersistencePromise.waitFor(promises);
  }

  removeMatchingKeysForTargetId(
    txn: PersistenceTransaction,
    targetId: TargetId
  ): PersistencePromise<void> {
    const store = documentTargetStore(txn);
    const range = IDBKeyRange.bound(
      [targetId],
      [targetId + 1],
      /*lowerOpen=*/ false,
      /*upperOpen=*/ true
    );
    return this.notifyGCForRemovedKeys(txn, range).next(() =>
      store.delete(range)
    );
  }

  private notifyGCForRemovedKeys(
    txn: PersistenceTransaction,
    range: IDBKeyRange
  ): PersistencePromise<void> {
    const store = documentTargetStore(txn);
    if (this.garbageCollector !== null && this.garbageCollector.isEager) {
      // In order to generate garbage events properly, we need to read these
      // keys before deleting.
      return store.iterate({ range, keysOnly: true }, (key, _, control) => {
        const path = EncodedResourcePath.decode(key[1]);
        const docKey = new DocumentKey(path);
        // Paranoid assertion in case the the collector is set to null
        // during the iteration.
        assert(
          this.garbageCollector !== null,
          'GarbageCollector for query cache set to null during key removal.'
        );
        this.garbageCollector!.addPotentialGarbageKey(docKey);
      });
    } else {
      return PersistencePromise.resolve();
    }
  }

  getMatchingKeysForTargetId(
    txn: PersistenceTransaction,
    targetId: TargetId
  ): PersistencePromise<DocumentKeySet> {
    const range = IDBKeyRange.bound(
      [targetId],
      [targetId + 1],
      /*lowerOpen=*/ false,
      /*upperOpen=*/ true
    );
    const store = documentTargetStore(txn);
    let result = documentKeySet();

    return store
      .iterate({ range, keysOnly: true }, (key, _, control) => {
        const path = EncodedResourcePath.decode(key[1]);
        const docKey = new DocumentKey(path);
        result = result.add(docKey);
      })
      .next(() => result);
  }

  setGarbageCollector(gc: GarbageCollector | null): void {
    this.garbageCollector = gc;
  }

  // TODO(gsoltis): we can let the compiler assert that txn !== null if we
  // drop null from the type bounds on txn.
  containsKey(
    txn: PersistenceTransaction | null,
    key: DocumentKey
  ): PersistencePromise<boolean> {
    assert(
      txn !== null,
      'Persistence Transaction cannot be null for query cache containsKey'
    );
    const path = EncodedResourcePath.encode(key.path);
    const range = IDBKeyRange.bound(
      [path],
      [immediateSuccessor(path)],
      /*lowerOpen=*/ false,
      /*upperOpen=*/ true
    );
    let count = 0;
    return documentTargetStore(txn!)
      .iterate(
        {
          index: DbTargetDocument.documentTargetsIndex,
          keysOnly: true,
          range
        },
        (key, _, control) => {
          count++;
          control.done();
        }
      )
      .next(() => count > 0);
  }

  getQueryDataForTarget(
    transaction: PersistenceTransaction,
    targetId: TargetId
  ): PersistencePromise<QueryData | null> {
    return targetsStore(transaction)
      .get(targetId)
      .next(found => {
        if (found) {
          return this.serializer.fromDbTarget(found);
        } else {
          return null;
        }
      });
  }
}

/**
 * Helper to get a typed SimpleDbStore for the queries object store.
 */
function targetsStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbTargetKey, DbTarget> {
  return IndexedDbPersistence.getStore<DbTargetKey, DbTarget>(
    txn,
    DbTarget.store
  );
}

/**
 * Helper to get a typed SimpleDbStore for the target globals object store.
 */
function globalTargetStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbTargetGlobalKey, DbTargetGlobal> {
  return IndexedDbPersistence.getStore<DbTargetGlobalKey, DbTargetGlobal>(
    txn,
    DbTargetGlobal.store
  );
}

function retrieveMetadata(
  txn: SimpleDbTransaction
): PersistencePromise<DbTargetGlobal> {
  const globalStore = SimpleDb.getStore<DbTargetGlobalKey, DbTargetGlobal>(
    txn,
    DbTargetGlobal.store
  );
  return globalStore.get(DbTargetGlobal.key).next(metadata => {
    assert(metadata !== null, 'Missing metadata row.');
    return metadata!;
  });
}

export function getHighestListenSequenceNumber(
  txn: SimpleDbTransaction
): PersistencePromise<ListenSequenceNumber> {
  return retrieveMetadata(txn).next(
    targetGlobal => targetGlobal.highestListenSequenceNumber
  );
}

/**
 * Helper to get a typed SimpleDbStore for the document target object store.
 */
function documentTargetStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbTargetDocumentKey, DbTargetDocument> {
  return IndexedDbPersistence.getStore<DbTargetDocumentKey, DbTargetDocument>(
    txn,
    DbTargetDocument.store
  );
}
