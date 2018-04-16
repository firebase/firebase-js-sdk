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

import { Timestamp } from '../../../src/api/timestamp';
import { Query } from '../../../src/core/query';
import { BatchId, ProtoByteString } from '../../../src/core/types';
import { GarbageCollector } from '../../../src/local/garbage_collector';
import { MutationQueue } from '../../../src/local/mutation_queue';
import { Persistence } from '../../../src/local/persistence';
import { DocumentKeySet } from '../../../src/model/collections';
import { DocumentKey } from '../../../src/model/document_key';
import { Mutation } from '../../../src/model/mutation';
import { MutationBatch } from '../../../src/model/mutation_batch';
import { AnyDuringMigration } from '../../../src/util/misc';

/**
 * A wrapper around a MutationQueue that automatically creates a
 * transaction around every operation to reduce test boilerplate.
 */
export class TestMutationQueue {
  constructor(public persistence: Persistence, public queue: MutationQueue) {}

  start(): Promise<void> {
    return this.persistence.runTransaction('start', true, txn => {
      return this.queue.start(txn);
    });
  }

  checkEmpty(): Promise<boolean> {
    return this.persistence.runTransaction('checkEmpty', true, txn => {
      return this.queue.checkEmpty(txn);
    });
  }

  countBatches(): Promise<number> {
    return this.persistence
      .runTransaction('countBatches', true, txn => {
        return this.queue.getPendingMutationBatches(txn);
      })
      .then(batches => batches.length);
  }

  getNextBatchId(): Promise<BatchId> {
    return this.persistence.runTransaction('getNextBatchId', true, txn => {
      return this.queue.getNextBatchId(txn);
    });
  }

  getHighestAcknowledgedBatchId(): Promise<BatchId> {
    return this.persistence.runTransaction(
      'getHighestAcknowledgedBatchId',
      true,
      txn => {
        return this.queue.getHighestAcknowledgedBatchId(txn);
      }
    );
  }

  setLastProcessedBatch(
    batchId: BatchId,
    streamToken: ProtoByteString
  ): Promise<void> {
    return this.persistence.runTransaction(
      'acknowledgeThroughBatchId',
      true,
      txn => {
        return this.queue.setLastProcessedBatch(txn, batchId, streamToken);
      }
    );
  }

  getLastStreamToken(): Promise<string> {
    return this.persistence.runTransaction('getLastStreamToken', true, txn => {
      return this.queue.getLastStreamToken(txn);
    }) as AnyDuringMigration;
  }

  setLastStreamToken(streamToken: string): Promise<void> {
    return this.persistence.runTransaction('setLastStreamToken', true, txn => {
      return this.queue.setLastStreamToken(txn, streamToken);
    });
  }

  addMutationBatch(mutations: Mutation[]): Promise<MutationBatch> {
    return this.persistence.runTransaction('addMutationBatch', true, txn => {
      return this.queue.addMutationBatch(txn, Timestamp.now(), mutations);
    });
  }

  lookupMutationBatch(batchId: BatchId): Promise<MutationBatch | null> {
    return this.persistence.runTransaction('lookupMutationBatch', true, txn => {
      return this.queue.lookupMutationBatch(txn, batchId);
    });
  }

  getNextMutationBatchAfterBatchId(
    batchId: BatchId
  ): Promise<MutationBatch | null> {
    return this.persistence.runTransaction(
      'getNextMutationBatchAfterBatchId',
      true,
      txn => {
        return this.queue.getNextMutationBatchAfterBatchId(txn, batchId);
      }
    );
  }

  getAllPendingBatches(): Promise<MutationBatch[]> {
    return this.persistence.runTransaction(
      'getAllMutationBatches',
      true,
      txn => {
        return this.queue.getPendingMutationBatches(txn);
      }
    );
  }

  getAllPendingBatchesThroughBatchId(
    batchId: BatchId
  ): Promise<MutationBatch[]> {
    return this.persistence.runTransaction(
      'getAllMutationBatchesThroughBatchId',
      true,
      txn => {
        return this.queue.getAllMutationBatchesThroughBatchId(txn, batchId);
      }
    );
  }

  getAllMutationBatchesAffectingDocumentKey(
    documentKey: DocumentKey
  ): Promise<MutationBatch[]> {
    return this.persistence.runTransaction(
      'getAllMutationBatchesAffectingDocumentKey',
      true,
      txn => {
        return this.queue.getPendingMutationBatchesAffectingDocumentKey(
          txn,
          documentKey
        );
      }
    );
  }

  getAllMutationBatchesAffectingQuery(query: Query): Promise<MutationBatch[]> {
    return this.persistence.runTransaction(
      'getAllMutationBatchesAffectingQuery',
      true,
      txn => {
        return this.queue.getPendingMutationBatchesAffectingQuery(txn, query);
      }
    );
  }

  removeMutationBatches(batches: MutationBatch[]): Promise<void> {
    return this.persistence.runTransaction(
      'removeMutationBatches',
      true,
      txn => {
        return this.queue.removeMutationBatches(txn, batches);
      }
    );
  }

  collectGarbage(gc: GarbageCollector): Promise<DocumentKeySet> {
    return this.persistence.runTransaction('garbageCollection', true, txn => {
      return gc.collectGarbage(txn);
    });
  }
}
