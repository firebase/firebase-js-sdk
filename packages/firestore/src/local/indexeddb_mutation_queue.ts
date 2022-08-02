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

import { User } from '../auth/user';
import { isCollectionGroupQuery, isDocumentQuery, Query } from '../core/query';
import { BatchId } from '../core/types';
import { Timestamp } from '../lite-api/timestamp';
import { DocumentKeySet } from '../model/collections';
import { DocumentKey } from '../model/document_key';
import { Mutation } from '../model/mutation';
import { MutationBatch } from '../model/mutation_batch';
import { ResourcePath } from '../model/path';
import { debugAssert, fail, hardAssert } from '../util/assert';
import { primitiveComparator } from '../util/misc';
import { SortedMap } from '../util/sorted_map';
import { SortedSet } from '../util/sorted_set';
import { BATCHID_UNKNOWN } from '../util/types';

import { decodeResourcePath } from './encoded_resource_path';
import { IndexManager } from './index_manager';
import { removeMutationBatch } from './indexeddb_mutation_batch_impl';
import {
  DbDocumentMutation,
  DbMutationBatch,
  DbMutationQueue
} from './indexeddb_schema';
import {
  DbDocumentMutationKey,
  DbDocumentMutationPlaceholder,
  DbDocumentMutationStore,
  DbMutationBatchKey,
  DbMutationBatchStore,
  DbMutationBatchUserMutationsIndex,
  DbMutationQueueKey,
  DbMutationQueueStore,
  newDbDocumentMutationKey,
  newDbDocumentMutationPrefixForPath,
  newDbDocumentMutationPrefixForUser
} from './indexeddb_sentinels';
import { IndexedDbTransaction, getStore } from './indexeddb_transaction';
import {
  fromDbMutationBatch,
  LocalSerializer,
  toDbMutationBatch
} from './local_serializer';
import { MutationQueue } from './mutation_queue';
import { ReferenceDelegate } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { PersistenceTransaction } from './persistence_transaction';
import { SimpleDbStore } from './simple_db';

/** A mutation queue for a specific user, backed by IndexedDB. */
export class IndexedDbMutationQueue implements MutationQueue {
  /**
   * Caches the document keys for pending mutation batches. If the mutation
   * has been removed from IndexedDb, the cached value may continue to
   * be used to retrieve the batch's document keys. To remove a cached value
   * locally, `removeCachedMutationKeys()` should be invoked either directly
   * or through `removeMutationBatches()`.
   *
   * With multi-tab, when the primary client acknowledges or rejects a mutation,
   * this cache is used by secondary clients to invalidate the local
   * view of the documents that were previously affected by the mutation.
   */
  // PORTING NOTE: Multi-tab only.
  private documentKeysByBatchId = {} as { [batchId: number]: DocumentKeySet };

  constructor(
    /**
     * The normalized userId (e.g. null UID => "" userId) used to store /
     * retrieve mutations.
     */
    private userId: string,
    private readonly serializer: LocalSerializer,
    private readonly indexManager: IndexManager,
    private readonly referenceDelegate: ReferenceDelegate
  ) {}

  /**
   * Creates a new mutation queue for the given user.
   * @param user - The user for which to create a mutation queue.
   * @param serializer - The serializer to use when persisting to IndexedDb.
   */
  static forUser(
    user: User,
    serializer: LocalSerializer,
    indexManager: IndexManager,
    referenceDelegate: ReferenceDelegate
  ): IndexedDbMutationQueue {
    // TODO(mcg): Figure out what constraints there are on userIDs
    // In particular, are there any reserved characters? are empty ids allowed?
    // For the moment store these together in the same mutations table assuming
    // that empty userIDs aren't allowed.
    hardAssert(user.uid !== '', 'UserID must not be an empty string.');
    const userId = user.isAuthenticated() ? user.uid! : '';
    return new IndexedDbMutationQueue(
      userId,
      serializer,
      indexManager,
      referenceDelegate
    );
  }

  checkEmpty(transaction: PersistenceTransaction): PersistencePromise<boolean> {
    let empty = true;
    const range = IDBKeyRange.bound(
      [this.userId, Number.NEGATIVE_INFINITY],
      [this.userId, Number.POSITIVE_INFINITY]
    );
    return mutationsStore(transaction)
      .iterate(
        { index: DbMutationBatchUserMutationsIndex, range },
        (key, value, control) => {
          empty = false;
          control.done();
        }
      )
      .next(() => empty);
  }

  addMutationBatch(
    transaction: PersistenceTransaction,
    localWriteTime: Timestamp,
    baseMutations: Mutation[],
    mutations: Mutation[]
  ): PersistencePromise<MutationBatch> {
    const documentStore = documentMutationsStore(transaction);
    const mutationStore = mutationsStore(transaction);

    // The IndexedDb implementation in Chrome (and Firefox) does not handle
    // compound indices that include auto-generated keys correctly. To ensure
    // that the index entry is added correctly in all browsers, we perform two
    // writes: The first write is used to retrieve the next auto-generated Batch
    // ID, and the second write populates the index and stores the actual
    // mutation batch.
    // See: https://bugs.chromium.org/p/chromium/issues/detail?id=701972

    // We write an empty object to obtain key
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return mutationStore.add({} as any).next(batchId => {
      hardAssert(
        typeof batchId === 'number',
        'Auto-generated key is not a number'
      );

      const batch = new MutationBatch(
        batchId,
        localWriteTime,
        baseMutations,
        mutations
      );
      const dbBatch = toDbMutationBatch(this.serializer, this.userId, batch);

      const promises: Array<PersistencePromise<void>> = [];
      let collectionParents = new SortedSet<ResourcePath>((l, r) =>
        primitiveComparator(l.canonicalString(), r.canonicalString())
      );
      for (const mutation of mutations) {
        const indexKey = newDbDocumentMutationKey(
          this.userId,
          mutation.key.path,
          batchId
        );
        collectionParents = collectionParents.add(mutation.key.path.popLast());
        promises.push(mutationStore.put(dbBatch));
        promises.push(
          documentStore.put(indexKey, DbDocumentMutationPlaceholder)
        );
      }

      collectionParents.forEach(parent => {
        promises.push(
          this.indexManager.addToCollectionParentIndex(transaction, parent)
        );
      });

      transaction.addOnCommittedListener(() => {
        this.documentKeysByBatchId[batchId] = batch.keys();
      });

      return PersistencePromise.waitFor(promises).next(() => batch);
    });
  }

  lookupMutationBatch(
    transaction: PersistenceTransaction,
    batchId: BatchId
  ): PersistencePromise<MutationBatch | null> {
    return mutationsStore(transaction)
      .get(batchId)
      .next(dbBatch => {
        if (dbBatch) {
          hardAssert(
            dbBatch.userId === this.userId,
            `Unexpected user '${dbBatch.userId}' for mutation batch ${batchId}`
          );
          return fromDbMutationBatch(this.serializer, dbBatch);
        }
        return null;
      });
  }

  /**
   * Returns the document keys for the mutation batch with the given batchId.
   * For primary clients, this method returns `null` after
   * `removeMutationBatches()` has been called. Secondary clients return a
   * cached result until `removeCachedMutationKeys()` is invoked.
   */
  // PORTING NOTE: Multi-tab only.
  lookupMutationKeys(
    transaction: PersistenceTransaction,
    batchId: BatchId
  ): PersistencePromise<DocumentKeySet | null> {
    if (this.documentKeysByBatchId[batchId]) {
      return PersistencePromise.resolve<DocumentKeySet | null>(
        this.documentKeysByBatchId[batchId]
      );
    } else {
      return this.lookupMutationBatch(transaction, batchId).next(batch => {
        if (batch) {
          const keys = batch.keys();
          this.documentKeysByBatchId[batchId] = keys;
          return keys;
        } else {
          return null;
        }
      });
    }
  }

  getNextMutationBatchAfterBatchId(
    transaction: PersistenceTransaction,
    batchId: BatchId
  ): PersistencePromise<MutationBatch | null> {
    const nextBatchId = batchId + 1;

    const range = IDBKeyRange.lowerBound([this.userId, nextBatchId]);
    let foundBatch: MutationBatch | null = null;
    return mutationsStore(transaction)
      .iterate(
        { index: DbMutationBatchUserMutationsIndex, range },
        (key, dbBatch, control) => {
          if (dbBatch.userId === this.userId) {
            hardAssert(
              dbBatch.batchId >= nextBatchId,
              'Should have found mutation after ' + nextBatchId
            );
            foundBatch = fromDbMutationBatch(this.serializer, dbBatch);
          }
          control.done();
        }
      )
      .next(() => foundBatch);
  }

  getHighestUnacknowledgedBatchId(
    transaction: PersistenceTransaction
  ): PersistencePromise<BatchId> {
    const range = IDBKeyRange.upperBound([
      this.userId,
      Number.POSITIVE_INFINITY
    ]);

    let batchId = BATCHID_UNKNOWN;
    return mutationsStore(transaction)
      .iterate(
        { index: DbMutationBatchUserMutationsIndex, range, reverse: true },
        (key, dbBatch, control) => {
          batchId = dbBatch.batchId;
          control.done();
        }
      )
      .next(() => batchId);
  }

  getAllMutationBatches(
    transaction: PersistenceTransaction
  ): PersistencePromise<MutationBatch[]> {
    const range = IDBKeyRange.bound(
      [this.userId, BATCHID_UNKNOWN],
      [this.userId, Number.POSITIVE_INFINITY]
    );
    return mutationsStore(transaction)
      .loadAll(DbMutationBatchUserMutationsIndex, range)
      .next(dbBatches =>
        dbBatches.map(dbBatch => fromDbMutationBatch(this.serializer, dbBatch))
      );
  }

  getAllMutationBatchesAffectingDocumentKey(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<MutationBatch[]> {
    // Scan the document-mutation index starting with a prefix starting with
    // the given documentKey.
    const indexPrefix = newDbDocumentMutationPrefixForPath(
      this.userId,
      documentKey.path
    );
    const indexStart = IDBKeyRange.lowerBound(indexPrefix);

    const results: MutationBatch[] = [];
    return documentMutationsStore(transaction)
      .iterate({ range: indexStart }, (indexKey, _, control) => {
        const [userID, encodedPath, batchId] = indexKey;

        // Only consider rows matching exactly the specific key of
        // interest. Note that because we order by path first, and we
        // order terminators before path separators, we'll encounter all
        // the index rows for documentKey contiguously. In particular, all
        // the rows for documentKey will occur before any rows for
        // documents nested in a subcollection beneath documentKey so we
        // can stop as soon as we hit any such row.
        const path = decodeResourcePath(encodedPath);
        if (userID !== this.userId || !documentKey.path.isEqual(path)) {
          control.done();
          return;
        }
        // Look up the mutation batch in the store.
        return mutationsStore(transaction)
          .get(batchId)
          .next(mutation => {
            if (!mutation) {
              throw fail(
                'Dangling document-mutation reference found: ' +
                  indexKey +
                  ' which points to ' +
                  batchId
              );
            }
            hardAssert(
              mutation.userId === this.userId,
              `Unexpected user '${mutation.userId}' for mutation batch ${batchId}`
            );
            results.push(fromDbMutationBatch(this.serializer, mutation));
          });
      })
      .next(() => results);
  }

  getAllMutationBatchesAffectingDocumentKeys(
    transaction: PersistenceTransaction,
    documentKeys: SortedMap<DocumentKey, unknown>
  ): PersistencePromise<MutationBatch[]> {
    let uniqueBatchIDs = new SortedSet<BatchId>(primitiveComparator);

    const promises: Array<PersistencePromise<void>> = [];
    documentKeys.forEach(documentKey => {
      const indexStart = newDbDocumentMutationPrefixForPath(
        this.userId,
        documentKey.path
      );
      const range = IDBKeyRange.lowerBound(indexStart);

      const promise = documentMutationsStore(transaction).iterate(
        { range },
        (indexKey, _, control) => {
          const [userID, encodedPath, batchID] = indexKey;

          // Only consider rows matching exactly the specific key of
          // interest. Note that because we order by path first, and we
          // order terminators before path separators, we'll encounter all
          // the index rows for documentKey contiguously. In particular, all
          // the rows for documentKey will occur before any rows for
          // documents nested in a subcollection beneath documentKey so we
          // can stop as soon as we hit any such row.
          const path = decodeResourcePath(encodedPath);
          if (userID !== this.userId || !documentKey.path.isEqual(path)) {
            control.done();
            return;
          }

          uniqueBatchIDs = uniqueBatchIDs.add(batchID);
        }
      );

      promises.push(promise);
    });

    return PersistencePromise.waitFor(promises).next(() =>
      this.lookupMutationBatches(transaction, uniqueBatchIDs)
    );
  }

  getAllMutationBatchesAffectingQuery(
    transaction: PersistenceTransaction,
    query: Query
  ): PersistencePromise<MutationBatch[]> {
    debugAssert(
      !isDocumentQuery(query),
      "Document queries shouldn't go down this path"
    );
    debugAssert(
      !isCollectionGroupQuery(query),
      'CollectionGroup queries should be handled in LocalDocumentsView'
    );

    const queryPath = query.path;
    const immediateChildrenLength = queryPath.length + 1;

    // TODO(mcg): Actually implement a single-collection query
    //
    // This is actually executing an ancestor query, traversing the whole
    // subtree below the collection which can be horrifically inefficient for
    // some structures. The right way to solve this is to implement the full
    // value index, but that's not in the cards in the near future so this is
    // the best we can do for the moment.
    //
    // Since we don't yet index the actual properties in the mutations, our
    // current approach is to just return all mutation batches that affect
    // documents in the collection being queried.
    const indexPrefix = newDbDocumentMutationPrefixForPath(
      this.userId,
      queryPath
    );
    const indexStart = IDBKeyRange.lowerBound(indexPrefix);

    // Collect up unique batchIDs encountered during a scan of the index. Use a
    // SortedSet to accumulate batch IDs so they can be traversed in order in a
    // scan of the main table.
    let uniqueBatchIDs = new SortedSet<BatchId>(primitiveComparator);
    return documentMutationsStore(transaction)
      .iterate({ range: indexStart }, (indexKey, _, control) => {
        const [userID, encodedPath, batchID] = indexKey;
        const path = decodeResourcePath(encodedPath);
        if (userID !== this.userId || !queryPath.isPrefixOf(path)) {
          control.done();
          return;
        }
        // Rows with document keys more than one segment longer than the
        // query path can't be matches. For example, a query on 'rooms'
        // can't match the document /rooms/abc/messages/xyx.
        // TODO(mcg): we'll need a different scanner when we implement
        // ancestor queries.
        if (path.length !== immediateChildrenLength) {
          return;
        }
        uniqueBatchIDs = uniqueBatchIDs.add(batchID);
      })
      .next(() => this.lookupMutationBatches(transaction, uniqueBatchIDs));
  }

  private lookupMutationBatches(
    transaction: PersistenceTransaction,
    batchIDs: SortedSet<BatchId>
  ): PersistencePromise<MutationBatch[]> {
    const results: MutationBatch[] = [];
    const promises: Array<PersistencePromise<void>> = [];
    // TODO(rockwood): Implement this using iterate.
    batchIDs.forEach(batchId => {
      promises.push(
        mutationsStore(transaction)
          .get(batchId)
          .next(mutation => {
            if (mutation === null) {
              throw fail(
                'Dangling document-mutation reference found, ' +
                  'which points to ' +
                  batchId
              );
            }
            hardAssert(
              mutation.userId === this.userId,
              `Unexpected user '${mutation.userId}' for mutation batch ${batchId}`
            );
            results.push(fromDbMutationBatch(this.serializer, mutation));
          })
      );
    });
    return PersistencePromise.waitFor(promises).next(() => results);
  }

  removeMutationBatch(
    transaction: PersistenceTransaction,
    batch: MutationBatch
  ): PersistencePromise<void> {
    return removeMutationBatch(
      (transaction as IndexedDbTransaction).simpleDbTransaction,
      this.userId,
      batch
    ).next(removedDocuments => {
      transaction.addOnCommittedListener(() => {
        this.removeCachedMutationKeys(batch.batchId);
      });
      return PersistencePromise.forEach(
        removedDocuments,
        (key: DocumentKey) => {
          return this.referenceDelegate.markPotentiallyOrphaned(
            transaction,
            key
          );
        }
      );
    });
  }

  /**
   * Clears the cached keys for a mutation batch. This method should be
   * called by secondary clients after they process mutation updates.
   *
   * Note that this method does not have to be called from primary clients as
   * the corresponding cache entries are cleared when an acknowledged or
   * rejected batch is removed from the mutation queue.
   */
  // PORTING NOTE: Multi-tab only
  removeCachedMutationKeys(batchId: BatchId): void {
    delete this.documentKeysByBatchId[batchId];
  }

  performConsistencyCheck(
    txn: PersistenceTransaction
  ): PersistencePromise<void> {
    return this.checkEmpty(txn).next(empty => {
      if (!empty) {
        return PersistencePromise.resolve();
      }

      // Verify that there are no entries in the documentMutations index if
      // the queue is empty.
      const startRange = IDBKeyRange.lowerBound(
        newDbDocumentMutationPrefixForUser(this.userId)
      );
      const danglingMutationReferences: ResourcePath[] = [];
      return documentMutationsStore(txn)
        .iterate({ range: startRange }, (key, _, control) => {
          const userID = key[0];
          if (userID !== this.userId) {
            control.done();
            return;
          } else {
            const path = decodeResourcePath(key[1]);
            danglingMutationReferences.push(path);
          }
        })
        .next(() => {
          hardAssert(
            danglingMutationReferences.length === 0,
            'Document leak -- detected dangling mutation references when queue is empty. ' +
              'Dangling keys: ' +
              danglingMutationReferences.map(p => p.canonicalString())
          );
        });
    });
  }

  containsKey(
    txn: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<boolean> {
    return mutationQueueContainsKey(txn, this.userId, key);
  }

  // PORTING NOTE: Multi-tab only (state is held in memory in other clients).
  /** Returns the mutation queue's metadata from IndexedDb. */
  private getMutationQueueMetadata(
    transaction: PersistenceTransaction
  ): PersistencePromise<DbMutationQueue> {
    return mutationQueuesStore(transaction)
      .get(this.userId)
      .next((metadata: DbMutationQueue | null) => {
        return (
          metadata || {
            userId: this.userId,
            lastAcknowledgedBatchId: BATCHID_UNKNOWN,
            lastStreamToken: ''
          }
        );
      });
  }
}

/**
 * @returns true if the mutation queue for the given user contains a pending
 *         mutation for the given key.
 */
function mutationQueueContainsKey(
  txn: PersistenceTransaction,
  userId: string,
  key: DocumentKey
): PersistencePromise<boolean> {
  const indexKey = newDbDocumentMutationPrefixForPath(userId, key.path);
  const encodedPath = indexKey[1];
  const startRange = IDBKeyRange.lowerBound(indexKey);
  let containsKey = false;
  return documentMutationsStore(txn)
    .iterate({ range: startRange, keysOnly: true }, (key, value, control) => {
      const [userID, keyPath, /*batchID*/ _] = key;
      if (userID === userId && keyPath === encodedPath) {
        containsKey = true;
      }
      control.done();
    })
    .next(() => containsKey);
}

/** Returns true if any mutation queue contains the given document. */
export function mutationQueuesContainKey(
  txn: PersistenceTransaction,
  docKey: DocumentKey
): PersistencePromise<boolean> {
  let found = false;
  return mutationQueuesStore(txn)
    .iterateSerial(userId => {
      return mutationQueueContainsKey(txn, userId, docKey).next(containsKey => {
        if (containsKey) {
          found = true;
        }
        return PersistencePromise.resolve(!containsKey);
      });
    })
    .next(() => found);
}

/**
 * Helper to get a typed SimpleDbStore for the mutations object store.
 */
function mutationsStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbMutationBatchKey, DbMutationBatch> {
  return getStore<DbMutationBatchKey, DbMutationBatch>(
    txn,
    DbMutationBatchStore
  );
}

/**
 * Helper to get a typed SimpleDbStore for the mutationQueues object store.
 */
function documentMutationsStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbDocumentMutationKey, DbDocumentMutation> {
  return getStore<DbDocumentMutationKey, DbDocumentMutation>(
    txn,
    DbDocumentMutationStore
  );
}

/**
 * Helper to get a typed SimpleDbStore for the mutationQueues object store.
 */
function mutationQueuesStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbMutationQueueKey, DbMutationQueue> {
  return getStore<DbMutationQueueKey, DbMutationQueue>(
    txn,
    DbMutationQueueStore
  );
}
