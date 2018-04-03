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
  documentKeySet,
  DocumentKeySet,
  DocumentMap,
  documentMap,
  MaybeDocumentMap,
  maybeDocumentMap
} from '../model/collections';
import { Document, MaybeDocument, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { ResourcePath } from '../model/path';
import { fail } from '../util/assert';

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
    return this.remoteDocumentCache
      .getEntry(transaction, key)
      .next(remoteDoc => {
        return this.computeLocalDocument(transaction, key, remoteDoc);
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
    const promises = [] as Array<PersistencePromise<void>>;
    let results = maybeDocumentMap();
    keys.forEach(key => {
      promises.push(
        this.getDocument(transaction, key).next(maybeDoc => {
          // TODO(http://b/32275378): Don't conflate missing / deleted.
          if (!maybeDoc) {
            maybeDoc = new NoDocument(key, SnapshotVersion.forDeletedDoc());
          }
          results = results.insert(key, maybeDoc);
        })
      );
    });
    return PersistencePromise.waitFor(promises).next(() => results);
  }

  /**
   * Performs a query against the local view of all documents.
   *
   * Multi-Tab Note: This operation is safe to use from secondary clients.
   */
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
    // TODO(mikelehen): There may be significant overlap between the mutations
    // affecting these remote documents and the
    // getAllMutationBatchesAffectingQuery() mutations. Consider optimizing.
    let results: DocumentMap;
    return this.remoteDocumentCache
      .getDocumentsMatchingQuery(transaction, query)
      .next(queryResults => {
        return this.computeLocalDocuments(transaction, queryResults);
      })
      .next(promisedResults => {
        results = promisedResults;
        // Now use the mutation queue to discover any other documents that may
        // match the query after applying mutations.
        return this.mutationQueue.getAllMutationBatchesAffectingQuery(
          transaction,
          query
        );
      })
      .next(matchingMutationBatches => {
        let matchingKeys = documentKeySet();
        for (const batch of matchingMutationBatches) {
          for (const mutation of batch.mutations) {
            // TODO(mikelehen): PERF: Check if this mutation actually
            // affects the query to reduce work.
            if (!results.get(mutation.key)) {
              matchingKeys = matchingKeys.add(mutation.key);
            }
          }
        }

        // Now add in the results for the matchingKeys.
        const promises = [] as Array<PersistencePromise<void>>;
        matchingKeys.forEach(key => {
          promises.push(
            this.getDocument(transaction, key).next(doc => {
              if (doc instanceof Document) {
                results = results.insert(doc.key, doc);
              }
            })
          );
        });
        return PersistencePromise.waitFor(promises);
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

  /**
   * Takes a remote document and applies local mutations to generate the local
   * view of the document.
   * @param transaction The transaction in which to perform any persistence
   *     operations.
   * @param documentKey The key of the document (necessary when remoteDocument
   *     is null).
   * @param document The base remote document to apply mutations to or null.
   */
  private computeLocalDocument(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey,
    document: MaybeDocument | null
  ): PersistencePromise<MaybeDocument | null> {
    return this.mutationQueue
      .getAllMutationBatchesAffectingDocumentKey(transaction, documentKey)
      .next(batches => {
        for (const batch of batches) {
          document = batch.applyToLocalView(documentKey, document);
        }
        return document;
      });
  }

  /**
   * Takes a set of remote documents and applies local mutations to generate the
   * local view of the documents.
   * @param transaction The transaction in which to perform any persistence
   *     operations.
   * @param documents The base remote documents to apply mutations to.
   * @return The local view of the documents.
   */
  private computeLocalDocuments(
    transaction: PersistenceTransaction,
    documents: DocumentMap
  ): PersistencePromise<DocumentMap> {
    const promises = [] as Array<PersistencePromise<void>>;
    documents.forEach((key, doc) => {
      promises.push(
        this.computeLocalDocument(transaction, key, doc).next(mutatedDoc => {
          if (mutatedDoc instanceof Document) {
            documents = documents.insert(mutatedDoc.key, mutatedDoc);
          } else if (mutatedDoc instanceof NoDocument) {
            documents = documents.remove(mutatedDoc.key);
          } else {
            fail('Unknown MaybeDocument: ' + mutatedDoc);
          }
        })
      );
    });
    return PersistencePromise.waitFor(promises).next(() => documents);
  }
}
