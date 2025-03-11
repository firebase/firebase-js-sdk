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
import { PersistencePromise } from '../../../src/local/persistence_promise';
import { PersistenceTransaction } from '../../../src/local/persistence_transaction';
import { QueryEngine } from '../../../src/local/query_engine';
import { RemoteDocumentCache } from '../../../src/local/remote_document_cache';
import {
  DocumentKeySet,
  DocumentMap,
  MutableDocumentMap,
  OverlayMap
} from '../../../src/model/collections';
import { MutationType } from '../../../src/model/mutation';
import { doc, key, keys } from '../../util/helpers';

/**
 * A test-only query engine that forwards all API calls and exposes the number
 * of documents and mutations read.
 */
export class CountingQueryEngine extends QueryEngine {
  /**
   * The number of overlays returned by the DocumentOverlayCache's
   * `getOverlaysByCollection(Group)` API (since the last call to
   * `resetCounts()`)
   */
  overlaysReadByCollection = 0;

  /**
   * The number of overlays returned by the DocumentOverlayCache's
   * `getOverlay(s)` APIs (since the last call to `resetCounts()`)
   */
  overlaysReadByKey = 0;

  overlayTypes: { [k: string]: MutationType } = {};

  /**
   * The number of documents returned by the RemoteDocumentCache's
   * `getAll()` API (since the last call to `resetCounts()`).
   */
  documentsReadByCollection = 0;

  /**
   * The number of documents returned by the RemoteDocumentCache's `getEntry()`
   * and `getEntries()` APIs (since the last call to `resetCounts()`)
   */
  documentsReadByKey = 0;

  resetCounts(): void {
    this.overlaysReadByCollection = 0;
    this.overlaysReadByKey = 0;
    this.overlayTypes = {};
    this.documentsReadByCollection = 0;
    this.documentsReadByKey = 0;
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
      localDocuments.mutationQueue,
      this.wrapOverlayCache(localDocuments.documentOverlayCache),
      localDocuments.indexManager
    );
    return super.initialize(view, indexManager);
  }

  private wrapRemoteDocumentCache(
    subject: RemoteDocumentCache
  ): RemoteDocumentCache {
    return {
      getAllEntries(
        transaction: PersistenceTransaction
      ): PersistencePromise<MutableDocumentMap> {
        return subject.getAllEntries(transaction);
      },
      setIndexManager: (indexManager: IndexManager) => {
        subject.setIndexManager(indexManager);
      },
      getDocumentsMatchingQuery: (
        transaction,
        query,
        sinceReadTime,
        overlays,
        context
      ) => {
        return subject
          .getDocumentsMatchingQuery(
            transaction,
            query,
            sinceReadTime,
            overlays,
            context
          )
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

  private wrapOverlayCache(
    subject: DocumentOverlayCache
  ): DocumentOverlayCache {
    return {
      getAllOverlays(
        transaction: PersistenceTransaction,
        sinceBatchId: number
      ): PersistencePromise<OverlayMap> {
        return subject.getAllOverlays(transaction, sinceBatchId);
      },
      getOverlay: (transaction, key) => {
        return subject.getOverlay(transaction, key).next(result => {
          this.overlaysReadByKey += 1;
          if (!!result) {
            this.overlayTypes[key.toString()] = result.mutation.type;
          }
          return result;
        });
      },

      getOverlays: (transaction, keys) => {
        return subject.getOverlays(transaction, keys).next(result => {
          this.overlaysReadByKey += keys.length;
          result.forEach((key, overlay) => {
            this.overlayTypes[key.toString()] = overlay.mutation.type;
          });
          return result;
        });
      },

      getOverlaysForCollection: (transaction, collection, sinceBatchId) => {
        return subject
          .getOverlaysForCollection(transaction, collection, sinceBatchId)
          .next(result => {
            this.overlaysReadByCollection += result.size();
            result.forEach((key, overlay) => {
              this.overlayTypes[key.toString()] = overlay.mutation.type;
            });
            return result;
          });
      },

      getOverlaysForCollectionGroup: (
        transaction: PersistenceTransaction,
        collectionGroup: string,
        sinceBatchId: number,
        count: number
      ) => {
        return subject
          .getOverlaysForCollectionGroup(
            transaction,
            collectionGroup,
            sinceBatchId,
            count
          )
          .next(result => {
            this.overlaysReadByCollection += result.size();
            result.forEach((key, overlay) => {
              this.overlayTypes[key.toString()] = overlay.mutation.type;
            });
            return result;
          });
      },

      saveOverlays: (transaction, largestBatchId, overlays) => {
        return subject.saveOverlays(transaction, largestBatchId, overlays);
      },

      removeOverlaysForBatchId: (transaction, documentKeys, batchId) => {
        return subject.removeOverlaysForBatchId(
          transaction,
          documentKeys,
          batchId
        );
      }
    };
  }
}
