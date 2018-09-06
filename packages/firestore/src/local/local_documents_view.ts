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

import { Query } from '../core/query';
import { SnapshotVersion } from '../core/snapshot_version';
import {
  DocumentKeySet,
  DocumentMap,
  documentMap,
  MaybeDocumentMap,
  maybeDocumentMap
} from '../model/collections';
import { Document, MaybeDocument, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { MutationBatch } from '../model/mutation_batch';
import { ResourcePath } from '../model/path';

import { MutationQueue } from './mutation_queue';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { RemoteDocumentCache } from './remote_document_cache';

/**
 * A readonly view of the local state of all documents we're tracking (i.e. we
 * have a cached version in remoteDocumentCache or local mutations for the
 * document). The view is computed by applying the mutations in the
 * MutationQueue to the RemoteDocumentCache.
 */
export class LocalDocumentsView {
  constructor(
    private remoteDocumentCache: RemoteDocumentCache,
    private mutationQueue: MutationQueue
  ) {}

  /**
   * Get the local view of the document identified by `key`.
   *
   * @return Local view of the document or null if we don't have any cached
   * state for it.
   */
  getDocument(
    transaction: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<MaybeDocument | null> {
    return this.mutationQueue
      .getAllMutationBatchesAffectingDocumentKey(transaction, key)
      .next(batches => this.getDocumentInternal(transaction, key, batches));
  }

  /** Internal version of `getDocument` that allows reusing batches. */
  private getDocumentInternal(
    transaction: PersistenceTransaction,
    key: DocumentKey,
    inBatches: MutationBatch[]
  ): PersistencePromise<MaybeDocument | null> {
    return this.remoteDocumentCache.getEntry(transaction, key).next(doc => {
      for (const batch of inBatches) {
        doc = batch.applyToLocalView(key, doc);
      }
      return doc;
    });
  }

  /**
   * Gets the local view of the documents identified by `keys`.
   *
   * If we don't have cached state for a document in `keys`, a NoDocument will
   * be stored for that key in the resulting set.
   */
  getDocuments(
    transaction: PersistenceTransaction,
    keys: DocumentKeySet
  ): PersistencePromise<MaybeDocumentMap> {
    return this.mutationQueue
      .getAllMutationBatchesAffectingDocumentKeys(transaction, keys)
      .next(batches => {
        const promises = [] as Array<PersistencePromise<void>>;
        let results = maybeDocumentMap();
        keys.forEach(key => {
          promises.push(
            this.getDocumentInternal(transaction, key, batches).next(
              maybeDoc => {
                // TODO(http://b/32275378): Don't conflate missing / deleted.
                if (!maybeDoc) {
                  maybeDoc = new NoDocument(
                    key,
                    SnapshotVersion.forDeletedDoc()
                  );
                }
                results = results.insert(key, maybeDoc);
              }
            )
          );
        });
        return PersistencePromise.waitFor(promises).next(() => results);
      });
  }

  /** Performs a query against the local view of all documents. */
  getDocumentsMatchingQuery(
    transaction: PersistenceTransaction,
    query: Query
  ): PersistencePromise<DocumentMap> {
    if (DocumentKey.isDocumentKey(query.path)) {
      return this.getDocumentsMatchingDocumentQuery(transaction, query.path);
    } else {
      return this.getDocumentsMatchingCollectionQuery(transaction, query);
    }
  }

  private getDocumentsMatchingDocumentQuery(
    transaction: PersistenceTransaction,
    docPath: ResourcePath
  ): PersistencePromise<DocumentMap> {
    // Just do a simple document lookup.
    return this.getDocument(transaction, new DocumentKey(docPath)).next(
      maybeDoc => {
        let result = documentMap();
        if (maybeDoc instanceof Document) {
          result = result.insert(maybeDoc.key, maybeDoc);
        }
        return result;
      }
    );
  }

  private getDocumentsMatchingCollectionQuery(
    transaction: PersistenceTransaction,
    query: Query
  ): PersistencePromise<DocumentMap> {
    // Query the remote documents and overlay mutations.
    let results: DocumentMap;
    return this.remoteDocumentCache
      .getDocumentsMatchingQuery(transaction, query)
      .next(queryResults => {
        results = queryResults;
        return this.mutationQueue.getAllMutationBatchesAffectingQuery(
          transaction,
          query
        );
      })
      .next(matchingMutationBatches => {
        for (const batch of matchingMutationBatches) {
          for (const mutation of batch.mutations) {
            const key = mutation.key;
            // Only process documents belonging to the collection.
            if (!query.path.isImmediateParentOf(key.path)) {
              continue;
            }

            const baseDoc = results.get(key);
            const mutatedDoc = mutation.applyToLocalView(
              baseDoc,
              baseDoc,
              batch.localWriteTime
            );
            if (mutatedDoc instanceof Document) {
              results = results.insert(key, mutatedDoc);
            } else {
              results = results.remove(key);
            }
          }
        }
      })
      .next(() => {
        // Finally, filter out any documents that don't actually match
        // the query.
        results.forEach((key, doc) => {
          if (!query.matches(doc)) {
            results = results.remove(key);
          }
        });

        return results;
      });
  }
}
