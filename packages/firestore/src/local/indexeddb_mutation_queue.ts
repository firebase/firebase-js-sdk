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

import { Timestamp } from '../api/timestamp';
import { User } from '../auth/user';
import { Query } from '../core/query';
import { BatchId, ProtoByteString } from '../core/types';
import { DocumentKeySet } from '../model/collections';
import { DocumentKey } from '../model/document_key';
import { Mutation } from '../model/mutation';
import { BATCHID_UNKNOWN, MutationBatch } from '../model/mutation_batch';
import { ResourcePath } from '../model/path';
import { assert, fail } from '../util/assert';
import { primitiveComparator } from '../util/misc';
import { SortedMap } from '../util/sorted_map';
import { SortedSet } from '../util/sorted_set';

import * as EncodedResourcePath from './encoded_resource_path';
import { IndexManager } from './index_manager';
import {
  IndexedDbPersistence,
  IndexedDbTransaction
} from './indexeddb_persistence';
import {
  DbDocumentMutation,
  DbDocumentMutationKey,
  DbMutationBatch,
  DbMutationBatchKey,
  DbMutationQueue,
  DbMutationQueueKey
} from './indexeddb_schema';
import { LocalSerializer } from './local_serializer';
import { MutationQueue } from './mutation_queue';
import { PersistenceTransaction, ReferenceDelegate } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { SimpleDbStore, SimpleDbTransaction } from './simple_db';

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
   * @param user The user for which to create a mutation queue.
   * @param serializer The serializer to use when persisting to IndexedDb.
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
    assert(user.uid !== '', 'UserID must not be an empty string.');
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
        { index: DbMutationBatch.userMutationsIndex, range },
        (key, value, control) => {
          empty = false;
          control.done();
        }
      )
      .next(() => empty);
  }

  acknowledgeBatch(
    transaction: PersistenceTransaction,
    batch: MutationBatch,
    streamToken: ProtoByteString
  ): PersistencePromise<void> {
    return this.getMutationQueueMetadata(transaction).next(metadata => {
      metadata.lastStreamToken = convertStreamToken(streamToken);

      return mutationQueuesStore(transaction).put(metadata);
    });
  }

  getLastStreamToken(
    transaction: PersistenceTransaction
  ): PersistencePromise<ProtoByteString> {
    return this.getMutationQueueMetadata(transaction).next<ProtoByteString>(
      metadata => metadata.lastStreamToken
    );
  }

  setLastStreamToken(
    transaction: PersistenceTransaction,
    streamToken: ProtoByteString
  ): PersistencePromise<void> {
    return this.getMutationQueueMetadata(transaction).next(metadata => {
      metadata.lastStreamToken = convertStreamToken(streamToken);
      return mutationQueuesStore(transaction).put(metadata);
    });
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, We write an empty object to obtain key
    return mutationStore.add({} as any).next(batchId => {
      assert(typeof batchId === 'number', 'Auto-generated key is not a number');

      const batch = new MutationBatch(
        batchId,
        localWriteTime,
        baseMutations,
        mutations
      );
      const dbBatch = this.serializer.toDbMutationBatch(this.userId, batch);

      this.documentKeysByBatchId[batchId] = batch.keys();

      const promises: Array<PersistencePromise<void>> = [];
      for (const mutation of mutations) {
        const indexKey = DbDocumentMutation.key(
          this.userId,
          mutation.key.path,
          batchId
        );
        promises.push(mutationStore.put(dbBatch));
        promises.push(
          documentStore.put(indexKey, DbDocumentMutation.PLACEHOLDER)
        );
        promises.push(
          this.indexManager.addToCollectionParentIndex(
            transaction,
            mutation.key.path.popLast()
          )
        );
      }
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
          assert(
            dbBatch.userId === this.userId,
            `Unexpected user '${dbBatch.userId}' for mutation batch ${batchId}`
          );
          return this.serializer.fromDbMutationBatch(dbBatch);
        }
        return null;
      });
  }

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
        { index: DbMutationBatch.userMutationsIndex, range },
        (key, dbBatch, control) => {
          if (dbBatch.userId === this.userId) {
            assert(
              dbBatch.batchId >= nextBatchId,
              'Should have found mutation after ' + nextBatchId
            );
            foundBatch = this.serializer.fromDbMutationBatch(dbBatch);
          }
          control.done();
        }
      )
      .next(() => foundBatch);
  }

  getAllMutationBatches(
    transaction: PersistenceTransaction
  ): PersistencePromise<MutationBatch[]> {
    const range = IDBKeyRange.bound(
      [this.userId, BATCHID_UNKNOWN],
      [this.userId, Number.POSITIVE_INFINITY]
    );
    return mutationsStore(transaction)
      .loadAll(DbMutationBatch.userMutationsIndex, range)
      .next(dbBatches =>
        dbBatches.map(dbBatch => this.serializer.fromDbMutationBatch(dbBatch))
      );
  }

  getAllMutationBatchesAffectingDocumentKey(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<MutationBatch[]> {
    // Scan the document-mutation index starting with a prefix starting with
    // the given documentKey.
    const indexPrefix = DbDocumentMutation.prefixForPath(
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
        const path = EncodedResourcePath.decode(encodedPath);
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
            assert(
              mutation.userId === this.userId,
              `Unexpected user '${
                mutation.userId
              }' for mutation batch ${batchId}`
            );
            results.push(this.serializer.fromDbMutationBatch(mutation!));
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
      const indexStart = DbDocumentMutation.prefixForPath(
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
          const path = EncodedResourcePath.decode(encodedPath);
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
    assert(
      !query.isDocumentQuery(),
      "Document queries shouldn't go down this path"
    );
    assert(
      !query.isCollectionGroupQuery(),
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
    const indexPrefix = DbDocumentMutation.prefixForPath(
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
        const path = EncodedResourcePath.decode(encodedPath);
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
            assert(
              mutation.userId === this.userId,
              `Unexpected user '${
                mutation.userId
              }' for mutation batch ${batchId}`
            );
            results.push(this.serializer.fromDbMutationBatch(mutation!));
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
      this.removeCachedMutationKeys(batch.batchId);
      return PersistencePromise.forEach(
        removedDocuments,
        (key: DocumentKey) => {
          return this.referenceDelegate.removeMutationReference(
            transaction,
            key
          );
        }
      );
    });
  }

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
        DbDocumentMutation.prefixForUser(this.userId)
      );
      const danglingMutationReferences: ResourcePath[] = [];
      return documentMutationsStore(txn)
        .iterate({ range: startRange }, (key, _, control) => {
          const userID = key[0];
          if (userID !== this.userId) {
            control.done();
            return;
          } else {
            const path = EncodedResourcePath.decode(key[1]);
            danglingMutationReferences.push(path);
          }
        })
        .next(() => {
          assert(
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
          metadata ||
          new DbMutationQueue(
            this.userId,
            BATCHID_UNKNOWN,
            /*lastStreamToken=*/ ''
          )
        );
      });
  }
}

/**
 * @return true if the mutation queue for the given user contains a pending
 *         mutation for the given key.
 */
function mutationQueueContainsKey(
  txn: PersistenceTransaction,
  userId: string,
  key: DocumentKey
): PersistencePromise<boolean> {
  const indexKey = DbDocumentMutation.prefixForPath(userId, key.path);
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
 * Delete a mutation batch and the associated document mutations.
 * @return A PersistencePromise of the document mutations that were removed.
 */
export function removeMutationBatch(
  txn: SimpleDbTransaction,
  userId: string,
  batch: MutationBatch
): PersistencePromise<DocumentKey[]> {
  const mutationStore = txn.store<DbMutationBatchKey, DbMutationBatch>(
    DbMutationBatch.store
  );
  const indexTxn = txn.store<DbDocumentMutationKey, DbDocumentMutation>(
    DbDocumentMutation.store
  );
  const promises: Array<PersistencePromise<void>> = [];

  const range = IDBKeyRange.only(batch.batchId);
  let numDeleted = 0;
  const removePromise = mutationStore.iterate(
    { range },
    (key, value, control) => {
      numDeleted++;
      return control.delete();
    }
  );
  promises.push(
    removePromise.next(() => {
      assert(
        numDeleted === 1,
        'Dangling document-mutation reference found: Missing batch ' +
          batch.batchId
      );
    })
  );
  const removedDocuments: DocumentKey[] = [];
  for (const mutation of batch.mutations) {
    const indexKey = DbDocumentMutation.key(
      userId,
      mutation.key.path,
      batch.batchId
    );
    promises.push(indexTxn.delete(indexKey));
    removedDocuments.push(mutation.key);
  }
  return PersistencePromise.waitFor(promises).next(() => removedDocuments);
}

function convertStreamToken(token: ProtoByteString): string {
  if (token instanceof Uint8Array) {
    // TODO(b/78771403): Convert tokens to strings during deserialization
    assert(
      process.env.USE_MOCK_PERSISTENCE === 'YES',
      'Persisting non-string stream tokens is only supported with mock persistence.'
    );
    return token.toString();
  } else {
    return token;
  }
}

/**
 * Helper to get a typed SimpleDbStore for the mutations object store.
 */
function mutationsStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbMutationBatchKey, DbMutationBatch> {
  return IndexedDbPersistence.getStore<DbMutationBatchKey, DbMutationBatch>(
    txn,
    DbMutationBatch.store
  );
}

/**
 * Helper to get a typed SimpleDbStore for the mutationQueues object store.
 */
function documentMutationsStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbDocumentMutationKey, DbDocumentMutation> {
  return IndexedDbPersistence.getStore<
    DbDocumentMutationKey,
    DbDocumentMutation
  >(txn, DbDocumentMutation.store);
}

/**
 * Helper to get a typed SimpleDbStore for the mutationQueues object store.
 */
function mutationQueuesStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbMutationQueueKey, DbMutationQueue> {
  return IndexedDbPersistence.getStore<DbMutationQueueKey, DbMutationQueue>(
    txn,
    DbMutationQueue.store
  );
}
