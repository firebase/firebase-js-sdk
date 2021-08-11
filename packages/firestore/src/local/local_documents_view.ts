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

import {
  asCollectionQueryAtPath,
  isCollectionGroupQuery,
  isDocumentQuery,
  Query,
  queryMatches
} from '../core/query';
import { SnapshotVersion } from '../core/snapshot_version';
import {
  DocumentKeySet,
  documentKeySet,
  DocumentMap,
  documentMap,
  MutableDocumentMap
} from '../model/collections';
import { Document, MutableDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { applyMutationToLocalView, PatchMutation } from '../model/mutation';
import { MutationBatch } from '../model/mutation_batch';
import { ResourcePath } from '../model/path';
import { debugAssert } from '../util/assert';

import { IndexManager } from './index_manager';
import { MutationQueue } from './mutation_queue';
import { PersistencePromise } from './persistence_promise';
import { PersistenceTransaction } from './persistence_transaction';
import { RemoteDocumentCache } from './remote_document_cache';

/**
 * A readonly view of the local state of all documents we're tracking (i.e. we
 * have a cached version in remoteDocumentCache or local mutations for the
 * document). The view is computed by applying the mutations in the
 * MutationQueue to the RemoteDocumentCache.
 */
export class LocalDocumentsView {
  constructor(
    readonly remoteDocumentCache: RemoteDocumentCache,
    readonly mutationQueue: MutationQueue,
    readonly indexManager: IndexManager
  ) {}

  /**
   * Get the local view of the document identified by `key`.
   *
   * @returns Local view of the document or null if we don't have any cached
   * state for it.
   */
  getDocument(
    transaction: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<Document> {
    return this.mutationQueue
      .getAllMutationBatchesAffectingDocumentKey(transaction, key)
      .next(batches => this.getDocumentInternal(transaction, key, batches));
  }

  /** Internal version of `getDocument` that allows reusing batches. */
  private getDocumentInternal(
    transaction: PersistenceTransaction,
    key: DocumentKey,
    inBatches: MutationBatch[]
  ): PersistencePromise<Document> {
    return this.remoteDocumentCache.getEntry(transaction, key).next(doc => {
      for (const batch of inBatches) {
        batch.applyToLocalView(doc);
      }
      return doc as Document;
    });
  }

  // Returns the view of the given `docs` as they would appear after applying
  // all mutations in the given `batches`.
  private applyLocalMutationsToDocuments(
    docs: MutableDocumentMap,
    batches: MutationBatch[]
  ): void {
    docs.forEach((key, localView) => {
      for (const batch of batches) {
        batch.applyToLocalView(localView);
      }
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
  ): PersistencePromise<DocumentMap> {
    return this.remoteDocumentCache
      .getEntries(transaction, keys)
      .next(docs =>
        this.applyLocalViewToDocuments(transaction, docs).next(
          () => docs as DocumentMap
        )
      );
  }

  /**
   * Applies the local view the given `baseDocs` without retrieving documents
   * from the local store.
   */
  applyLocalViewToDocuments(
    transaction: PersistenceTransaction,
    baseDocs: MutableDocumentMap
  ): PersistencePromise<void> {
    return this.mutationQueue
      .getAllMutationBatchesAffectingDocumentKeys(transaction, baseDocs)
      .next(batches => this.applyLocalMutationsToDocuments(baseDocs, batches));
  }

  /**
   * Performs a query against the local view of all documents.
   *
   * @param transaction - The persistence transaction.
   * @param query - The query to match documents against.
   * @param sinceReadTime - If not set to SnapshotVersion.min(), return only
   *     documents that have been read since this snapshot version (exclusive).
   */
  getDocumentsMatchingQuery(
    transaction: PersistenceTransaction,
    query: Query,
    sinceReadTime: SnapshotVersion
  ): PersistencePromise<DocumentMap> {
    if (isDocumentQuery(query)) {
      return this.getDocumentsMatchingDocumentQuery(transaction, query.path);
    } else if (isCollectionGroupQuery(query)) {
      return this.getDocumentsMatchingCollectionGroupQuery(
        transaction,
        query,
        sinceReadTime
      );
    } else {
      return this.getDocumentsMatchingCollectionQuery(
        transaction,
        query,
        sinceReadTime
      );
    }
  }

  private getDocumentsMatchingDocumentQuery(
    transaction: PersistenceTransaction,
    docPath: ResourcePath
  ): PersistencePromise<DocumentMap> {
    // Just do a simple document lookup.
    return this.getDocument(transaction, new DocumentKey(docPath)).next(
      document => {
        let result = documentMap();
        if (document.isFoundDocument()) {
          result = result.insert(document.key, document);
        }
        return result;
      }
    );
  }

  private getDocumentsMatchingCollectionGroupQuery(
    transaction: PersistenceTransaction,
    query: Query,
    sinceReadTime: SnapshotVersion
  ): PersistencePromise<DocumentMap> {
    debugAssert(
      query.path.isEmpty(),
      'Currently we only support collection group queries at the root.'
    );
    const collectionId = query.collectionGroup!;
    let results = documentMap();
    return this.indexManager
      .getCollectionParents(transaction, collectionId)
      .next(parents => {
        // Perform a collection query against each parent that contains the
        // collectionId and aggregate the results.
        return PersistencePromise.forEach(parents, (parent: ResourcePath) => {
          const collectionQuery = asCollectionQueryAtPath(
            query,
            parent.child(collectionId)
          );
          return this.getDocumentsMatchingCollectionQuery(
            transaction,
            collectionQuery,
            sinceReadTime
          ).next(r => {
            r.forEach((key, doc) => {
              results = results.insert(key, doc);
            });
          });
        }).next(() => results);
      });
  }

  private getDocumentsMatchingCollectionQuery(
    transaction: PersistenceTransaction,
    query: Query,
    sinceReadTime: SnapshotVersion
  ): PersistencePromise<DocumentMap> {
    // Query the remote documents and overlay mutations.
    let results: MutableDocumentMap;
    let mutationBatches: MutationBatch[];
    return this.remoteDocumentCache
      .getDocumentsMatchingQuery(transaction, query, sinceReadTime)
      .next(queryResults => {
        results = queryResults;
        return this.mutationQueue.getAllMutationBatchesAffectingQuery(
          transaction,
          query
        );
      })
      .next(matchingMutationBatches => {
        mutationBatches = matchingMutationBatches;
        // It is possible that a PatchMutation can make a document match a query, even if
        // the version in the RemoteDocumentCache is not a match yet (waiting for server
        // to ack). To handle this, we find all document keys affected by the PatchMutations
        // that are not in `result` yet, and back fill them via `remoteDocumentCache.getEntries`,
        // otherwise those `PatchMutations` will be ignored because no base document can be found,
        // and lead to missing result for the query.
        return this.addMissingBaseDocuments(
          transaction,
          mutationBatches,
          results
        ).next(mergedDocuments => {
          results = mergedDocuments;

          for (const batch of mutationBatches) {
            for (const mutation of batch.mutations) {
              const key = mutation.key;
              let document = results.get(key);
              if (document == null) {
                // Create invalid document to apply mutations on top of
                document = MutableDocument.newInvalidDocument(key);
                results = results.insert(key, document);
              }
              applyMutationToLocalView(
                mutation,
                document,
                batch.localWriteTime
              );
              if (!document.isFoundDocument()) {
                results = results.remove(key);
              }
            }
          }
        });
      })
      .next(() => {
        // Finally, filter out any documents that don't actually match
        // the query.
        results.forEach((key, doc) => {
          if (!queryMatches(query, doc)) {
            results = results.remove(key);
          }
        });

        return results as DocumentMap;
      });
  }

  private addMissingBaseDocuments(
    transaction: PersistenceTransaction,
    matchingMutationBatches: MutationBatch[],
    existingDocuments: MutableDocumentMap
  ): PersistencePromise<MutableDocumentMap> {
    let missingBaseDocEntriesForPatching = documentKeySet();
    for (const batch of matchingMutationBatches) {
      for (const mutation of batch.mutations) {
        if (
          mutation instanceof PatchMutation &&
          existingDocuments.get(mutation.key) === null
        ) {
          missingBaseDocEntriesForPatching =
            missingBaseDocEntriesForPatching.add(mutation.key);
        }
      }
    }

    let mergedDocuments = existingDocuments;
    return this.remoteDocumentCache
      .getEntries(transaction, missingBaseDocEntriesForPatching)
      .next(missingBaseDocs => {
        missingBaseDocs.forEach((key, doc) => {
          if (doc.isFoundDocument()) {
            mergedDocuments = mergedDocuments.insert(key, doc);
          }
        });
        return mergedDocuments;
      });
  }
}
