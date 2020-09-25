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

import { isCollectionGroupQuery, Query, queryMatches } from '../core/query';
import {
  DocumentKeySet,
  DocumentMap,
  documentMap,
  DocumentSizeEntries,
  DocumentSizeEntry,
  MaybeDocumentMap,
  maybeDocumentMap,
  nullableMaybeDocumentMap,
  NullableMaybeDocumentMap
} from '../model/collections';
import { Document, MaybeDocument, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { ResourcePath } from '../model/path';
import { primitiveComparator } from '../util/misc';
import { SortedMap } from '../util/sorted_map';
import { SortedSet } from '../util/sorted_set';

import { SnapshotVersion } from '../core/snapshot_version';
import { debugAssert, fail, hardAssert } from '../util/assert';
import { IndexManager } from './index_manager';
import { IndexedDbPersistence } from './indexeddb_persistence';
import {
  DbRemoteDocument,
  DbRemoteDocumentGlobal,
  DbRemoteDocumentGlobalKey,
  DbRemoteDocumentKey
} from './indexeddb_schema';
import {
  fromDbRemoteDocument,
  fromDbTimestampKey,
  LocalSerializer,
  toDbRemoteDocument,
  toDbTimestampKey
} from './local_serializer';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { RemoteDocumentCache } from './remote_document_cache';
import { RemoteDocumentChangeBuffer } from './remote_document_change_buffer';
import { IterateOptions, SimpleDbStore } from './simple_db';
import { ObjectMap } from '../util/obj_map';

export class IndexedDbRemoteDocumentCache implements RemoteDocumentCache {
  /**
   * @param {LocalSerializer} serializer The document serializer.
   * @param {IndexManager} indexManager The query indexes that need to be maintained.
   */
  constructor(
    readonly serializer: LocalSerializer,
    private readonly indexManager: IndexManager
  ) {}

  /**
   * Adds the supplied entries to the cache.
   *
   * All calls of `addEntry` are required to go through the RemoteDocumentChangeBuffer
   * returned by `newChangeBuffer()` to ensure proper accounting of metadata.
   */
  private addEntry(
    transaction: PersistenceTransaction,
    key: DocumentKey,
    doc: DbRemoteDocument
  ): PersistencePromise<void> {
    const documentStore = remoteDocumentsStore(transaction);
    return documentStore.put(dbKey(key), doc);
  }

  /**
   * Removes a document from the cache.
   *
   * All calls of `removeEntry`  are required to go through the RemoteDocumentChangeBuffer
   * returned by `newChangeBuffer()` to ensure proper accounting of metadata.
   */
  private removeEntry(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<void> {
    const store = remoteDocumentsStore(transaction);
    const key = dbKey(documentKey);
    return store.delete(key);
  }

  /**
   * Updates the current cache size.
   *
   * Callers to `addEntry()` and `removeEntry()` *must* call this afterwards to update the
   * cache's metadata.
   */
  private updateMetadata(
    transaction: PersistenceTransaction,
    sizeDelta: number
  ): PersistencePromise<void> {
    return this.getMetadata(transaction).next(metadata => {
      metadata.byteSize += sizeDelta;
      return this.setMetadata(transaction, metadata);
    });
  }

  getEntry(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<MaybeDocument | null> {
    return remoteDocumentsStore(transaction)
      .get(dbKey(documentKey))
      .next(dbRemoteDoc => {
        return this.maybeDecodeDocument(dbRemoteDoc);
      });
  }

  /**
   * Looks up an entry in the cache.
   *
   * @param documentKey The key of the entry to look up.
   * @return The cached MaybeDocument entry and its size, or null if we have nothing cached.
   */
  getSizedEntry(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<DocumentSizeEntry | null> {
    return remoteDocumentsStore(transaction)
      .get(dbKey(documentKey))
      .next(dbRemoteDoc => {
        const doc = this.maybeDecodeDocument(dbRemoteDoc);
        return doc
          ? {
              maybeDocument: doc,
              size: dbDocumentSize(dbRemoteDoc!)
            }
          : null;
      });
  }

  getEntries(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<NullableMaybeDocumentMap> {
    let results = nullableMaybeDocumentMap();
    return this.forEachDbEntry(
      transaction,
      documentKeys,
      (key, dbRemoteDoc) => {
        const doc = this.maybeDecodeDocument(dbRemoteDoc);
        results = results.insert(key, doc);
      }
    ).next(() => results);
  }

  /**
   * Looks up several entries in the cache.
   *
   * @param documentKeys The set of keys entries to look up.
   * @return A map of MaybeDocuments indexed by key (if a document cannot be
   *     found, the key will be mapped to null) and a map of sizes indexed by
   *     key (zero if the key cannot be found).
   */
  getSizedEntries(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<DocumentSizeEntries> {
    let results = nullableMaybeDocumentMap();
    let sizeMap = new SortedMap<DocumentKey, number>(DocumentKey.comparator);
    return this.forEachDbEntry(
      transaction,
      documentKeys,
      (key, dbRemoteDoc) => {
        const doc = this.maybeDecodeDocument(dbRemoteDoc);
        if (doc) {
          results = results.insert(key, doc);
          sizeMap = sizeMap.insert(key, dbDocumentSize(dbRemoteDoc!));
        } else {
          results = results.insert(key, null);
          sizeMap = sizeMap.insert(key, 0);
        }
      }
    ).next(() => {
      return { maybeDocuments: results, sizeMap };
    });
  }

  private forEachDbEntry(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet,
    callback: (key: DocumentKey, doc: DbRemoteDocument | null) => void
  ): PersistencePromise<void> {
    if (documentKeys.isEmpty()) {
      return PersistencePromise.resolve();
    }

    const range = IDBKeyRange.bound(
      documentKeys.first()!.path.toArray(),
      documentKeys.last()!.path.toArray()
    );
    const keyIter = documentKeys.getIterator();
    let nextKey: DocumentKey | null = keyIter.getNext();

    return remoteDocumentsStore(transaction)
      .iterate({ range }, (potentialKeyRaw, dbRemoteDoc, control) => {
        const potentialKey = DocumentKey.fromSegments(potentialKeyRaw);

        // Go through keys not found in cache.
        while (nextKey && DocumentKey.comparator(nextKey!, potentialKey) < 0) {
          callback(nextKey!, null);
          nextKey = keyIter.getNext();
        }

        if (nextKey && nextKey!.isEqual(potentialKey)) {
          // Key found in cache.
          callback(nextKey!, dbRemoteDoc);
          nextKey = keyIter.hasNext() ? keyIter.getNext() : null;
        }

        // Skip to the next key (if there is one).
        if (nextKey) {
          control.skip(nextKey!.path.toArray());
        } else {
          control.done();
        }
      })
      .next(() => {
        // The rest of the keys are not in the cache. One case where `iterate`
        // above won't go through them is when the cache is empty.
        while (nextKey) {
          callback(nextKey!, null);
          nextKey = keyIter.hasNext() ? keyIter.getNext() : null;
        }
      });
  }

  getDocumentsMatchingQuery(
    transaction: PersistenceTransaction,
    query: Query,
    sinceReadTime: SnapshotVersion
  ): PersistencePromise<DocumentMap> {
    debugAssert(
      !isCollectionGroupQuery(query),
      'CollectionGroup queries should be handled in LocalDocumentsView'
    );
    let results = documentMap();

    const immediateChildrenPathLength = query.path.length + 1;

    const iterationOptions: IterateOptions = {};
    if (sinceReadTime.isEqual(SnapshotVersion.min())) {
      // Documents are ordered by key, so we can use a prefix scan to narrow
      // down the documents we need to match the query against.
      const startKey = query.path.toArray();
      iterationOptions.range = IDBKeyRange.lowerBound(startKey);
    } else {
      // Execute an index-free query and filter by read time. This is safe
      // since all document changes to queries that have a
      // lastLimboFreeSnapshotVersion (`sinceReadTime`) have a read time set.
      const collectionKey = query.path.toArray();
      const readTimeKey = toDbTimestampKey(sinceReadTime);
      iterationOptions.range = IDBKeyRange.lowerBound(
        [collectionKey, readTimeKey],
        /* open= */ true
      );
      iterationOptions.index = DbRemoteDocument.collectionReadTimeIndex;
    }

    return remoteDocumentsStore(transaction)
      .iterate(iterationOptions, (key, dbRemoteDoc, control) => {
        // The query is actually returning any path that starts with the query
        // path prefix which may include documents in subcollections. For
        // example, a query on 'rooms' will return rooms/abc/messages/xyx but we
        // shouldn't match it. Fix this by discarding rows with document keys
        // more than one segment longer than the query path.
        if (key.length !== immediateChildrenPathLength) {
          return;
        }

        const maybeDoc = fromDbRemoteDocument(this.serializer, dbRemoteDoc);
        if (!query.path.isPrefixOf(maybeDoc.key.path)) {
          control.done();
        } else if (
          maybeDoc instanceof Document &&
          queryMatches(query, maybeDoc)
        ) {
          results = results.insert(maybeDoc.key, maybeDoc);
        }
      })
      .next(() => results);
  }

  /**
   * Returns the set of documents that have changed since the specified read
   * time.
   */
  // PORTING NOTE: This is only used for multi-tab synchronization.
  getNewDocumentChanges(
    transaction: PersistenceTransaction,
    sinceReadTime: SnapshotVersion
  ): PersistencePromise<{
    changedDocs: MaybeDocumentMap;
    readTime: SnapshotVersion;
  }> {
    let changedDocs = maybeDocumentMap();

    let lastReadTime = toDbTimestampKey(sinceReadTime);

    const documentsStore = remoteDocumentsStore(transaction);
    const range = IDBKeyRange.lowerBound(lastReadTime, true);
    return documentsStore
      .iterate(
        { index: DbRemoteDocument.readTimeIndex, range },
        (_, dbRemoteDoc) => {
          // Unlike `getEntry()` and others, `getNewDocumentChanges()` parses
          // the documents directly since we want to keep sentinel deletes.
          const doc = fromDbRemoteDocument(this.serializer, dbRemoteDoc);
          changedDocs = changedDocs.insert(doc.key, doc);
          lastReadTime = dbRemoteDoc.readTime!;
        }
      )
      .next(() => {
        return {
          changedDocs,
          readTime: fromDbTimestampKey(lastReadTime)
        };
      });
  }

  /**
   * Returns the read time of the most recently read document in the cache, or
   * SnapshotVersion.min() if not available.
   */
  // PORTING NOTE: This is only used for multi-tab synchronization.
  getLastReadTime(
    transaction: PersistenceTransaction
  ): PersistencePromise<SnapshotVersion> {
    const documentsStore = remoteDocumentsStore(transaction);

    // If there are no existing entries, we return SnapshotVersion.min().
    let readTime = SnapshotVersion.min();

    return documentsStore
      .iterate(
        { index: DbRemoteDocument.readTimeIndex, reverse: true },
        (key, dbRemoteDoc, control) => {
          if (dbRemoteDoc.readTime) {
            readTime = fromDbTimestampKey(dbRemoteDoc.readTime);
          }
          control.done();
        }
      )
      .next(() => readTime);
  }

  newChangeBuffer(options?: {
    trackRemovals: boolean;
  }): RemoteDocumentChangeBuffer {
    return new IndexedDbRemoteDocumentCache.RemoteDocumentChangeBuffer(
      this,
      !!options && options.trackRemovals
    );
  }

  getSize(txn: PersistenceTransaction): PersistencePromise<number> {
    return this.getMetadata(txn).next(metadata => metadata.byteSize);
  }

  private getMetadata(
    txn: PersistenceTransaction
  ): PersistencePromise<DbRemoteDocumentGlobal> {
    return documentGlobalStore(txn)
      .get(DbRemoteDocumentGlobal.key)
      .next(metadata => {
        hardAssert(!!metadata, 'Missing document cache metadata');
        return metadata!;
      });
  }

  private setMetadata(
    txn: PersistenceTransaction,
    metadata: DbRemoteDocumentGlobal
  ): PersistencePromise<void> {
    return documentGlobalStore(txn).put(DbRemoteDocumentGlobal.key, metadata);
  }

  /**
   * Decodes `remoteDoc` and returns the document (or null, if the document
   * corresponds to the format used for sentinel deletes).
   */
  private maybeDecodeDocument(
    dbRemoteDoc: DbRemoteDocument | null
  ): MaybeDocument | null {
    if (dbRemoteDoc) {
      const doc = fromDbRemoteDocument(this.serializer, dbRemoteDoc);
      if (
        doc instanceof NoDocument &&
        doc.version.isEqual(SnapshotVersion.min())
      ) {
        // The document is a sentinel removal and should only be used in the
        // `getNewDocumentChanges()`.
        return null;
      }

      return doc;
    }
    return null;
  }

  /**
   * Handles the details of adding and updating documents in the IndexedDbRemoteDocumentCache.
   *
   * Unlike the MemoryRemoteDocumentChangeBuffer, the IndexedDb implementation computes the size
   * delta for all submitted changes. This avoids having to re-read all documents from IndexedDb
   * when we apply the changes.
   */
  private static get RemoteDocumentChangeBuffer() {
    return class extends RemoteDocumentChangeBuffer {
      // A map of document sizes prior to applying the changes in this buffer.
      protected documentSizes: ObjectMap<DocumentKey, number> = new ObjectMap(
        key => key.toString(),
        (l, r) => l.isEqual(r)
      );

      /**
       * @param documentCache The IndexedDbRemoteDocumentCache to apply the changes to.
       * @param trackRemovals Whether to create sentinel deletes that can be tracked by
       * `getNewDocumentChanges()`.
       */
      constructor(
        private readonly documentCache: IndexedDbRemoteDocumentCache,
        private readonly trackRemovals: boolean
      ) {
        super();
      }

      protected applyChanges(
        transaction: PersistenceTransaction
      ): PersistencePromise<void> {
        const promises: Array<PersistencePromise<void>> = [];

        let sizeDelta = 0;

        let collectionParents = new SortedSet<ResourcePath>((l, r) =>
          primitiveComparator(l.canonicalString(), r.canonicalString())
        );

        this.changes.forEach((key, maybeDocument) => {
          const previousSize = this.documentSizes.get(key);
          debugAssert(
            previousSize !== undefined,
            `Cannot modify a document that wasn't read (for ${key})`
          );
          if (maybeDocument) {
            debugAssert(
              !this.readTime.isEqual(SnapshotVersion.min()),
              'Cannot add a document with a read time of zero'
            );
            const doc = toDbRemoteDocument(
              this.documentCache.serializer,
              maybeDocument,
              this.readTime
            );
            collectionParents = collectionParents.add(key.path.popLast());

            const size = dbDocumentSize(doc);
            sizeDelta += size - previousSize!;
            promises.push(this.documentCache.addEntry(transaction, key, doc));
          } else {
            sizeDelta -= previousSize!;
            if (this.trackRemovals) {
              // In order to track removals, we store a "sentinel delete" in the
              // RemoteDocumentCache. This entry is represented by a NoDocument
              // with a version of 0 and ignored by `maybeDecodeDocument()` but
              // preserved in `getNewDocumentChanges()`.
              const deletedDoc = toDbRemoteDocument(
                this.documentCache.serializer,
                new NoDocument(key, SnapshotVersion.min()),
                this.readTime
              );
              promises.push(
                this.documentCache.addEntry(transaction, key, deletedDoc)
              );
            } else {
              promises.push(this.documentCache.removeEntry(transaction, key));
            }
          }
        });

        collectionParents.forEach(parent => {
          promises.push(
            this.documentCache.indexManager.addToCollectionParentIndex(
              transaction,
              parent
            )
          );
        });

        promises.push(
          this.documentCache.updateMetadata(transaction, sizeDelta)
        );

        return PersistencePromise.waitFor(promises);
      }

      protected getFromCache(
        transaction: PersistenceTransaction,
        documentKey: DocumentKey
      ): PersistencePromise<MaybeDocument | null> {
        // Record the size of everything we load from the cache so we can compute a delta later.
        return this.documentCache
          .getSizedEntry(transaction, documentKey)
          .next(getResult => {
            if (getResult === null) {
              this.documentSizes.set(documentKey, 0);
              return null;
            } else {
              this.documentSizes.set(documentKey, getResult.size);
              return getResult.maybeDocument;
            }
          });
      }

      protected getAllFromCache(
        transaction: PersistenceTransaction,
        documentKeys: DocumentKeySet
      ): PersistencePromise<NullableMaybeDocumentMap> {
        // Record the size of everything we load from the cache so we can compute
        // a delta later.
        return this.documentCache
          .getSizedEntries(transaction, documentKeys)
          .next(({ maybeDocuments, sizeMap }) => {
            // Note: `getAllFromCache` returns two maps instead of a single map from
            // keys to `DocumentSizeEntry`s. This is to allow returning the
            // `NullableMaybeDocumentMap` directly, without a conversion.
            sizeMap.forEach((documentKey, size) => {
              this.documentSizes.set(documentKey, size);
            });
            return maybeDocuments;
          });
      }
    };
  }
}

function documentGlobalStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbRemoteDocumentGlobalKey, DbRemoteDocumentGlobal> {
  return IndexedDbPersistence.getStore<
    DbRemoteDocumentGlobalKey,
    DbRemoteDocumentGlobal
  >(txn, DbRemoteDocumentGlobal.store);
}

/**
 * Helper to get a typed SimpleDbStore for the remoteDocuments object store.
 */
function remoteDocumentsStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbRemoteDocumentKey, DbRemoteDocument> {
  return IndexedDbPersistence.getStore<DbRemoteDocumentKey, DbRemoteDocument>(
    txn,
    DbRemoteDocument.store
  );
}

function dbKey(docKey: DocumentKey): DbRemoteDocumentKey {
  return docKey.path.toArray();
}

/**
 * Retrusn an approximate size for the given document.
 */
export function dbDocumentSize(doc: DbRemoteDocument): number {
  let value: unknown;
  if (doc.document) {
    value = doc.document;
  } else if (doc.unknownDocument) {
    value = doc.unknownDocument;
  } else if (doc.noDocument) {
    value = doc.noDocument;
  } else {
    throw fail('Unknown remote document type');
  }
  return JSON.stringify(value).length;
}
