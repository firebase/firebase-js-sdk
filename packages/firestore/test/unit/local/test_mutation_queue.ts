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

import { Timestamp } from '../../../src/api/timestamp';
import { Query } from '../../../src/core/query';
import { BatchId } from '../../../src/core/types';
import { MutationQueue } from '../../../src/local/mutation_queue';
import { Persistence } from '../../../src/local/persistence';
import { DocumentKeySet } from '../../../src/model/collections';
import { DocumentKey } from '../../../src/model/document_key';
import { Mutation } from '../../../src/model/mutation';
import { MutationBatch } from '../../../src/model/mutation_batch';
import { SortedMap } from '../../../src/util/sorted_map';
import { ByteString } from '../../../src/util/byte_string';

/**
 * A wrapper around a MutationQueue that automatically creates a
 * transaction around every operation to reduce test boilerplate.
 */
export class TestMutationQueue {
  constructor(public persistence: Persistence, public queue: MutationQueue) {}

  checkEmpty(): Promise<boolean> {
    return this.persistence.runTransaction('checkEmpty', 'readonly', txn => {
      return this.queue.checkEmpty(txn);
    });
  }

  countBatches(): Promise<number> {
    return this.persistence
      .runTransaction('countBatches', 'readonly', txn => {
        return this.queue.getAllMutationBatches(txn);
      })
      .then(batches => batches.length);
  }

  acknowledgeBatch(
    batch: MutationBatch,
    streamToken: ByteString
  ): Promise<void> {
    return this.persistence.runTransaction(
      'acknowledgeThroughBatchId',
      'readwrite-primary',
      txn => {
        return this.queue.acknowledgeBatch(txn, batch, streamToken);
      }
    );
  }

  getLastStreamToken(): Promise<ByteString> {
    return this.persistence.runTransaction(
      'getLastStreamToken',
      'readonly',
      txn => {
        return this.queue.getLastStreamToken(txn);
      }
    );
  }

  setLastStreamToken(streamToken: ByteString): Promise<void> {
    return this.persistence.runTransaction(
      'setLastStreamToken',
      'readwrite-primary',
      txn => {
        return this.queue.setLastStreamToken(txn, streamToken);
      }
    );
  }

  addMutationBatch(mutations: Mutation[]): Promise<MutationBatch> {
    return this.persistence.runTransaction(
      'addMutationBatch',
      'readwrite',
      txn => {
        return this.queue.addMutationBatch(
          txn,
          Timestamp.now(),
          /* baseMutations= */ [],
          mutations
        );
      }
    );
  }

  lookupMutationBatch(batchId: BatchId): Promise<MutationBatch | null> {
    return this.persistence.runTransaction(
      'lookupMutationBatch',
      'readonly',
      txn => {
        return this.queue.lookupMutationBatch(txn, batchId);
      }
    );
  }

  getNextMutationBatchAfterBatchId(
    batchId: BatchId
  ): Promise<MutationBatch | null> {
    return this.persistence.runTransaction(
      'getNextMutationBatchAfterBatchId',
      'readonly',
      txn => {
        return this.queue.getNextMutationBatchAfterBatchId(txn, batchId);
      }
    );
  }

  getAllMutationBatches(): Promise<MutationBatch[]> {
    return this.persistence.runTransaction(
      'getAllMutationBatches',
      'readonly',
      txn => {
        return this.queue.getAllMutationBatches(txn);
      }
    );
  }

  getAllMutationBatchesAffectingDocumentKey(
    documentKey: DocumentKey
  ): Promise<MutationBatch[]> {
    return this.persistence.runTransaction(
      'getAllMutationBatchesAffectingDocumentKey',
      'readonly',
      txn => {
        return this.queue.getAllMutationBatchesAffectingDocumentKey(
          txn,
          documentKey
        );
      }
    );
  }

  getAllMutationBatchesAffectingDocumentKeys(
    documentKeys: DocumentKeySet
  ): Promise<MutationBatch[]> {
    let keyMap = new SortedMap<DocumentKey, null>(DocumentKey.comparator);
    documentKeys.forEach(key => {
      keyMap = keyMap.insert(key, null);
    });

    return this.persistence.runTransaction(
      'getAllMutationBatchesAffectingDocumentKeys',
      'readonly',
      txn => {
        return this.queue.getAllMutationBatchesAffectingDocumentKeys(
          txn,
          keyMap
        );
      }
    );
  }

  getAllMutationBatchesAffectingQuery(query: Query): Promise<MutationBatch[]> {
    return this.persistence.runTransaction(
      'getAllMutationBatchesAffectingQuery',
      'readonly',
      txn => {
        return this.queue.getAllMutationBatchesAffectingQuery(txn, query);
      }
    );
  }

  removeMutationBatch(batch: MutationBatch): Promise<void> {
    return this.persistence.runTransaction(
      'removeMutationBatch',
      'readwrite-primary',
      txn => {
        return this.queue.removeMutationBatch(txn, batch);
      }
    );
  }
}
