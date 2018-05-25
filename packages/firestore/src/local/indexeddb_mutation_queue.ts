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
import { User } from '../auth/user';
import { Query } from '../core/query';
import { BatchId, ProtoByteString } from '../core/types';
import { DocumentKey } from '../model/document_key';
import { Mutation } from '../model/mutation';
import { BATCHID_UNKNOWN, MutationBatch } from '../model/mutation_batch';
import { ResourcePath } from '../model/path';
import { assert, fail } from '../util/assert';
import { immediatePredecessor, primitiveComparator } from '../util/misc';
import { SortedSet } from '../util/sorted_set';

import * as EncodedResourcePath from './encoded_resource_path';
import { GarbageCollector } from './garbage_collector';
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
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { SimpleDb, SimpleDbStore } from './simple_db';
import { DocumentKeySet } from '../model/collections';

/** A mutation queue for a specific user, backed by IndexedDB. */
export class IndexedDbMutationQueue implements MutationQueue {
  /**
   * Next value to use when assigning sequential IDs to each mutation batch.
   *
   * NOTE: There can only be one IndexedDbMutationQueue for a given db at a
   * time, hence it is safe to track nextBatchID as an instance-level property.
   * Should we ever relax this constraint we'll need to revisit this.
   */
  private nextBatchId: BatchId;

  /**
   * A write-through cache copy of the metadata describing the current queue.
   */
  private metadata: DbMutationQueue;

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

  private garbageCollector: GarbageCollector | null = null;

  constructor(
    /**
     * The normalized userId (e.g. null UID => "" userId) used to store /
     * retrieve mutations.
     */
    private userId: string,
    private serializer: LocalSerializer
  ) {}

  /**
   * Creates a new mutation queue for the given user.
   * @param user The user for which to create a mutation queue.
   * @param serializer The serializer to use when persisting to IndexedDb.
   */
  static forUser(
    user: User,
    serializer: LocalSerializer
  ): IndexedDbMutationQueue {
    // TODO(mcg): Figure out what constraints there are on userIDs
    // In particular, are there any reserved characters? are empty ids allowed?
    // For the moment store these together in the same mutations table assuming
    // that empty userIDs aren't allowed.
    assert(user.uid !== '', 'UserID must not be an empty string.');
    const userId = user.isAuthenticated() ? user.uid! : '';
    return new IndexedDbMutationQueue(userId, serializer);
  }

  start(transaction: PersistenceTransaction): PersistencePromise<void> {
    return IndexedDbMutationQueue.loadNextBatchIdFromDb(transaction)
      .next(nextBatchId => {
        this.nextBatchId = nextBatchId;
        return mutationQueuesStore(transaction).get(this.userId);
      })
      .next((metadata: DbMutationQueue | null) => {
        if (!metadata) {
          metadata = new DbMutationQueue(
            this.userId,
            BATCHID_UNKNOWN,
            /*lastStreamToken=*/ ''
          );
        }
        this.metadata = metadata;

        // On restart, nextBatchId may end up lower than
        // lastAcknowledgedBatchId since it's computed from the queue
        // contents, and there may be no mutations in the queue. In this
        // case, we need to reset lastAcknowledgedBatchId (which is safe
        // since the queue must be empty).
        if (this.metadata.lastAcknowledgedBatchId >= this.nextBatchId) {
          return this.checkEmpty(transaction).next(empty => {
            assert(
              empty,
              'Reset nextBatchID is only possible when the queue is empty'
            );

            this.metadata.lastAcknowledgedBatchId = BATCHID_UNKNOWN;
            return mutationQueuesStore(transaction).put(this.metadata);
          });
        } else {
          return PersistencePromise.resolve();
        }
      });
  }

  /**
   * Returns one larger than the largest batch ID that has been stored. If there
   * are no mutations returns 0. Note that batch IDs are global.
   */
  static loadNextBatchIdFromDb(
    txn: PersistenceTransaction
  ): PersistencePromise<BatchId> {
    let maxBatchId = BATCHID_UNKNOWN;
    return mutationsStore(txn)
      .iterate({ reverse: true }, (key, batch, control) => {
        const [userId, batchId] = key;
        if (batchId > maxBatchId) {
          maxBatchId = batch.batchId;
        }

        if (userId === '') {
          // We can't compute a predecessor for the empty string, since it
          // is lexographically first. That also means that no other
          // userIds can come before this one, so we can just exit early.
          control.done();
        } else {
          const nextUser = immediatePredecessor(userId);
          control.skip([nextUser]);
        }
      })
      .next(() => maxBatchId + 1);
  }

  checkEmpty(transaction: PersistenceTransaction): PersistencePromise<boolean> {
    let empty = true;
    const range = IDBKeyRange.bound(
      this.keyForBatchId(Number.NEGATIVE_INFINITY),
      this.keyForBatchId(Number.POSITIVE_INFINITY)
    );
    return mutationsStore(transaction)
      .iterate({ range }, (key, value, control) => {
        empty = false;
        control.done();
      })
      .next(() => empty);
  }

  getNextBatchId(
    transaction: PersistenceTransaction
  ): PersistencePromise<BatchId> {
    return PersistencePromise.resolve(this.nextBatchId);
  }

  getHighestAcknowledgedBatchId(
    transaction: PersistenceTransaction
  ): PersistencePromise<BatchId> {
    return PersistencePromise.resolve(this.metadata.lastAcknowledgedBatchId);
  }

  acknowledgeBatch(
    transaction: PersistenceTransaction,
    batch: MutationBatch,
    streamToken: ProtoByteString
  ): PersistencePromise<void> {
    const batchId = batch.batchId;
    assert(
      batchId > this.metadata.lastAcknowledgedBatchId,
      'Mutation batchIDs must be acknowledged in order'
    );

    this.metadata.lastAcknowledgedBatchId = batchId;
    this.metadata.lastStreamToken = convertStreamToken(streamToken);

    return mutationQueuesStore(transaction).put(this.metadata);
  }

  getLastStreamToken(
    transaction: PersistenceTransaction
  ): PersistencePromise<ProtoByteString> {
    return PersistencePromise.resolve(this.metadata.lastStreamToken);
  }

  setLastStreamToken(
    transaction: PersistenceTransaction,
    streamToken: ProtoByteString
  ): PersistencePromise<void> {
    this.metadata.lastStreamToken = convertStreamToken(streamToken);
    return mutationQueuesStore(transaction).put(this.metadata);
  }

  addMutationBatch(
    transaction: PersistenceTransaction,
    localWriteTime: Timestamp,
    mutations: Mutation[]
  ): PersistencePromise<MutationBatch> {
    const batchId = this.nextBatchId;
    this.nextBatchId++;
    const batch = new MutationBatch(batchId, localWriteTime, mutations);
    const dbBatch = this.serializer.toDbMutationBatch(this.userId, batch);

    this.documentKeysByBatchId[dbBatch.batchId] = batch.keys();

    return mutationsStore(transaction)
      .put(dbBatch)
      .next(() => {
        const promises: Array<PersistencePromise<void>> = [];
        for (const mutation of mutations) {
          const indexKey = DbDocumentMutation.key(
            this.userId,
            mutation.key.path,
            batchId
          );
          promises.push(
            documentMutationsStore(transaction).put(
              indexKey,
              DbDocumentMutation.PLACEHOLDER
            )
          );
        }
        return PersistencePromise.waitFor(promises);
      })
      .next(() => {
        return batch;
      });
  }

  lookupMutationBatch(
    transaction: PersistenceTransaction,
    batchId: BatchId
  ): PersistencePromise<MutationBatch | null> {
    return mutationsStore(transaction)
      .get(this.keyForBatchId(batchId))
      .next(
        dbBatch =>
          dbBatch ? this.serializer.fromDbMutationBatch(dbBatch) : null
      );
  }

  lookupMutationKeys(
    transaction: PersistenceTransaction,
    batchId: BatchId
  ): PersistencePromise<DocumentKeySet | null> {
    if (this.documentKeysByBatchId[batchId]) {
      return PersistencePromise.resolve(this.documentKeysByBatchId[batchId]);
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
    // All batches with batchId <= this.metadata.lastAcknowledgedBatchId have
    // been acknowledged so the first unacknowledged batch after batchID will
    // have a batchID larger than both of these values.
    const nextBatchId =
      Math.max(batchId, this.metadata.lastAcknowledgedBatchId) + 1;

    const range = IDBKeyRange.lowerBound(this.keyForBatchId(nextBatchId));
    let foundBatch: MutationBatch | null = null;
    return mutationsStore(transaction)
      .iterate({ range }, (key, dbBatch, control) => {
        if (dbBatch.userId === this.userId) {
          assert(
            dbBatch.batchId >= nextBatchId,
            'Should have found mutation after ' + nextBatchId
          );
          foundBatch = this.serializer.fromDbMutationBatch(dbBatch);
        }
        control.done();
      })
      .next(() => foundBatch);
  }

  getAllMutationBatches(
    transaction: PersistenceTransaction
  ): PersistencePromise<MutationBatch[]> {
    const range = IDBKeyRange.bound(
      this.keyForBatchId(BATCHID_UNKNOWN),
      this.keyForBatchId(Number.POSITIVE_INFINITY)
    );
    return mutationsStore(transaction)
      .loadAll(range)
      .next(dbBatches =>
        dbBatches.map(dbBatch => this.serializer.fromDbMutationBatch(dbBatch))
      );
  }

  getAllMutationBatchesThroughBatchId(
    transaction: PersistenceTransaction,
    batchId: BatchId
  ): PersistencePromise<MutationBatch[]> {
    const range = IDBKeyRange.bound(
      this.keyForBatchId(BATCHID_UNKNOWN),
      this.keyForBatchId(batchId)
    );
    return mutationsStore(transaction)
      .loadAll(range)
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
        const mutationKey = this.keyForBatchId(batchID);
        // Look up the mutation batch in the store.
        // PORTING NOTE: because iteration is callback driven in the web,
        // we just look up the key instead of keeping an open iterator
        // like iOS.
        return mutationsStore(transaction)
          .get(mutationKey)
          .next(dbBatch => {
            if (dbBatch === null) {
              fail(
                'Dangling document-mutation reference found: ' +
                  indexKey +
                  ' which points to ' +
                  mutationKey
              );
            }
            results.push(this.serializer.fromDbMutationBatch(dbBatch!));
          });
      })
      .next(() => results);
  }

  getAllMutationBatchesAffectingQuery(
    transaction: PersistenceTransaction,
    query: Query
  ): PersistencePromise<MutationBatch[]> {
    assert(
      !query.isDocumentQuery(),
      "Document queries shouldn't go down this path"
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
      .next(() => {
        const results: MutationBatch[] = [];
        const promises: Array<PersistencePromise<void>> = [];
        // TODO(rockwood): Implement this using iterate.
        uniqueBatchIDs.forEach(batchID => {
          const mutationKey = this.keyForBatchId(batchID);
          promises.push(
            mutationsStore(transaction)
              .get(mutationKey)
              .next(mutation => {
                if (mutation === null) {
                  fail(
                    'Dangling document-mutation reference found, ' +
                      'which points to ' +
                      mutationKey
                  );
                }
                results.push(this.serializer.fromDbMutationBatch(mutation!));
              })
          );
        });
        return PersistencePromise.waitFor(promises).next(() => results);
      });
  }

  removeMutationBatches(
    transaction: PersistenceTransaction,
    batches: MutationBatch[]
  ): PersistencePromise<void> {
    const txn = mutationsStore(transaction);
    const indexTxn = documentMutationsStore(transaction);
    const promises: Array<PersistencePromise<void>> = [];

    for (const batch of batches) {
      const range = IDBKeyRange.only(this.keyForBatchId(batch.batchId));
      let numDeleted = 0;
      const removePromise = txn.iterate({ range }, (key, value, control) => {
        numDeleted++;
        return control.delete();
      });
      promises.push(
        removePromise.next(() => {
          assert(
            numDeleted === 1,
            'Dangling document-mutation reference found: Missing batch ' +
              batch.batchId
          );
        })
      );
      for (const mutation of batch.mutations) {
        const indexKey = DbDocumentMutation.key(
          this.userId,
          mutation.key.path,
          batch.batchId
        );
        this.removeCachedMutationKeys(batch.batchId);
        promises.push(indexTxn.delete(indexKey));
        if (this.garbageCollector !== null) {
          this.garbageCollector.addPotentialGarbageKey(mutation.key);
        }
      }
    }
    return PersistencePromise.waitFor(promises);
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
            'Document leak -- detected dangling mutation references when queue is empty. Dangling keys: ' +
              danglingMutationReferences.map(p => p.canonicalString())
          );
        });
    });
  }

  setGarbageCollector(gc: GarbageCollector | null): void {
    this.garbageCollector = gc;
  }

  containsKey(
    txn: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<boolean> {
    const indexKey = DbDocumentMutation.prefixForPath(this.userId, key.path);
    const encodedPath = indexKey[1];
    const startRange = IDBKeyRange.lowerBound(indexKey);
    let containsKey = false;
    return documentMutationsStore(txn)
      .iterate({ range: startRange, keysOnly: true }, (key, value, control) => {
        const [userID, keyPath, /*batchID*/ _] = key;
        if (userID === this.userId && keyPath === encodedPath) {
          containsKey = true;
        }
        control.done();
      })
      .next(() => containsKey);
  }

  /**
   * Creates a [userId, batchId] key for use with the DbMutationQueue object
   * store.
   */
  private keyForBatchId(batchId: BatchId): DbMutationBatchKey {
    return [this.userId, batchId];
  }
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
  return SimpleDb.getStore<DbMutationBatchKey, DbMutationBatch>(
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
  return SimpleDb.getStore<DbDocumentMutationKey, DbDocumentMutation>(
    txn,
    DbDocumentMutation.store
  );
}

/**
 * Helper to get a typed SimpleDbStore for the mutationQueues object store.
 */
function mutationQueuesStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbMutationQueueKey, DbMutationQueue> {
  return SimpleDb.getStore<DbMutationQueueKey, DbMutationQueue>(
    txn,
    DbMutationQueue.store
  );
}
