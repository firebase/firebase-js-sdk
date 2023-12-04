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

import { Query, queryMatches } from '../core/query';
import { SnapshotVersion } from '../core/snapshot_version';
import {
  DocumentKeySet,
  DocumentSizeEntries,
  MutableDocumentMap,
  mutableDocumentMap,
  OverlayMap
} from '../model/collections';
import { MutableDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { IndexOffset } from '../model/field_index';
import { ResourcePath } from '../model/path';
import { debugAssert, hardAssert } from '../util/assert';
import { primitiveComparator } from '../util/misc';
import { ObjectMap } from '../util/obj_map';
import { SortedMap } from '../util/sorted_map';
import { SortedSet } from '../util/sorted_set';

import { IndexManager } from './index_manager';
import { dbDocumentSize } from './indexeddb_mutation_batch_impl';
import { DbRemoteDocument, DbRemoteDocumentGlobal } from './indexeddb_schema';
import {
  DbRemoteDocumentCollectionGroupIndex,
  DbRemoteDocumentDocumentKeyIndex,
  DbRemoteDocumentGlobalKey,
  DbRemoteDocumentGlobalStore,
  DbRemoteDocumentKey,
  DbRemoteDocumentStore,
  DbTimestampKey
} from './indexeddb_sentinels';
import { getStore } from './indexeddb_transaction';
import {
  fromDbRemoteDocument,
  LocalSerializer,
  toDbRemoteDocument,
  toDbTimestampKey
} from './local_serializer';
import { PersistencePromise } from './persistence_promise';
import { PersistenceTransaction } from './persistence_transaction';
import { QueryContext } from './query_context';
import { RemoteDocumentCache } from './remote_document_cache';
import { RemoteDocumentChangeBuffer } from './remote_document_change_buffer';
import { SimpleDbStore } from './simple_db';

export interface DocumentSizeEntry {
  document: MutableDocument;
  size: number;
}

export interface IndexedDbRemoteDocumentCache extends RemoteDocumentCache {
  // The IndexedDbRemoteDocumentCache doesn't implement any methods on top
  // of RemoteDocumentCache. This class exists for consistency.
}

/**
 * The RemoteDocumentCache for IndexedDb. To construct, invoke
 * `newIndexedDbRemoteDocumentCache()`.
 */
class IndexedDbRemoteDocumentCacheImpl implements IndexedDbRemoteDocumentCache {
  indexManager!: IndexManager;

  constructor(readonly serializer: LocalSerializer) {}

  setIndexManager(indexManager: IndexManager): void {
    this.indexManager = indexManager;
  }

  /**
   * Adds the supplied entries to the cache.
   *
   * All calls of `addEntry` are required to go through the RemoteDocumentChangeBuffer
   * returned by `newChangeBuffer()` to ensure proper accounting of metadata.
   */
  addEntry(
    transaction: PersistenceTransaction,
    key: DocumentKey,
    doc: DbRemoteDocument
  ): PersistencePromise<void> {
    const documentStore = remoteDocumentsStore(transaction);
    return documentStore.put(doc);
  }

  /**
   * Removes a document from the cache.
   *
   * All calls of `removeEntry`  are required to go through the RemoteDocumentChangeBuffer
   * returned by `newChangeBuffer()` to ensure proper accounting of metadata.
   */
  removeEntry(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey,
    readTime: SnapshotVersion
  ): PersistencePromise<void> {
    const store = remoteDocumentsStore(transaction);
    return store.delete(dbReadTimeKey(documentKey, readTime));
  }

  /**
   * Updates the current cache size.
   *
   * Callers to `addEntry()` and `removeEntry()` *must* call this afterwards to update the
   * cache's metadata.
   */
  updateMetadata(
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
  ): PersistencePromise<MutableDocument> {
    let doc = MutableDocument.newInvalidDocument(documentKey);
    return remoteDocumentsStore(transaction)
      .iterate(
        {
          index: DbRemoteDocumentDocumentKeyIndex,
          range: IDBKeyRange.only(dbKey(documentKey))
        },
        (_, dbRemoteDoc) => {
          doc = this.maybeDecodeDocument(documentKey, dbRemoteDoc);
        }
      )
      .next(() => doc);
  }

  /**
   * Looks up an entry in the cache.
   *
   * @param documentKey - The key of the entry to look up.
   * @returns The cached document entry and its size.
   */
  getSizedEntry(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<DocumentSizeEntry> {
    let result = {
      size: 0,
      document: MutableDocument.newInvalidDocument(documentKey)
    };
    return remoteDocumentsStore(transaction)
      .iterate(
        {
          index: DbRemoteDocumentDocumentKeyIndex,
          range: IDBKeyRange.only(dbKey(documentKey))
        },
        (_, dbRemoteDoc) => {
          result = {
            document: this.maybeDecodeDocument(documentKey, dbRemoteDoc),
            size: dbDocumentSize(dbRemoteDoc)
          };
        }
      )
      .next(() => result);
  }

  getEntries(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<MutableDocumentMap> {
    let results = mutableDocumentMap();
    return this.forEachDbEntry(
      transaction,
      documentKeys,
      (key, dbRemoteDoc) => {
        const doc = this.maybeDecodeDocument(key, dbRemoteDoc);
        results = results.insert(key, doc);
      }
    ).next(() => results);
  }

  /**
   * Looks up several entries in the cache.
   *
   * @param documentKeys - The set of keys entries to look up.
   * @returns A map of documents indexed by key and a map of sizes indexed by
   *     key (zero if the document does not exist).
   */
  getSizedEntries(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<DocumentSizeEntries> {
    let results = mutableDocumentMap();
    let sizeMap = new SortedMap<DocumentKey, number>(DocumentKey.comparator);
    return this.forEachDbEntry(
      transaction,
      documentKeys,
      (key, dbRemoteDoc) => {
        const doc = this.maybeDecodeDocument(key, dbRemoteDoc);
        results = results.insert(key, doc);
        sizeMap = sizeMap.insert(key, dbDocumentSize(dbRemoteDoc));
      }
    ).next(() => {
      return { documents: results, sizeMap };
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

    let sortedKeys = new SortedSet<DocumentKey>(dbKeyComparator);
    documentKeys.forEach(e => (sortedKeys = sortedKeys.add(e)));
    const range = IDBKeyRange.bound(
      dbKey(sortedKeys.first()!),
      dbKey(sortedKeys.last()!)
    );
    const keyIter = sortedKeys.getIterator();
    let nextKey: DocumentKey | null = keyIter.getNext();

    return remoteDocumentsStore(transaction)
      .iterate(
        { index: DbRemoteDocumentDocumentKeyIndex, range },
        (_, dbRemoteDoc, control) => {
          const potentialKey = DocumentKey.fromSegments([
            ...dbRemoteDoc.prefixPath,
            dbRemoteDoc.collectionGroup,
            dbRemoteDoc.documentId
          ]);

          // Go through keys not found in cache.
          while (nextKey && dbKeyComparator(nextKey!, potentialKey) < 0) {
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
            control.skip(dbKey(nextKey));
          } else {
            control.done();
          }
        }
      )
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
    offset: IndexOffset,
    mutatedDocs: OverlayMap,
    context?: QueryContext
  ): PersistencePromise<MutableDocumentMap> {
    const collection = query.path;
    const startKey = [
      collection.popLast().toArray(),
      collection.lastSegment(),
      toDbTimestampKey(offset.readTime),
      offset.documentKey.path.isEmpty()
        ? ''
        : offset.documentKey.path.lastSegment()
    ];
    const endKey: DbRemoteDocumentKey = [
      collection.popLast().toArray(),
      collection.lastSegment(),
      [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
      ''
    ];

    return remoteDocumentsStore(transaction)
      .loadAll(IDBKeyRange.bound(startKey, endKey, true))
      .next(dbRemoteDocs => {
        context?.incrementDocumentReadCount(dbRemoteDocs.length);
        let results = mutableDocumentMap();
        for (const dbRemoteDoc of dbRemoteDocs) {
          const document = this.maybeDecodeDocument(
            DocumentKey.fromSegments(
              dbRemoteDoc.prefixPath.concat(
                dbRemoteDoc.collectionGroup,
                dbRemoteDoc.documentId
              )
            ),
            dbRemoteDoc
          );
          if (
            document.isFoundDocument() &&
            (queryMatches(query, document) || mutatedDocs.has(document.key))
          ) {
            // Either the document matches the given query, or it is mutated.
            results = results.insert(document.key, document);
          }
        }
        return results;
      });
  }

  getAllFromCollectionGroup(
    transaction: PersistenceTransaction,
    collectionGroup: string,
    offset: IndexOffset,
    limit: number
  ): PersistencePromise<MutableDocumentMap> {
    debugAssert(limit > 0, 'Limit should be at least 1');
    let results = mutableDocumentMap();

    const startKey = dbCollectionGroupKey(collectionGroup, offset);
    const endKey = dbCollectionGroupKey(collectionGroup, IndexOffset.max());
    return remoteDocumentsStore(transaction)
      .iterate(
        {
          index: DbRemoteDocumentCollectionGroupIndex,
          range: IDBKeyRange.bound(startKey, endKey, true)
        },
        (_, dbRemoteDoc, control) => {
          const document = this.maybeDecodeDocument(
            DocumentKey.fromSegments(
              dbRemoteDoc.prefixPath.concat(
                dbRemoteDoc.collectionGroup,
                dbRemoteDoc.documentId
              )
            ),
            dbRemoteDoc
          );
          results = results.insert(document.key, document);
          if (results.size === limit) {
            control.done();
          }
        }
      )
      .next(() => results);
  }

  newChangeBuffer(options?: {
    trackRemovals: boolean;
  }): RemoteDocumentChangeBuffer {
    return new IndexedDbRemoteDocumentChangeBuffer(
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
      .get(DbRemoteDocumentGlobalKey)
      .next(metadata => {
        hardAssert(!!metadata, 'Missing document cache metadata');
        return metadata!;
      });
  }

  private setMetadata(
    txn: PersistenceTransaction,
    metadata: DbRemoteDocumentGlobal
  ): PersistencePromise<void> {
    return documentGlobalStore(txn).put(DbRemoteDocumentGlobalKey, metadata);
  }

  /**
   * Decodes `dbRemoteDoc` and returns the document (or an invalid document if
   * the document corresponds to the format used for sentinel deletes).
   */
  private maybeDecodeDocument(
    documentKey: DocumentKey,
    dbRemoteDoc: DbRemoteDocument | null
  ): MutableDocument {
    if (dbRemoteDoc) {
      const doc = fromDbRemoteDocument(this.serializer, dbRemoteDoc);
      // Whether the document is a sentinel removal and should only be used in the
      // `getNewDocumentChanges()`
      const isSentinelRemoval =
        doc.isNoDocument() && doc.version.isEqual(SnapshotVersion.min());
      if (!isSentinelRemoval) {
        return doc;
      }
    }
    return MutableDocument.newInvalidDocument(documentKey);
  }
}

/** Creates a new IndexedDbRemoteDocumentCache. */
export function newIndexedDbRemoteDocumentCache(
  serializer: LocalSerializer
): IndexedDbRemoteDocumentCache {
  return new IndexedDbRemoteDocumentCacheImpl(serializer);
}

/**
 * Handles the details of adding and updating documents in the IndexedDbRemoteDocumentCache.
 *
 * Unlike the MemoryRemoteDocumentChangeBuffer, the IndexedDb implementation computes the size
 * delta for all submitted changes. This avoids having to re-read all documents from IndexedDb
 * when we apply the changes.
 */
class IndexedDbRemoteDocumentChangeBuffer extends RemoteDocumentChangeBuffer {
  // A map of document sizes and read times prior to applying the changes in
  // this buffer.
  protected documentStates: ObjectMap<
    DocumentKey,
    { size: number; readTime: SnapshotVersion }
  > = new ObjectMap(
    key => key.toString(),
    (l, r) => l.isEqual(r)
  );

  /**
   * @param documentCache - The IndexedDbRemoteDocumentCache to apply the changes to.
   * @param trackRemovals - Whether to create sentinel deletes that can be tracked by
   * `getNewDocumentChanges()`.
   */
  constructor(
    private readonly documentCache: IndexedDbRemoteDocumentCacheImpl,
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

    this.changes.forEach((key, documentChange) => {
      const previousDoc = this.documentStates.get(key);
      debugAssert(
        previousDoc !== undefined,
        `Cannot modify a document that wasn't read (for ${key})`
      );
      promises.push(
        this.documentCache.removeEntry(transaction, key, previousDoc.readTime)
      );
      if (documentChange.isValidDocument()) {
        debugAssert(
          !documentChange.readTime.isEqual(SnapshotVersion.min()),
          'Cannot add a document with a read time of zero'
        );
        const doc = toDbRemoteDocument(
          this.documentCache.serializer,
          documentChange
        );
        collectionParents = collectionParents.add(key.path.popLast());

        const size = dbDocumentSize(doc);
        sizeDelta += size - previousDoc.size;
        promises.push(this.documentCache.addEntry(transaction, key, doc));
      } else {
        sizeDelta -= previousDoc.size;
        if (this.trackRemovals) {
          // In order to track removals, we store a "sentinel delete" in the
          // RemoteDocumentCache. This entry is represented by a NoDocument
          // with a version of 0 and ignored by `maybeDecodeDocument()` but
          // preserved in `getNewDocumentChanges()`.
          const deletedDoc = toDbRemoteDocument(
            this.documentCache.serializer,
            documentChange.convertToNoDocument(SnapshotVersion.min())
          );
          promises.push(
            this.documentCache.addEntry(transaction, key, deletedDoc)
          );
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

    promises.push(this.documentCache.updateMetadata(transaction, sizeDelta));

    return PersistencePromise.waitFor(promises);
  }

  protected getFromCache(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<MutableDocument> {
    // Record the size of everything we load from the cache so we can compute a delta later.
    return this.documentCache
      .getSizedEntry(transaction, documentKey)
      .next(getResult => {
        this.documentStates.set(documentKey, {
          size: getResult.size,
          readTime: getResult.document.readTime
        });
        return getResult.document;
      });
  }

  protected getAllFromCache(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<MutableDocumentMap> {
    // Record the size of everything we load from the cache so we can compute
    // a delta later.
    return this.documentCache
      .getSizedEntries(transaction, documentKeys)
      .next(({ documents, sizeMap }) => {
        // Note: `getAllFromCache` returns two maps instead of a single map from
        // keys to `DocumentSizeEntry`s. This is to allow returning the
        // `MutableDocumentMap` directly, without a conversion.
        sizeMap.forEach((documentKey, size) => {
          this.documentStates.set(documentKey, {
            size,
            readTime: documents.get(documentKey)!.readTime
          });
        });
        return documents;
      });
  }
}

function documentGlobalStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbRemoteDocumentGlobalKey, DbRemoteDocumentGlobal> {
  return getStore<DbRemoteDocumentGlobalKey, DbRemoteDocumentGlobal>(
    txn,
    DbRemoteDocumentGlobalStore
  );
}

/**
 * Helper to get a typed SimpleDbStore for the remoteDocuments object store.
 */
function remoteDocumentsStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbRemoteDocumentKey, DbRemoteDocument> {
  return getStore<DbRemoteDocumentKey, DbRemoteDocument>(
    txn,
    DbRemoteDocumentStore
  );
}

/**
 * Returns a key that can be used for document lookups on the
 * `DbRemoteDocumentDocumentKeyIndex` index.
 */
function dbKey(documentKey: DocumentKey): [string[], string, string] {
  const path = documentKey.path.toArray();
  return [
    /* prefix path */ path.slice(0, path.length - 2),
    /* collection id */ path[path.length - 2],
    /* document id */ path[path.length - 1]
  ];
}

/**
 * Returns a key that can be used for document lookups via the primary key of
 * the DbRemoteDocument object store.
 */
function dbReadTimeKey(
  documentKey: DocumentKey,
  readTime: SnapshotVersion
): DbRemoteDocumentKey {
  const path = documentKey.path.toArray();
  return [
    /* prefix path */ path.slice(0, path.length - 2),
    /* collection id */ path[path.length - 2],
    toDbTimestampKey(readTime),
    /* document id */ path[path.length - 1]
  ];
}

/**
 * Returns a key that can be used for document lookups on the
 * `DbRemoteDocumentDocumentCollectionGroupIndex` index.
 */
function dbCollectionGroupKey(
  collectionGroup: string,
  offset: IndexOffset
): [string, DbTimestampKey, string[], string] {
  const path = offset.documentKey.path.toArray();
  return [
    /* collection id */ collectionGroup,
    toDbTimestampKey(offset.readTime),
    /* prefix path */ path.slice(0, path.length - 2),
    /* document id */ path.length > 0 ? path[path.length - 1] : ''
  ];
}

/**
 * Comparator that compares document keys according to the primary key sorting
 * used by the `DbRemoteDocumentDocument` store (by prefix path, collection id
 * and then document ID).
 *
 * Visible for testing.
 */
export function dbKeyComparator(l: DocumentKey, r: DocumentKey): number {
  const left = l.path.toArray();
  const right = r.path.toArray();

  // The ordering is based on https://chromium.googlesource.com/chromium/blink/+/fe5c21fef94dae71c1c3344775b8d8a7f7e6d9ec/Source/modules/indexeddb/IDBKey.cpp#74
  let cmp = 0;
  for (let i = 0; i < left.length - 2 && i < right.length - 2; ++i) {
    cmp = primitiveComparator(left[i], right[i]);
    if (cmp) {
      return cmp;
    }
  }

  cmp = primitiveComparator(left.length, right.length);
  if (cmp) {
    return cmp;
  }

  cmp = primitiveComparator(left[left.length - 2], right[right.length - 2]);
  if (cmp) {
    return cmp;
  }

  return primitiveComparator(left[left.length - 1], right[right.length - 1]);
}
