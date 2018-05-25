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
import { TargetId } from '../core/types';
import { DocumentKeySet, documentKeySet } from '../model/collections';
import { DocumentKey } from '../model/document_key';
import { assert } from '../util/assert';
import { immediateSuccessor } from '../util/misc';

import * as EncodedResourcePath from './encoded_resource_path';
import { GarbageCollector } from './garbage_collector';
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
import { SimpleDb, SimpleDbStore } from './simple_db';
import { TargetIdGenerator } from '../core/target_id_generator';

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

  start(transaction: PersistenceTransaction): PersistencePromise<void> {
    // Nothing to do.
    return PersistencePromise.resolve();
  }

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

  setLastRemoteSnapshotVersion(
    transaction: PersistenceTransaction,
    snapshotVersion: SnapshotVersion
  ): PersistencePromise<void> {
    return this.retrieveMetadata(transaction).next(metadata => {
      metadata.lastRemoteSnapshotVersion = snapshotVersion.toTimestamp();
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
    return this.saveQueryData(transaction, queryData).next(() => {
      return this.retrieveMetadata(transaction).next(metadata => {
        if (this.updateMetadataFromQueryData(queryData, metadata)) {
          return this.saveMetadata(transaction, metadata);
        } else {
          return PersistencePromise.resolve();
        }
      });
    });
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
    return globalTargetStore(transaction)
      .get(DbTargetGlobal.key)
      .next(metadata => {
        assert(metadata !== null, 'Missing metadata row.');
        return metadata;
      });
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
    if (queryData.targetId > metadata.highestTargetId) {
      metadata.highestTargetId = queryData.targetId;
      return true;
    }

    // TODO(GC): add sequence number check
    return false;
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
    // depends on the queryTargets index to be efficent.
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
    // Indexeddb.
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
}

/**
 * Helper to get a typed SimpleDbStore for the queries object store.
 */
function targetsStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbTargetKey, DbTarget> {
  return SimpleDb.getStore<DbTargetKey, DbTarget>(txn, DbTarget.store);
}

/**
 * Helper to get a typed SimpleDbStore for the target globals object store.
 */
function globalTargetStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbTargetGlobalKey, DbTargetGlobal> {
  return SimpleDb.getStore<DbTargetGlobalKey, DbTargetGlobal>(
    txn,
    DbTargetGlobal.store
  );
}

/**
 * Helper to get a typed SimpleDbStore for the document target object store.
 */
function documentTargetStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbTargetDocumentKey, DbTargetDocument> {
  return SimpleDb.getStore<DbTargetDocumentKey, DbTargetDocument>(
    txn,
    DbTargetDocument.store
  );
}
