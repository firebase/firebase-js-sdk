/**
 * @license
 * Copyright 2019 Google LLC
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

import { User } from '../auth/user';
import { Target } from '../core/target';
import {
  documentKeySet,
  DocumentKeySet,
  DocumentMap
} from '../model/collections';
import { FieldIndex, IndexOffset } from '../model/field_index';
import { ResourcePath } from '../model/path';
import { debugAssert } from '../util/assert';
import { immediateSuccessor } from '../util/misc';

import {
  decodeResourcePath,
  encodeResourcePath
} from './encoded_resource_path';
import { IndexManager } from './index_manager';
import {
  DbCollectionParent,
  DbCollectionParentKey,
  DbIndexConfiguration,
  DbIndexConfigurationKey,
  DbIndexEntry,
  DbIndexEntryKey,
  DbIndexState,
  DbIndexStateKey
} from './indexeddb_schema';
import { getStore } from './indexeddb_transaction';
import {
  fromDbIndexConfiguration,
  toDbIndexConfiguration,
  toDbIndexState
} from './local_serializer';
import { MemoryCollectionParentIndex } from './memory_index_manager';
import { PersistencePromise } from './persistence_promise';
import { PersistenceTransaction } from './persistence_transaction';
import { SimpleDbStore } from './simple_db';

/**
 * A persisted implementation of IndexManager.
 *
 * PORTING NOTE: Unlike iOS and Android, the Web SDK does not memoize index
 * data as it supports multi-tab access.
 */
export class IndexedDbIndexManager implements IndexManager {
  /**
   * An in-memory copy of the index entries we've already written since the SDK
   * launched. Used to avoid re-writing the same entry repeatedly.
   *
   * This is *NOT* a complete cache of what's in persistence and so can never be
   * used to satisfy reads.
   */
  private collectionParentsCache = new MemoryCollectionParentIndex();

  private uid: string;

  constructor(private user: User) {
    this.uid = user.uid || '';
  }

  /**
   * Adds a new entry to the collection parent index.
   *
   * Repeated calls for the same collectionPath should be avoided within a
   * transaction as IndexedDbIndexManager only caches writes once a transaction
   * has been committed.
   */
  addToCollectionParentIndex(
    transaction: PersistenceTransaction,
    collectionPath: ResourcePath
  ): PersistencePromise<void> {
    debugAssert(collectionPath.length % 2 === 1, 'Expected a collection path.');
    if (!this.collectionParentsCache.has(collectionPath)) {
      const collectionId = collectionPath.lastSegment();
      const parentPath = collectionPath.popLast();

      transaction.addOnCommittedListener(() => {
        // Add the collection to the in memory cache only if the transaction was
        // successfully committed.
        this.collectionParentsCache.add(collectionPath);
      });

      const collectionParent: DbCollectionParent = {
        collectionId,
        parent: encodeResourcePath(parentPath)
      };
      return collectionParentsStore(transaction).put(collectionParent);
    }
    return PersistencePromise.resolve();
  }

  getCollectionParents(
    transaction: PersistenceTransaction,
    collectionId: string
  ): PersistencePromise<ResourcePath[]> {
    const parentPaths = [] as ResourcePath[];
    const range = IDBKeyRange.bound(
      [collectionId, ''],
      [immediateSuccessor(collectionId), ''],
      /*lowerOpen=*/ false,
      /*upperOpen=*/ true
    );
    return collectionParentsStore(transaction)
      .loadAll(range)
      .next(entries => {
        for (const entry of entries) {
          // This collectionId guard shouldn't be necessary (and isn't as long
          // as we're running in a real browser), but there's a bug in
          // indexeddbshim that breaks our range in our tests running in node:
          // https://github.com/axemclion/IndexedDBShim/issues/334
          if (entry.collectionId !== collectionId) {
            break;
          }
          parentPaths.push(decodeResourcePath(entry.parent));
        }
        return parentPaths;
      });
  }

  addFieldIndex(
    transaction: PersistenceTransaction,
    index: FieldIndex
  ): PersistencePromise<void> {
    // TODO(indexing): Verify that the auto-incrementing index ID works in
    // Safari & Firefox.
    const indexes = indexConfigurationStore(transaction);
    const dbIndex = toDbIndexConfiguration(index);
    delete dbIndex.indexId; // `indexId` is auto-populated by IndexedDb
    return indexes.add(dbIndex).next();
  }

  deleteFieldIndex(
    transaction: PersistenceTransaction,
    index: FieldIndex
  ): PersistencePromise<void> {
    const indexes = indexConfigurationStore(transaction);
    const states = indexStateStore(transaction);
    const entries = indexEntriesStore(transaction);
    return indexes
      .delete(index.indexId)
      .next(() =>
        states.delete(
          IDBKeyRange.bound(
            [index.indexId],
            [index.indexId + 1],
            /*lowerOpen=*/ false,
            /*upperOpen=*/ true
          )
        )
      )
      .next(() =>
        entries.delete(
          IDBKeyRange.bound(
            [index.indexId],
            [index.indexId + 1],
            /*lowerOpen=*/ false,
            /*upperOpen=*/ true
          )
        )
      );
  }

  getDocumentsMatchingTarget(
    transaction: PersistenceTransaction,
    fieldIndex: FieldIndex,
    target: Target
  ): PersistencePromise<DocumentKeySet> {
    // TODO(indexing): Implement
    return PersistencePromise.resolve(documentKeySet());
  }

  getFieldIndex(
    transaction: PersistenceTransaction,
    target: Target
  ): PersistencePromise<FieldIndex | null> {
    // TODO(indexing): Implement
    return PersistencePromise.resolve<FieldIndex | null>(null);
  }

  getFieldIndexes(
    transaction: PersistenceTransaction,
    collectionGroup?: string
  ): PersistencePromise<FieldIndex[]> {
    const indexes = indexConfigurationStore(transaction);
    const states = indexStateStore(transaction);

    return (
      collectionGroup
        ? indexes.loadAll(
            DbIndexConfiguration.collectionGroupIndex,
            IDBKeyRange.bound(collectionGroup, collectionGroup)
          )
        : indexes.loadAll()
    ).next(indexConfigs => {
      const result: FieldIndex[] = [];
      return PersistencePromise.forEach(
        indexConfigs,
        (indexConfig: DbIndexConfiguration) => {
          return states
            .get([indexConfig.indexId!, this.uid])
            .next(indexState => {
              result.push(fromDbIndexConfiguration(indexConfig, indexState));
            });
        }
      ).next(() => result);
    });
  }

  getNextCollectionGroupToUpdate(
    transaction: PersistenceTransaction
  ): PersistencePromise<string | null> {
    return this.getFieldIndexes(transaction).next(indexes => {
      if (indexes.length === 0) {
        return null;
      }
      indexes.sort(
        (l, r) => l.indexState.sequenceNumber - r.indexState.sequenceNumber
      );
      return indexes[0].collectionGroup;
    });
  }

  updateCollectionGroup(
    transaction: PersistenceTransaction,
    collectionGroup: string,
    offset: IndexOffset
  ): PersistencePromise<void> {
    const indexes = indexConfigurationStore(transaction);
    const states = indexStateStore(transaction);
    return this.getNextSequenceNumber(transaction).next(nextSequenceNumber =>
      indexes
        .loadAll(
          DbIndexConfiguration.collectionGroupIndex,
          IDBKeyRange.bound(collectionGroup, collectionGroup)
        )
        .next(configs =>
          PersistencePromise.forEach(configs, (config: DbIndexConfiguration) =>
            states.put(
              toDbIndexState(
                config.indexId!,
                this.user,
                nextSequenceNumber,
                offset
              )
            )
          )
        )
    );
  }

  updateIndexEntries(
    transaction: PersistenceTransaction,
    documents: DocumentMap
  ): PersistencePromise<void> {
    // TODO(indexing): Implement
    return PersistencePromise.resolve();
  }

  private getNextSequenceNumber(
    transaction: PersistenceTransaction
  ): PersistencePromise<number> {
    let nextSequenceNumber = 1;
    const states = indexStateStore(transaction);
    return states
      .iterate(
        {
          index: DbIndexState.sequenceNumberIndex,
          reverse: true,
          range: IDBKeyRange.upperBound([this.uid, Number.MAX_SAFE_INTEGER])
        },
        (_, state, controller) => {
          controller.done();
          nextSequenceNumber = state.sequenceNumber + 1;
        }
      )
      .next(() => nextSequenceNumber);
  }
}

/**
 * Helper to get a typed SimpleDbStore for the collectionParents
 * document store.
 */
function collectionParentsStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbCollectionParentKey, DbCollectionParent> {
  return getStore<DbCollectionParentKey, DbCollectionParent>(
    txn,
    DbCollectionParent.store
  );
}

/**
 * Helper to get a typed SimpleDbStore for the index entry object store.
 */
function indexEntriesStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbIndexEntryKey, DbIndexEntry> {
  return getStore<DbIndexEntryKey, DbIndexEntry>(txn, DbIndexEntry.store);
}

/**
 * Helper to get a typed SimpleDbStore for the index configuration object store.
 */
function indexConfigurationStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbIndexConfigurationKey, DbIndexConfiguration> {
  return getStore<DbIndexConfigurationKey, DbIndexConfiguration>(
    txn,
    DbIndexConfiguration.store
  );
}

/**
 * Helper to get a typed SimpleDbStore for the index state object store.
 */
function indexStateStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbIndexStateKey, DbIndexState> {
  return getStore<DbIndexStateKey, DbIndexState>(txn, DbIndexState.store);
}
