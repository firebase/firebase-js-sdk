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

import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { QueryEngine } from '../../../src/local/query_engine';
import { LocalDocumentsView } from '../../../src/local/local_documents_view';
import { PersistenceTransaction } from '../../../src/local/persistence';
import { Query } from '../../../src/core/query';
import { PersistencePromise } from '../../../src/local/persistence_promise';
import { RemoteDocumentCache } from '../../../src/local/remote_document_cache';
import { MutationQueue } from '../../../src/local/mutation_queue';
import { DocumentKeySet, DocumentMap } from '../../../src/model/collections';

export enum QueryEngineType {
  IndexFree,
  Simple
}

/**
 * A test-only query engine that forwards all API calls and exposes the number
 * of documents and mutations read.
 */
export class CountingQueryEngine implements QueryEngine {
  /**
   * The number of mutations returned by the MutationQueue's
   * `getAllMutationBatchesAffectingQuery()` API (since the last call to
   * `resetCounts()`)
   */
  mutationsReadByQuery = 0;

  /**
   * The number of mutations returned by the MutationQueue's
   * `getAllMutationBatchesAffectingDocumentKey()` and
   * `getAllMutationBatchesAffectingDocumentKeys()` APIs (since the last call
   * to `resetCounts()`)
   */
  mutationsReadByKey = 0;

  /**
   * The number of documents returned by the RemoteDocumentCache's
   * `getDocumentsMatchingQuery()` API (since the last call to `resetCounts()`)
   */
  documentsReadByQuery = 0;

  /**
   * The number of documents returned by the RemoteDocumentCache's `getEntry()`
   * and `getEntries()` APIs (since the last call to `resetCounts()`)
   */
  documentsReadByKey = 0;

  constructor(
    private readonly queryEngine: QueryEngine,
    readonly type: QueryEngineType
  ) {}

  resetCounts(): void {
    this.mutationsReadByQuery = 0;
    this.mutationsReadByKey = 0;
    this.documentsReadByQuery = 0;
    this.documentsReadByKey = 0;
  }

  getDocumentsMatchingQuery(
    transaction: PersistenceTransaction,
    query: Query,
    lastLimboFreeSnapshotVersion: SnapshotVersion,
    remoteKeys: DocumentKeySet
  ): PersistencePromise<DocumentMap> {
    return this.queryEngine.getDocumentsMatchingQuery(
      transaction,
      query,
      lastLimboFreeSnapshotVersion,
      remoteKeys
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
    subject: RemoteDocumentCache
  ): RemoteDocumentCache {
    return {
      getDocumentsMatchingQuery: (transaction, query, sinceReadTime) => {
        return subject
          .getDocumentsMatchingQuery(transaction, query, sinceReadTime)
          .next(result => {
            this.documentsReadByQuery += result.size;
            return result;
          });
      },
      getEntries: (transaction, documentKeys) => {
        return subject.getEntries(transaction, documentKeys).next(result => {
          this.documentsReadByKey += result.size;
          return result;
        });
      },
      getEntry: (transaction, documentKey) => {
        return subject.getEntry(transaction, documentKey).next(result => {
          this.documentsReadByKey += result ? 1 : 0;
          return result;
        });
      },
      getSize: subject.getSize,
      newChangeBuffer: subject.newChangeBuffer
    };
  }

  private wrapMutationQueue(subject: MutationQueue): MutationQueue {
    return {
      addMutationBatch: subject.addMutationBatch,
      checkEmpty: subject.checkEmpty,
      getAllMutationBatches: transaction => {
        return subject.getAllMutationBatches(transaction).next(result => {
          this.mutationsReadByKey += result.length;
          return result;
        });
      },
      getAllMutationBatchesAffectingDocumentKey: (transaction, documentKey) => {
        return subject
          .getAllMutationBatchesAffectingDocumentKey(transaction, documentKey)
          .next(result => {
            this.mutationsReadByKey += result.length;
            return result;
          });
      },
      getAllMutationBatchesAffectingDocumentKeys: (
        transaction,
        documentKeys
      ) => {
        return subject
          .getAllMutationBatchesAffectingDocumentKeys(transaction, documentKeys)
          .next(result => {
            this.mutationsReadByKey += result.length;
            return result;
          });
      },
      getAllMutationBatchesAffectingQuery: (transaction, query) => {
        return subject
          .getAllMutationBatchesAffectingQuery(transaction, query)
          .next(result => {
            this.mutationsReadByQuery += result.length;
            return result;
          });
      },
      getHighestUnacknowledgedBatchId: subject.getHighestUnacknowledgedBatchId,
      getNextMutationBatchAfterBatchId:
        subject.getNextMutationBatchAfterBatchId,
      lookupMutationBatch: subject.lookupMutationBatch,
      performConsistencyCheck: subject.performConsistencyCheck,
      removeMutationBatch: subject.removeMutationBatch
    };
  }
}
