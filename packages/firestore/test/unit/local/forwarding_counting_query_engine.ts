/**
 * @license
 * Copyright 2019 Google Inc.
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

import { QueryEngine } from '../../../src/local/query_engine';
import { LocalDocumentsView } from '../../../src/local/local_documents_view';
import { PersistenceTransaction } from '../../../src/local/persistence';
import { Query } from '../../../src/core/query';
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { PersistencePromise } from '../../../src/local/persistence_promise';
import { DocumentMap } from '../../../src/model/collections';
import { RemoteDocumentCache } from '../../../src/local/remote_document_cache';
import { MutationQueue } from '../../../src/local/mutation_queue';

/**
 * A test-only query engine that forwards all calls to the query engine
 * provided at construction time, but provides access to the number of
 * documents and mutations read.
 */
export class ForwardingCountingQueryEngine implements QueryEngine {
  /**
   * The number of mutations returned by the MutationQueue (since the last call
   * to `resetCounts()`)
   */
  mutationsRead = 0;

  /**
   * The number of documents returned by the RemoteDocumentCache (since the
   * last call to `resetCounts()`)
   */
  documentsRead = 0;

  constructor(private readonly queryEngine: QueryEngine) {}

  resetCounts() : void {
    this.mutationsRead = 0;
    this.documentsRead = 0;
  }

  getDocumentsMatchingQuery(
    transaction: PersistenceTransaction,
    query: Query,
    sinceReadTime: SnapshotVersion
  ): PersistencePromise<DocumentMap> {
    return this.queryEngine.getDocumentsMatchingQuery(
      transaction,
      query,
      sinceReadTime
    );
  }

  setLocalDocumentsView(localDocuments: LocalDocumentsView): void {
    const view = new LocalDocumentsView(
        this.wrapRemoteDocumentCache(localDocuments.remoteDocumentCache),
        this.wrapMutationQueue(localDocuments.mutationQueue),
        localDocuments.indexManager
    );

    return this.queryEngine.setLocalDocumentsView(view);
  }

  private wrapRemoteDocumentCache(
    target: RemoteDocumentCache
  ): RemoteDocumentCache {
    return {
      getDocumentsMatchingQuery: (transaction, query, sinceReadTime) => {
        return target
          .getDocumentsMatchingQuery(transaction, query, sinceReadTime)
          .next(result => {
            this.documentsRead += result.size;
            return result;
          });
      },
      getEntries: (transaction, documentKeys) => {
        return target.getEntries(transaction, documentKeys).next(result => {
          this.documentsRead += result.size;
          return result;
        });
      },
      getEntry: (transaction, documentKey) => {
        return target.getEntry(transaction, documentKey).next(result => {
          this.documentsRead += result ? 1 : 0;
          return result;
        });
      },
      getNewDocumentChanges: target.getNewDocumentChanges,
      getSize: target.getSize,
      newChangeBuffer: target.newChangeBuffer
    };
  }

  private wrapMutationQueue(target: MutationQueue): MutationQueue {
    return {
      acknowledgeBatch: target.acknowledgeBatch,
      addMutationBatch: target.addMutationBatch,
      checkEmpty: target.checkEmpty,
      getAllMutationBatches: transaction => {
        return target.getAllMutationBatches(transaction).next(result => {
          this.mutationsRead += result.length;
          return result;
        });
      },
      getAllMutationBatchesAffectingDocumentKey: (transaction, documentKey) => {
        return target
          .getAllMutationBatchesAffectingDocumentKey(transaction, documentKey)
          .next(result => {
            this.mutationsRead += result.length;
            return result;
          });
      },
      getAllMutationBatchesAffectingDocumentKeys: (
        transaction,
        documentKeys
      ) => {
        return target
          .getAllMutationBatchesAffectingDocumentKeys(transaction, documentKeys)
          .next(result => {
            this.mutationsRead += result.length;
            return result;
          });
      },
      getAllMutationBatchesAffectingQuery: (transaction, query) => {
        return target
          .getAllMutationBatchesAffectingQuery(transaction, query)
          .next(result => {
            this.mutationsRead += result.length;
            return result;
          });
      },
      getHighestUnacknowledgedBatchId: target.getHighestUnacknowledgedBatchId,
      getLastStreamToken: target.getLastStreamToken,
      getNextMutationBatchAfterBatchId: target.getNextMutationBatchAfterBatchId,
      lookupMutationBatch: target.lookupMutationBatch,
      lookupMutationKeys: target.lookupMutationKeys,
      performConsistencyCheck: target.performConsistencyCheck,
      removeCachedMutationKeys: target.removeCachedMutationKeys,
      removeMutationBatch: target.removeMutationBatch,
      setLastStreamToken: target.setLastStreamToken
    };
  }
}
