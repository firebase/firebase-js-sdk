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
import { Timestamp } from '../lite-api/timestamp';
import {
  DocumentKeySet,
  OverlayMap,
  DocumentMap,
  MutableDocumentMap,
  newDocumentKeyMap,
  newMutationMap,
  newOverlayMap,
  documentMap,
  mutableDocumentMap,
  documentKeySet,
  DocumentKeyMap,
  convertOverlayedDocumentMapToDocumentMap,
  OverlayedDocumentMap,
  newOverlayedDocumentMap
} from '../model/collections';
import { Document, MutableDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { IndexOffset, INITIAL_LARGEST_BATCH_ID } from '../model/field_index';
import { FieldMask } from '../model/field_mask';
import {
  calculateOverlayMutation,
  mutationApplyToLocalView,
  PatchMutation
} from '../model/mutation';
import { Overlay } from '../model/overlay';
import { ResourcePath } from '../model/path';
import { debugAssert } from '../util/assert';
import { SortedMap } from '../util/sorted_map';

import { DocumentOverlayCache } from './document_overlay_cache';
import { IndexManager } from './index_manager';
import { LocalWriteResult } from './local_store_impl';
import { MutationQueue } from './mutation_queue';
import { OverlayedDocument } from './overlayed_document';
import { PersistencePromise } from './persistence_promise';
import { PersistenceTransaction } from './persistence_transaction';
import { QueryContext } from './query_context';
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
    readonly documentOverlayCache: DocumentOverlayCache,
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
    let overlay: Overlay | null = null;
    return this.documentOverlayCache
      .getOverlay(transaction, key)
      .next(value => {
        overlay = value;
        return this.remoteDocumentCache.getEntry(transaction, key);
      })
      .next(document => {
        if (overlay !== null) {
          mutationApplyToLocalView(
            overlay.mutation,
            document,
            FieldMask.empty(),
            Timestamp.now()
          );
        }
        return document as Document;
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
        this.getLocalViewOfDocuments(transaction, docs, documentKeySet()).next(
          () => docs as DocumentMap
        )
      );
  }

  /**
   * Similar to `getDocuments`, but creates the local view from the given
   * `baseDocs` without retrieving documents from the local store.
   *
   * @param transaction - The transaction this operation is scoped to.
   * @param docs - The documents to apply local mutations to get the local views.
   * @param existenceStateChanged - The set of document keys whose existence state
   *   is changed. This is useful to determine if some documents overlay needs
   *   to be recalculated.
   */
  getLocalViewOfDocuments(
    transaction: PersistenceTransaction,
    docs: MutableDocumentMap,
    existenceStateChanged: DocumentKeySet = documentKeySet()
  ): PersistencePromise<DocumentMap> {
    const overlays = newOverlayMap();
    return this.populateOverlays(transaction, overlays, docs).next(() => {
      return this.computeViews(
        transaction,
        docs,
        overlays,
        existenceStateChanged
      ).next(computeViewsResult => {
        let result = documentMap();
        computeViewsResult.forEach((documentKey, overlayedDocument) => {
          result = result.insert(
            documentKey,
            overlayedDocument.overlayedDocument
          );
        });
        return result;
      });
    });
  }

  /**
   * Gets the overlayed documents for the given document map, which will include
   * the local view of those documents and a `FieldMask` indicating which fields
   * are mutated locally, `null` if overlay is a Set or Delete mutation.
   */
  getOverlayedDocuments(
    transaction: PersistenceTransaction,
    docs: MutableDocumentMap
  ): PersistencePromise<OverlayedDocumentMap> {
    const overlays = newOverlayMap();
    return this.populateOverlays(transaction, overlays, docs).next(() =>
      this.computeViews(transaction, docs, overlays, documentKeySet())
    );
  }

  /**
   * Fetches the overlays for {@code docs} and adds them to provided overlay map
   * if the map does not already contain an entry for the given document key.
   */
  private populateOverlays(
    transaction: PersistenceTransaction,
    overlays: OverlayMap,
    docs: MutableDocumentMap
  ): PersistencePromise<void> {
    const missingOverlays: DocumentKey[] = [];
    docs.forEach(key => {
      if (!overlays.has(key)) {
        missingOverlays.push(key);
      }
    });
    return this.documentOverlayCache
      .getOverlays(transaction, missingOverlays)
      .next(result => {
        result.forEach((key, val) => {
          overlays.set(key, val);
        });
      });
  }

  /**
   * Computes the local view for the given documents.
   *
   * @param docs - The documents to compute views for. It also has the base
   *   version of the documents.
   * @param overlays - The overlays that need to be applied to the given base
   *   version of the documents.
   * @param existenceStateChanged - A set of documents whose existence states
   *   might have changed. This is used to determine if we need to re-calculate
   *   overlays from mutation queues.
   * @return A map represents the local documents view.
   */
  computeViews(
    transaction: PersistenceTransaction,
    docs: MutableDocumentMap,
    overlays: OverlayMap,
    existenceStateChanged: DocumentKeySet
  ): PersistencePromise<OverlayedDocumentMap> {
    let recalculateDocuments = mutableDocumentMap();
    const mutatedFields = newDocumentKeyMap<FieldMask | null>();
    const results = newOverlayedDocumentMap();
    docs.forEach((_, doc) => {
      const overlay = overlays.get(doc.key);
      // Recalculate an overlay if the document's existence state changed due to
      // a remote event *and* the overlay is a PatchMutation. This is because
      // document existence state can change if some patch mutation's
      // preconditions are met.
      // NOTE: we recalculate when `overlay` is undefined as well, because there
      // might be a patch mutation whose precondition does not match before the
      // change (hence overlay is undefined), but would now match.
      if (
        existenceStateChanged.has(doc.key) &&
        (overlay === undefined || overlay.mutation instanceof PatchMutation)
      ) {
        recalculateDocuments = recalculateDocuments.insert(doc.key, doc);
      } else if (overlay !== undefined) {
        mutatedFields.set(doc.key, overlay.mutation.getFieldMask());
        mutationApplyToLocalView(
          overlay.mutation,
          doc,
          overlay.mutation.getFieldMask(),
          Timestamp.now()
        );
      } else {
        // no overlay exists
        // Using EMPTY to indicate there is no overlay for the document.
        mutatedFields.set(doc.key, FieldMask.empty());
      }
    });

    return this.recalculateAndSaveOverlays(
      transaction,
      recalculateDocuments
    ).next(recalculatedFields => {
      recalculatedFields.forEach((documentKey, mask) =>
        mutatedFields.set(documentKey, mask)
      );
      docs.forEach((documentKey, document) =>
        results.set(
          documentKey,
          new OverlayedDocument(
            document,
            mutatedFields.get(documentKey) ?? null
          )
        )
      );
      return results;
    });
  }

  private recalculateAndSaveOverlays(
    transaction: PersistenceTransaction,
    docs: MutableDocumentMap
  ): PersistencePromise<DocumentKeyMap<FieldMask | null>> {
    const masks = newDocumentKeyMap<FieldMask | null>();
    // A reverse lookup map from batch id to the documents within that batch.
    let documentsByBatchId = new SortedMap<number, DocumentKeySet>(
      (key1: number, key2: number) => key1 - key2
    );
    let processed = documentKeySet();
    return this.mutationQueue
      .getAllMutationBatchesAffectingDocumentKeys(transaction, docs)
      .next(batches => {
        for (const batch of batches) {
          batch.keys().forEach(key => {
            const baseDoc = docs.get(key);
            if (baseDoc === null) {
              return;
            }
            let mask: FieldMask | null = masks.get(key) || FieldMask.empty();
            mask = batch.applyToLocalView(baseDoc, mask);
            masks.set(key, mask);
            const newSet = (
              documentsByBatchId.get(batch.batchId) || documentKeySet()
            ).add(key);
            documentsByBatchId = documentsByBatchId.insert(
              batch.batchId,
              newSet
            );
          });
        }
      })
      .next(() => {
        const promises: Array<PersistencePromise<void>> = [];
        // Iterate in descending order of batch IDs, and skip documents that are
        // already saved.
        const iter = documentsByBatchId.getReverseIterator();
        while (iter.hasNext()) {
          const entry = iter.getNext();
          const batchId = entry.key;
          const keys = entry.value;
          const overlays = newMutationMap();
          keys.forEach(key => {
            if (!processed.has(key)) {
              const overlayMutation = calculateOverlayMutation(
                docs.get(key)!,
                masks.get(key)!
              );
              if (overlayMutation !== null) {
                overlays.set(key, overlayMutation);
              }
              processed = processed.add(key);
            }
          });
          promises.push(
            this.documentOverlayCache.saveOverlays(
              transaction,
              batchId,
              overlays
            )
          );
        }
        return PersistencePromise.waitFor(promises);
      })
      .next(() => masks);
  }

  /**
   * Recalculates overlays by reading the documents from remote document cache
   * first, and saves them after they are calculated.
   */
  recalculateAndSaveOverlaysForDocumentKeys(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<DocumentKeyMap<FieldMask | null>> {
    return this.remoteDocumentCache
      .getEntries(transaction, documentKeys)
      .next(docs => this.recalculateAndSaveOverlays(transaction, docs));
  }

  /**
   * Performs a query against the local view of all documents.
   *
   * @param transaction - The persistence transaction.
   * @param query - The query to match documents against.
   * @param offset - Read time and key to start scanning by (exclusive).
   * @param context - A optional tracker to keep a record of important details
   *   during database local query execution.
   */
  getDocumentsMatchingQuery(
    transaction: PersistenceTransaction,
    query: Query,
    offset: IndexOffset,
    context?: QueryContext
  ): PersistencePromise<DocumentMap> {
    if (isDocumentQuery(query)) {
      return this.getDocumentsMatchingDocumentQuery(transaction, query.path);
    } else if (isCollectionGroupQuery(query)) {
      return this.getDocumentsMatchingCollectionGroupQuery(
        transaction,
        query,
        offset,
        context
      );
    } else {
      return this.getDocumentsMatchingCollectionQuery(
        transaction,
        query,
        offset,
        context
      );
    }
  }

  /**
   * Given a collection group, returns the next documents that follow the provided offset, along
   * with an updated batch ID.
   *
   * <p>The documents returned by this method are ordered by remote version from the provided
   * offset. If there are no more remote documents after the provided offset, documents with
   * mutations in order of batch id from the offset are returned. Since all documents in a batch are
   * returned together, the total number of documents returned can exceed {@code count}.
   *
   * @param transaction
   * @param collectionGroup The collection group for the documents.
   * @param offset The offset to index into.
   * @param count The number of documents to return
   * @return A LocalWriteResult with the documents that follow the provided offset and the last processed batch id.
   */
  getNextDocuments(
    transaction: PersistenceTransaction,
    collectionGroup: string,
    offset: IndexOffset,
    count: number
  ): PersistencePromise<LocalWriteResult> {
    return this.remoteDocumentCache
      .getAllFromCollectionGroup(transaction, collectionGroup, offset, count)
      .next((originalDocs: MutableDocumentMap) => {
        const overlaysPromise: PersistencePromise<OverlayMap> =
          count - originalDocs.size > 0
            ? this.documentOverlayCache.getOverlaysForCollectionGroup(
                transaction,
                collectionGroup,
                offset.largestBatchId,
                count - originalDocs.size
              )
            : PersistencePromise.resolve(newOverlayMap());
        // The callsite will use the largest batch ID together with the latest read time to create
        // a new index offset. Since we only process batch IDs if all remote documents have been read,
        // no overlay will increase the overall read time. This is why we only need to special case
        // the batch id.
        let largestBatchId = INITIAL_LARGEST_BATCH_ID;
        let modifiedDocs = originalDocs;
        return overlaysPromise.next(overlays => {
          return PersistencePromise.forEach(
            overlays,
            (key: DocumentKey, overlay: Overlay) => {
              if (largestBatchId < overlay.largestBatchId) {
                largestBatchId = overlay.largestBatchId;
              }
              if (originalDocs.get(key)) {
                return PersistencePromise.resolve();
              }
              return this.remoteDocumentCache
                .getEntry(transaction, key)
                .next(doc => {
                  modifiedDocs = modifiedDocs.insert(key, doc);
                });
            }
          )
            .next(() =>
              this.populateOverlays(transaction, overlays, originalDocs)
            )
            .next(() =>
              this.computeViews(
                transaction,
                modifiedDocs,
                overlays,
                documentKeySet()
              )
            )
            .next(localDocs => ({
              batchId: largestBatchId,
              changes: convertOverlayedDocumentMapToDocumentMap(localDocs)
            }));
        });
      });
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
    offset: IndexOffset,
    context?: QueryContext
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
            offset,
            context
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
    offset: IndexOffset,
    context?: QueryContext
  ): PersistencePromise<DocumentMap> {
    // Query the remote documents and overlay mutations.
    let overlays: OverlayMap;
    return this.documentOverlayCache
      .getOverlaysForCollection(transaction, query.path, offset.largestBatchId)
      .next(result => {
        overlays = result;
        return this.remoteDocumentCache.getDocumentsMatchingQuery(
          transaction,
          query,
          offset,
          overlays,
          context
        );
      })
      .next(remoteDocuments => {
        // As documents might match the query because of their overlay we need to
        // include documents for all overlays in the initial document set.
        overlays.forEach((_, overlay) => {
          const key = overlay.getKey();
          if (remoteDocuments.get(key) === null) {
            remoteDocuments = remoteDocuments.insert(
              key,
              MutableDocument.newInvalidDocument(key)
            );
          }
        });

        // Apply the overlays and match against the query.
        let results = documentMap();
        remoteDocuments.forEach((key, document) => {
          const overlay = overlays.get(key);
          if (overlay !== undefined) {
            mutationApplyToLocalView(
              overlay.mutation,
              document,
              FieldMask.empty(),
              Timestamp.now()
            );
          }
          // Finally, insert the documents that still match the query
          if (queryMatches(query, document)) {
            results = results.insert(key, document);
          }
        });
        return results;
      });
  }
}
