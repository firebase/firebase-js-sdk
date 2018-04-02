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
import { assert, fail } from '../util/assert';
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
import { SimpleDbStore, SimpleDbTransaction } from './simple_db';

export class IndexedDbQueryCache implements QueryCache {
  constructor(private serializer: LocalSerializer) {}

  /**
   * The last received snapshot version. We store this seperately from the
   * metadata to avoid the extra conversion to/from DbTimestamp.
   */
  private lastRemoteSnapshotVersion = SnapshotVersion.MIN;

  /**
   * A cached copy of the metadata for the query cache.
   */
  private metadata = null;

  /** The garbage collector to notify about potential garbage keys. */
  private garbageCollector: GarbageCollector | null = null;

  start(transaction: PersistenceTransaction): PersistencePromise<void> {
    return globalTargetStore(transaction)
      .get(DbTargetGlobal.key)
      .next(metadata => {
        assert(
          metadata !== null,
          'Missing metadata row that should be added by schema migration.'
        );
        this.metadata = metadata;
        const lastSavedVersion = metadata.lastRemoteSnapshotVersion;
        this.lastRemoteSnapshotVersion = SnapshotVersion.fromTimestamp(
          new Timestamp(lastSavedVersion.seconds, lastSavedVersion.nanoseconds)
        );
        return PersistencePromise.resolve();
      });
  }

  getHighestTargetId(): TargetId {
    return this.metadata.highestTargetId;
  }

  getLastRemoteSnapshotVersion(): SnapshotVersion {
    return this.lastRemoteSnapshotVersion;
  }

  setLastRemoteSnapshotVersion(
    transaction: PersistenceTransaction,
    snapshotVersion: SnapshotVersion
  ): PersistencePromise<void> {
    this.lastRemoteSnapshotVersion = snapshotVersion;
    this.metadata.lastRemoteSnapshotVersion = snapshotVersion.toTimestamp();
    return globalTargetStore(transaction).put(
      DbTargetGlobal.key,
      this.metadata
    );
  }

  addQueryData(
    transaction: PersistenceTransaction,
    queryData: QueryData
  ): PersistencePromise<void> {
    return this.saveQueryData(transaction, queryData).next(() => {
      this.metadata.targetCount += 1;
      this.updateMetadataFromQueryData(queryData);
      return this.saveMetadata(transaction);
    });
  }

  updateQueryData(
    transaction: PersistenceTransaction,
    queryData: QueryData
  ): PersistencePromise<void> {
    return this.saveQueryData(transaction, queryData).next(() => {
      if (this.updateMetadataFromQueryData(queryData)) {
        return this.saveMetadata(transaction);
      } else {
        return PersistencePromise.resolve();
      }
    });
  }

  removeQueryData(
    transaction: PersistenceTransaction,
    queryData: QueryData
  ): PersistencePromise<void> {
    assert(this.metadata.targetCount > 0, 'Removing from an empty query cache');
    return this.removeMatchingKeysForTargetId(transaction, queryData.targetId)
      .next(() => targetsStore(transaction).delete(queryData.targetId))
      .next(() => {
        this.metadata.targetCount -= 1;
        return this.saveMetadata(transaction);
      });
  }

  private saveMetadata(
    transaction: PersistenceTransaction
  ): PersistencePromise<void> {
    return globalTargetStore(transaction).put(
      DbTargetGlobal.key,
      this.metadata
    );
  }

  private saveQueryData(
    transaction: PersistenceTransaction,
    queryData: QueryData
  ): PersistencePromise<void> {
    return targetsStore(transaction).put(this.serializer.toDbTarget(queryData));
  }

  /**
   * Updates the in-memory version of the metadata to account for values in the
   * given QueryData. Saving is done separately. Returns true if there were any
   * changes to the metadata.
   */
  private updateMetadataFromQueryData(queryData: QueryData): boolean {
    let needsUpdate = false;
    if (queryData.targetId > this.metadata.highestTargetId) {
      this.metadata.highestTargetId = queryData.targetId;
      needsUpdate = true;
    }

    // TODO(GC): add sequence number check
    return needsUpdate;
  }

  get count(): number {
    return this.metadata.targetCount;
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
  return getStore<DbTargetKey, DbTarget>(txn, DbTarget.store);
}

/**
 * Helper to get a typed SimpleDbStore for the target globals object store.
 */
function globalTargetStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbTargetGlobalKey, DbTargetGlobal> {
  return getStore<DbTargetGlobalKey, DbTargetGlobal>(txn, DbTargetGlobal.store);
}

/**
 * Helper to get a typed SimpleDbStore for the document target object store.
 */
function documentTargetStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbTargetDocumentKey, DbTargetDocument> {
  return getStore<DbTargetDocumentKey, DbTargetDocument>(
    txn,
    DbTargetDocument.store
  );
}

/**
 * Helper to get a typed SimpleDbStore from a transaction.
 */
function getStore<KeyType extends IDBValidKey, ValueType>(
  txn: PersistenceTransaction,
  store: string
): SimpleDbStore<KeyType, ValueType> {
  if (txn instanceof SimpleDbTransaction) {
    return txn.store<KeyType, ValueType>(store);
  } else {
    return fail('Invalid transaction object provided!');
  }
}
