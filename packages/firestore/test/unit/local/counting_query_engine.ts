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

import { Query } from '../../../src/core/query';
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { DocumentOverlayCache } from '../../../src/local/document_overlay_cache';
import { IndexManager } from '../../../src/local/index_manager';
import { LocalDocumentsView } from '../../../src/local/local_documents_view';
import { MutationQueue } from '../../../src/local/mutation_queue';
import { PersistencePromise } from '../../../src/local/persistence_promise';
import { PersistenceTransaction } from '../../../src/local/persistence_transaction';
import { QueryEngine } from '../../../src/local/query_engine';
import { RemoteDocumentCache } from '../../../src/local/remote_document_cache';
import {
  DocumentKeySet,
  DocumentMap,
  OverlayMap
} from '../../../src/model/collections';
import { DocumentKey } from '../../../src/model/document_key';
import { Overlay } from '../../../src/model/overlay';
import { ResourcePath } from '../../../src/model/path';

/**
 * A test-only query engine that forwards all API calls and exposes the number
 * of documents and mutations read.
 */
export class CountingQueryEngine extends QueryEngine {
  /**
   * The number of mutations returned by the MutationQueue's
   * `getAllMutationBatchesAffectingQuery()` API (since the last call to
   * `resetCounts()`)
   */
  mutationsReadByCollection = 0;

  /**
   * The number of mutations returned by the MutationQueue's
   * `getAllMutationBatchesAffectingDocumentKey()` and
   * `getAllMutationBatchesAffectingDocumentKeys()` APIs (since the last call
   * to `resetCounts()`)
   */
  mutationsReadByKey = 0;

  /**
   * The number of documents returned by the RemoteDocumentCache's
   * `getAll()` API (since the last call to `resetCounts()`)
   */
  documentsReadByCollection = 0;

  /**
   * The number of documents returned by the RemoteDocumentCache's `getEntry()`
   * and `getEntries()` APIs (since the last call to `resetCounts()`)
   */
  documentsReadByKey = 0;

  /**
   * The number of documents returned by the OverlayCache's `getOverlays()`
   * API (since the last call to `resetCounts()`)
   */
  overlaysReadByCollection = 0;

  /**
   * The number of documents returned by the OverlayCache's `getOverlay()`
   * APIs (since the last call to `resetCounts()`)
   */
  overlaysReadByKey = 0;

  resetCounts(): void {
    this.mutationsReadByCollection = 0;
    this.mutationsReadByKey = 0;
    this.documentsReadByCollection = 0;
    this.documentsReadByKey = 0;
    this.overlaysReadByCollection = 0;
    this.overlaysReadByKey = 0;
  }

  getDocumentsMatchingQuery(
    transaction: PersistenceTransaction,
    query: Query,
    lastLimboFreeSnapshotVersion: SnapshotVersion,
    remoteKeys: DocumentKeySet
  ): PersistencePromise<DocumentMap> {
    return super.getDocumentsMatchingQuery(
      transaction,
      query,
      lastLimboFreeSnapshotVersion,
      remoteKeys
    );
  }

  initialize(
    localDocuments: LocalDocumentsView,
    indexManager: IndexManager
  ): void {
    const view = new LocalDocumentsView(
      this.wrapRemoteDocumentCache(localDocuments.remoteDocumentCache),
      this.wrapMutationQueue(localDocuments.mutationQueue),
      this.wrapDocumentOverlayCache(localDocuments.documentOverlayCache),
      localDocuments.indexManager
    );
    return super.initialize(view, indexManager);
  }

  private wrapRemoteDocumentCache(
    subject: RemoteDocumentCache
  ): RemoteDocumentCache {
    return {
      setIndexManager: (indexManager: IndexManager) => {
        subject.setIndexManager(indexManager);
      },
      getAllFromCollection: (transaction, collection, sinceReadTime) => {
        return subject
          .getAllFromCollection(transaction, collection, sinceReadTime)
          .next(result => {
            this.documentsReadByCollection += result.size;
            return result;
          });
      },
      getAllFromCollectionGroup: (
        transaction,
        collectionGroup,
        sinceReadTime,
        limit
      ) => {
        return subject
          .getAllFromCollectionGroup(
            transaction,
            collectionGroup,
            sinceReadTime,
            limit
          )
          .next(result => {
            this.documentsReadByCollection += result.size;
            return result;
          });
      },
      getEntries: (transaction, documentKeys) => {
        return subject.getEntries(transaction, documentKeys).next(result => {
          result.forEach((key, doc) => {
            if (doc.isValidDocument()) {
              this.documentsReadByKey++;
            }
          });
          return result;
        });
      },
      getEntry: (transaction, documentKey) => {
        return subject.getEntry(transaction, documentKey).next(result => {
          this.documentsReadByKey += result?.isValidDocument() ? 1 : 0;
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
            this.mutationsReadByCollection += result.length;
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

  private wrapDocumentOverlayCache(
    subject: DocumentOverlayCache
  ): DocumentOverlayCache {
    return {
      getOverlay: (
        transaction: PersistenceTransaction,
        key: DocumentKey
      ): PersistencePromise<Overlay | null> => {
        this.overlaysReadByKey++;
        return subject.getOverlay(transaction, key);
      },
      getOverlays: (
        transaction: PersistenceTransaction,
        keys: DocumentKey[]
      ): PersistencePromise<OverlayMap> => {
        this.overlaysReadByKey += keys.length;
        return subject.getOverlays(transaction, keys);
      },
      getOverlaysForCollection: (
        transaction: PersistenceTransaction,
        collection: ResourcePath,
        sinceBatchId: number
      ): PersistencePromise<OverlayMap> => {
        return subject
          .getOverlaysForCollection(transaction, collection, sinceBatchId)
          .next(result => {
            this.overlaysReadByCollection += result.size();
            return result;
          });
      },
      getOverlaysForCollectionGroup: (
        transaction: PersistenceTransaction,
        collectionGroup: string,
        sinceBatchId: number,
        count: number
      ): PersistencePromise<OverlayMap> => {
        return subject
          .getOverlaysForCollectionGroup(
            transaction,
            collectionGroup,
            sinceBatchId,
            count
          )
          .next(result => {
            this.overlaysReadByCollection += result.size();
            return result;
          });
      },
      removeOverlaysForBatchId: subject.removeOverlaysForBatchId,
      saveOverlays: subject.saveOverlays
    };
  }
}
