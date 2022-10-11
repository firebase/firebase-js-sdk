/**
 * @license
 * Copyright 2017 Google LLC
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

import { SnapshotVersion } from '../core/snapshot_version';
import { canonifyTarget, Target, targetEquals } from '../core/target';
import { TargetIdGenerator } from '../core/target_id_generator';
import { ListenSequenceNumber, TargetId } from '../core/types';
import { Timestamp } from '../lite-api/timestamp';
import { DocumentKeySet, documentKeySet } from '../model/collections';
import { DocumentKey } from '../model/document_key';
import { hardAssert } from '../util/assert';
import { immediateSuccessor } from '../util/misc';

import {
  decodeResourcePath,
  encodeResourcePath
} from './encoded_resource_path';
import { IndexedDbLruDelegate } from './indexeddb_lru_delegate';
import { DbTarget, DbTargetDocument, DbTargetGlobal } from './indexeddb_schema';
import {
  DbTargetDocumentDocumentTargetsIndex,
  DbTargetDocumentKey,
  DbTargetDocumentStore,
  DbTargetGlobalKey,
  DbTargetGlobalStore,
  DbTargetKey,
  DbTargetQueryTargetsIndexName,
  DbTargetStore
} from './indexeddb_sentinels';
import { getStore } from './indexeddb_transaction';
import { fromDbTarget, LocalSerializer, toDbTarget } from './local_serializer';
import { ActiveTargets } from './lru_garbage_collector';
import { PersistencePromise } from './persistence_promise';
import { PersistenceTransaction } from './persistence_transaction';
import { SimpleDbStore } from './simple_db';
import { TargetCache } from './target_cache';
import { TargetData } from './target_data';

export class IndexedDbTargetCache implements TargetCache {
  constructor(
    private readonly referenceDelegate: IndexedDbLruDelegate,
    private serializer: LocalSerializer
  ) {}

  // PORTING NOTE: We don't cache global metadata for the target cache, since
  // some of it (in particular `highestTargetId`) can be modified by secondary
  // tabs. We could perhaps be more granular (and e.g. still cache
  // `lastRemoteSnapshotVersion` in memory) but for simplicity we currently go
  // to IndexedDb whenever we need to read metadata. We can revisit if it turns
  // out to have a meaningful performance impact.

  allocateTargetId(
    transaction: PersistenceTransaction
  ): PersistencePromise<TargetId> {
    return this.retrieveMetadata(transaction).next(metadata => {
      const targetIdGenerator = new TargetIdGenerator(metadata.highestTargetId);
      metadata.highestTargetId = targetIdGenerator.next();
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
    return this.retrieveMetadata(transaction).next(
      targetGlobal => targetGlobal.highestListenSequenceNumber
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
        metadata.lastRemoteSnapshotVersion =
          lastRemoteSnapshotVersion.toTimestamp();
      }
      if (highestListenSequenceNumber > metadata.highestListenSequenceNumber) {
        metadata.highestListenSequenceNumber = highestListenSequenceNumber;
      }
      return this.saveMetadata(transaction, metadata);
    });
  }

  addTargetData(
    transaction: PersistenceTransaction,
    targetData: TargetData
  ): PersistencePromise<void> {
    return this.saveTargetData(transaction, targetData).next(() => {
      return this.retrieveMetadata(transaction).next(metadata => {
        metadata.targetCount += 1;
        this.updateMetadataFromTargetData(targetData, metadata);
        return this.saveMetadata(transaction, metadata);
      });
    });
  }

  updateTargetData(
    transaction: PersistenceTransaction,
    targetData: TargetData
  ): PersistencePromise<void> {
    return this.saveTargetData(transaction, targetData);
  }

  removeTargetData(
    transaction: PersistenceTransaction,
    targetData: TargetData
  ): PersistencePromise<void> {
    return this.removeMatchingKeysForTargetId(transaction, targetData.targetId)
      .next(() => targetsStore(transaction).delete(targetData.targetId))
      .next(() => this.retrieveMetadata(transaction))
      .next(metadata => {
        hardAssert(
          metadata.targetCount > 0,
          'Removing from an empty target cache'
        );
        metadata.targetCount -= 1;
        return this.saveMetadata(transaction, metadata);
      });
  }

  /**
   * Drops any targets with sequence number less than or equal to the upper bound, excepting those
   * present in `activeTargetIds`. Document associations for the removed targets are also removed.
   * Returns the number of targets removed.
   */
  removeTargets(
    txn: PersistenceTransaction,
    upperBound: ListenSequenceNumber,
    activeTargetIds: ActiveTargets
  ): PersistencePromise<number> {
    let count = 0;
    const promises: Array<PersistencePromise<void>> = [];
    return targetsStore(txn)
      .iterate((key, value) => {
        const targetData = fromDbTarget(value);
        if (
          targetData.sequenceNumber <= upperBound &&
          activeTargetIds.get(targetData.targetId) === null
        ) {
          count++;
          promises.push(this.removeTargetData(txn, targetData));
        }
      })
      .next(() => PersistencePromise.waitFor(promises))
      .next(() => count);
  }

  /**
   * Call provided function with each `TargetData` that we have cached.
   */
  forEachTarget(
    txn: PersistenceTransaction,
    f: (q: TargetData) => void
  ): PersistencePromise<void> {
    return targetsStore(txn).iterate((key, value) => {
      const targetData = fromDbTarget(value);
      f(targetData);
    });
  }

  private retrieveMetadata(
    transaction: PersistenceTransaction
  ): PersistencePromise<DbTargetGlobal> {
    return globalTargetStore(transaction)
      .get(DbTargetGlobalKey)
      .next(metadata => {
        hardAssert(metadata !== null, 'Missing metadata row.');
        return metadata;
      });
  }

  private saveMetadata(
    transaction: PersistenceTransaction,
    metadata: DbTargetGlobal
  ): PersistencePromise<void> {
    return globalTargetStore(transaction).put(DbTargetGlobalKey, metadata);
  }

  private saveTargetData(
    transaction: PersistenceTransaction,
    targetData: TargetData
  ): PersistencePromise<void> {
    return targetsStore(transaction).put(
      toDbTarget(this.serializer, targetData)
    );
  }

  /**
   * In-place updates the provided metadata to account for values in the given
   * TargetData. Saving is done separately. Returns true if there were any
   * changes to the metadata.
   */
  private updateMetadataFromTargetData(
    targetData: TargetData,
    metadata: DbTargetGlobal
  ): boolean {
    let updated = false;
    if (targetData.targetId > metadata.highestTargetId) {
      metadata.highestTargetId = targetData.targetId;
      updated = true;
    }

    if (targetData.sequenceNumber > metadata.highestListenSequenceNumber) {
      metadata.highestListenSequenceNumber = targetData.sequenceNumber;
      updated = true;
    }
    return updated;
  }

  getTargetCount(
    transaction: PersistenceTransaction
  ): PersistencePromise<number> {
    return this.retrieveMetadata(transaction).next(
      metadata => metadata.targetCount
    );
  }

  getTargetData(
    transaction: PersistenceTransaction,
    target: Target
  ): PersistencePromise<TargetData | null> {
    // Iterating by the canonicalId may yield more than one result because
    // canonicalId values are not required to be unique per target. This query
    // depends on the queryTargets index to be efficient.
    const canonicalId = canonifyTarget(target);
    const range = IDBKeyRange.bound(
      [canonicalId, Number.NEGATIVE_INFINITY],
      [canonicalId, Number.POSITIVE_INFINITY]
    );
    let result: TargetData | null = null;
    return targetsStore(transaction)
      .iterate(
        { range, index: DbTargetQueryTargetsIndexName },
        (key, value, control) => {
          const found = fromDbTarget(value);
          // After finding a potential match, check that the target is
          // actually equal to the requested target.
          if (targetEquals(target, found.target)) {
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
      const path = encodeResourcePath(key.path);
      promises.push(store.put({ targetId, path }));
      promises.push(this.referenceDelegate.addReference(txn, targetId, key));
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
    const store = documentTargetStore(txn);
    return PersistencePromise.forEach(keys, (key: DocumentKey) => {
      const path = encodeResourcePath(key.path);
      return PersistencePromise.waitFor([
        store.delete([targetId, path]),
        this.referenceDelegate.removeReference(txn, targetId, key)
      ]);
    });
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
    return store.delete(range);
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
        const path = decodeResourcePath(key[1]);
        const docKey = new DocumentKey(path);
        result = result.add(docKey);
      })
      .next(() => result);
  }

  containsKey(
    txn: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<boolean> {
    const path = encodeResourcePath(key.path);
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
          index: DbTargetDocumentDocumentTargetsIndex,
          keysOnly: true,
          range
        },
        ([targetId, path], _, control) => {
          // Having a sentinel row for a document does not count as containing that document;
          // For the target cache, containing the document means the document is part of some
          // target.
          if (targetId !== 0) {
            count++;
            control.done();
          }
        }
      )
      .next(() => count > 0);
  }

  /**
   * Looks up a TargetData entry by target ID.
   *
   * @param targetId - The target ID of the TargetData entry to look up.
   * @returns The cached TargetData entry, or null if the cache has no entry for
   * the target.
   */
  // PORTING NOTE: Multi-tab only.
  getTargetDataForTarget(
    transaction: PersistenceTransaction,
    targetId: TargetId
  ): PersistencePromise<TargetData | null> {
    return targetsStore(transaction)
      .get(targetId)
      .next(found => {
        if (found) {
          return fromDbTarget(found);
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
  return getStore<DbTargetKey, DbTarget>(txn, DbTargetStore);
}

/**
 * Helper to get a typed SimpleDbStore for the target globals object store.
 */
function globalTargetStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbTargetGlobalKey, DbTargetGlobal> {
  return getStore<DbTargetGlobalKey, DbTargetGlobal>(txn, DbTargetGlobalStore);
}

/**
 * Helper to get a typed SimpleDbStore for the document target object store.
 */
export function documentTargetStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbTargetDocumentKey, DbTargetDocument> {
  return getStore<DbTargetDocumentKey, DbTargetDocument>(
    txn,
    DbTargetDocumentStore
  );
}
