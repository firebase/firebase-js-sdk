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
import { DocumentKey } from '../model/document_key';
import { Mutation } from '../model/mutation';
import { MutationBatch } from '../model/mutation_batch';

import { GarbageSource } from './garbage_source';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';

/** A queue of mutations to apply to the remote store. */
export interface MutationQueue extends GarbageSource {
  /**
   * Starts the mutation queue, performing any initial reads that might be
   * required to establish invariants, etc.
   *
   * After starting, the mutation queue must guarantee that the
   * highestAcknowledgedBatchId is less than nextBatchId. This prevents the
   * local store from creating new batches that the mutation queue would
   * consider erroneously acknowledged.
   */
  start(transaction: PersistenceTransaction): PersistencePromise<void>;

  /** Returns true if this queue contains no mutation batches. */
  checkEmpty(transaction: PersistenceTransaction): PersistencePromise<boolean>;

  /**
   * Returns the next BatchId that will be assigned to a new mutation batch.
   *
   * Callers generally don't care about this value except to test that the
   * mutation queue is properly maintaining the invariant that
   * highestAcknowledgedBatchId is less than nextBatchId.
   */
  getNextBatchId(
    transaction: PersistenceTransaction
  ): PersistencePromise<BatchId>;

  /**
   * Returns the highest batchId that has been acknowledged. If no batches have
   * been acknowledged or if there are no batches in the queue this can return
   * BATCHID_UNKNOWN.
   */
  getHighestAcknowledgedBatchId(
    transaction: PersistenceTransaction
  ): PersistencePromise<BatchId>;

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

  /** Creates a new mutation batch and adds it to this mutation queue. */
  addMutationBatch(
    transaction: PersistenceTransaction,
    localWriteTime: Timestamp,
    mutations: Mutation[]
  ): PersistencePromise<MutationBatch>;

  /** Loads the mutation batch with the given batchId. */
  lookupMutationBatch(
    transaction: PersistenceTransaction,
    batchId: BatchId
  ): PersistencePromise<MutationBatch | null>;

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
   * Finds all mutations with a batchId less than or equal to the given batchId.
   *
   * Generally the caller should be asking for the next unacknowledged batchId
   * and the number of acknowledged batches should be very small when things are
   * functioning well.
   *
   * @param batchId The batch to search through.
   *
   * @return an Array containing all batches with matching batchIds.
   */
  // TODO(mcg): This should really return an enumerator and the caller should be
  // adjusted to only loop through these once.
  getAllMutationBatchesThroughBatchId(
    transaction: PersistenceTransaction,
    batchId: BatchId
  ): PersistencePromise<MutationBatch[]>;

  /**
   * Finds all mutation batches that could possibly affect the given
   * document key. Not all mutations in a batch will necessarily affect the
   * document key, so when looping through the batch you'll need to check that
   * the mutation itself matches the key.
   *
   * Note that because of this requirement implementations are free to return
   * mutation batches that don't contain the document key at all if it's
   * convenient.
   */
  // TODO(mcg): This should really return an enumerator
  // also for b/32992024, all backing stores should really index by document key
  getAllMutationBatchesAffectingDocumentKey(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<MutationBatch[]>;

  /**
   * Finds all mutation batches that could affect the results for the given
   * query. Not all mutations in a batch will necessarily affect the query, so
   * when looping through the batch you'll need to check that the mutation
   * itself matches the query.
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
   * Removes the given mutation batches from the queue. This is useful in two
   * circumstances:
   *
   * + Removing applied mutations from the head of the queue
   * + Removing rejected mutations from anywhere in the queue
   *
   * In both cases, the array of mutations to remove must be a contiguous range
   * of batchIds. This is most easily accomplished by loading mutations with
   * getAllMutationBatchesThroughBatchId()
   */
  removeMutationBatches(
    transaction: PersistenceTransaction,
    batches: MutationBatch[]
  ): PersistencePromise<void>;

  /**
   * Performs a consistency check, examining the mutation queue for any
   * leaks, if possible.
   */
  performConsistencyCheck(
    transaction: PersistenceTransaction
  ): PersistencePromise<void>;
}
