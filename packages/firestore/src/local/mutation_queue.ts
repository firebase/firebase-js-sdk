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
import { BatchId, ProtoByteString } from '../core/types';
import { DocumentKeySet } from '../model/collections';
import { DocumentKey } from '../model/document_key';
import { Mutation } from '../model/mutation';
import { MutationBatch } from '../model/mutation_batch';

import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';

/** A queue of mutations to apply to the remote store. */
export interface MutationQueue {
  /** Returns true if this queue contains no mutation batches. */
  checkEmpty(transaction: PersistenceTransaction): PersistencePromise<boolean>;

  /**
   * Acknowledges the given batch.
   */
  acknowledgeBatch(
    transaction: PersistenceTransaction,
    batch: MutationBatch,
    streamToken: ProtoByteString
  ): PersistencePromise<void>;

  /** Returns the current stream token for this mutation queue. */
  getLastStreamToken(
    transaction: PersistenceTransaction
  ): PersistencePromise<ProtoByteString>;

  /** Sets the stream token for this mutation queue. */
  setLastStreamToken(
    transaction: PersistenceTransaction,
    streamToken: ProtoByteString
  ): PersistencePromise<void>;

  /**
   * Creates a new mutation batch and adds it to this mutation queue.
   */
  addMutationBatch(
    transaction: PersistenceTransaction,
    localWriteTime: Timestamp,
    mutations: Mutation[]
  ): PersistencePromise<MutationBatch>;

  /**
   * Loads the mutation batch with the given batchId.
   */
  lookupMutationBatch(
    transaction: PersistenceTransaction,
    batchId: BatchId
  ): PersistencePromise<MutationBatch | null>;

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
  ): PersistencePromise<DocumentKeySet | null>;

  /**
   * Gets the first unacknowledged mutation batch after the passed in batchId
   * in the mutation queue or null if empty.
   *
   * @param batchId The batch to search after, or BATCHID_UNKNOWN for the first
   * mutation in the queue.
   *
   * @return the next mutation or null if there wasn't one.
   */
  getNextMutationBatchAfterBatchId(
    transaction: PersistenceTransaction,
    batchId: BatchId
  ): PersistencePromise<MutationBatch | null>;

  /** Gets all mutation batches in the mutation queue. */
  // TODO(mikelehen): PERF: Current consumer only needs mutated keys; if we can
  // provide that cheaply, we should replace this.
  getAllMutationBatches(
    transaction: PersistenceTransaction
  ): PersistencePromise<MutationBatch[]>;

  /**
   * Finds all mutation batches that could possibly affect the given
   * document key. Not all mutations in a batch will necessarily affect the
   * document key, so when looping through the batch you'll need to check that
   * the mutation itself matches the key.
   *
   * Batches are guaranteed to be in sorted order.
   *
   * Note that because of this requirement implementations are free to return
   * mutation batches that don't contain the document key at all if it's
   * convenient.
   */
  // TODO(mcg): This should really return an enumerator
  getAllMutationBatchesAffectingDocumentKey(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<MutationBatch[]>;

  /**
   * Finds all mutation batches that could possibly affect the given set of
   * document keys. Not all mutations in a batch will necessarily affect each
   * key, so when looping through the batch you'll need to check that the
   * mutation itself matches the key.
   *
   * Batches are guaranteed to be in sorted order.
   *
   * Note that because of this requirement implementations are free to return
   * mutation batches that don't contain any of the document keys at all if it's
   * convenient.
   */
  // TODO(mcg): This should really return an enumerator
  getAllMutationBatchesAffectingDocumentKeys(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<MutationBatch[]>;

  /**
   * Finds all mutation batches that could affect the results for the given
   * query. Not all mutations in a batch will necessarily affect the query, so
   * when looping through the batch you'll need to check that the mutation
   * itself matches the query.
   *
   * Batches are guaranteed to be in sorted order.
   *
   * Note that because of this requirement implementations are free to return
   * mutation batches that don't match the query at all if it's convenient.
   *
   * NOTE: A PatchMutation does not need to include all fields in the query
   * filter criteria in order to be a match (but any fields it does contain do
   * need to match).
   */
  // TODO(mikelehen): This should perhaps return an enumerator, though I'm not
  // sure we can avoid loading them all in memory.
  getAllMutationBatchesAffectingQuery(
    transaction: PersistenceTransaction,
    query: Query
  ): PersistencePromise<MutationBatch[]>;

  /**
   * Removes the given mutation batch from the queue. This is useful in two
   * circumstances:
   *
   * + Removing an applied mutation from the head of the queue
   * + Removing a rejected mutation from anywhere in the queue
   *
   * Multi-Tab Note: This operation should only be called by the primary client.
   */
  removeMutationBatch(
    transaction: PersistenceTransaction,
    batch: MutationBatch
  ): PersistencePromise<void>;

  /**
   * Clears the cached keys for a mutation batch. This method should be
   * called by secondary clients after they process mutation updates.
   *
   * Note that this method does not have to be called from primary clients as
   * the corresponding cache entries are cleared when an acknowledged or
   * rejected batch is removed from the mutation queue.
   */
  // PORTING NOTE: Multi-tab only
  removeCachedMutationKeys(batchId: BatchId): void;

  /**
   * Performs a consistency check, examining the mutation queue for any
   * leaks, if possible.
   */
  performConsistencyCheck(
    transaction: PersistenceTransaction
  ): PersistencePromise<void>;
}
