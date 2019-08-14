/**
 * @license
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
import {
  DocumentKeySet,
  documentKeySet,
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
import { SortedMap } from '../util/sorted_map';

import { SnapshotVersion } from '../core/snapshot_version';
import { assert, fail } from '../util/assert';
import { Code, FirestoreError } from '../util/error';
import { IndexManager } from './index_manager';
import { IndexedDbPersistence } from './indexeddb_persistence';
import {
  DbRemoteDocument,
  DbRemoteDocumentChanges,
  DbRemoteDocumentChangesKey,
  DbRemoteDocumentGlobal,
  DbRemoteDocumentGlobalKey,
  DbRemoteDocumentKey
} from './indexeddb_schema';
import { LocalSerializer } from './local_serializer';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { RemoteDocumentCache } from './remote_document_cache';
import { RemoteDocumentChangeBuffer } from './remote_document_change_buffer';
import { SimpleDb, SimpleDbStore, SimpleDbTransaction } from './simple_db';
import { ObjectMap } from '../util/obj_map';

const REMOTE_DOCUMENT_CHANGE_MISSING_ERR_MSG =
  'The remote document changelog no longer contains all changes for all ' +
  'local query views. It may be necessary to rebuild these views.';

export class IndexedDbRemoteDocumentCache implements RemoteDocumentCache {
  /** The last id read by `getNewDocumentChanges()`. */
  private _lastProcessedDocumentChangeId = 0;

  /**
   * @param {LocalSerializer} serializer The document serializer.
   * @param {IndexManager} indexManager The query indexes that need to be maintained.
   * @param keepDocumentChangeLog Whether to keep a document change log in
   * IndexedDb. This change log is required for Multi-Tab synchronization, but
   * not needed in clients that don't share access to their remote document
   * cache.
   */
  constructor(
    readonly serializer: LocalSerializer,
    private readonly indexManager: IndexManager,
    private readonly keepDocumentChangeLog: boolean
  ) {}

  get lastProcessedDocumentChangeId(): number {
    return this._lastProcessedDocumentChangeId;
  }

  /**
   * Starts up the remote document cache.
   *
   * Reads the ID of the last  document change from the documentChanges store.
   * Existing changes will not be returned as part of
   * `getNewDocumentChanges()`.
   */
  // PORTING NOTE: This is only used for multi-tab synchronization.
  start(transaction: SimpleDbTransaction): PersistencePromise<void> {
    const store = SimpleDb.getStore<
      DbRemoteDocumentChangesKey,
      DbRemoteDocumentChanges
    >(transaction, DbRemoteDocumentChanges.store);
    return this.synchronizeLastDocumentChangeId(store);
  }

  /**
   * Adds the supplied entries to the cache.
   *
   * Callees must ensure that the total document size in the cache is updated
   * after all entries are written (via `updateMetadata()`).
   */
  addEntry(
    transaction: PersistenceTransaction,
    key: DocumentKey,
    doc: DbRemoteDocument
  ): PersistencePromise<void> {
    const documentStore = remoteDocumentsStore(transaction);
    return documentStore.put(dbKey(key), doc).next(() => {
      this.indexManager.addToCollectionParentIndex(
        transaction,
        key.path.popLast()
      );
    });
  }

  /**
   * Removes a document from the cache.
   *
   * Callees must ensure that the total document size in the cache is updated
   * after all entries are written (via `updateMetadata()`).
   *
   * @param documentKey The key of the document to remove
   * @return The size of the document that was removed.
   */
  removeEntry(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<void> {
    const store = remoteDocumentsStore(transaction);
    const key = dbKey(documentKey);
    return store.delete(key);
  }

  /**
   * Udpates the document change log and adds the given delta to the cached current size.
   * Callers to `addEntry()` and `removeEntry()` *must* call this afterwards to update the
   * cache's metadata.
   */
  updateMetadata(
    transaction: PersistenceTransaction,
    changedKeys: DocumentKeySet,
    sizeDelta: number
  ) {
    return this.getMetadata(transaction).next(metadata => {
      metadata.byteSize += sizeDelta;
      return this.setMetadata(transaction, metadata).next(() => {
        if (this.keepDocumentChangeLog) {
          return documentChangesStore(transaction).put({
            changes: this.serializer.toDbResourcePaths(changedKeys)
          });
        }
      });
    });
  }

  getEntry(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<MaybeDocument | null> {
    return remoteDocumentsStore(transaction)
      .get(dbKey(documentKey))
      .next(dbRemoteDoc => {
        return dbRemoteDoc
          ? this.serializer.fromDbRemoteDocument(dbRemoteDoc)
          : null;
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
        return dbRemoteDoc
          ? {
              maybeDocument: this.serializer.fromDbRemoteDocument(dbRemoteDoc),
              size: dbDocumentSize(dbRemoteDoc)
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
        if (dbRemoteDoc) {
          results = results.insert(
            key,
            this.serializer.fromDbRemoteDocument(dbRemoteDoc)
          );
        } else {
          results = results.insert(key, null);
        }
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
        if (dbRemoteDoc) {
          results = results.insert(
            key,
            this.serializer.fromDbRemoteDocument(dbRemoteDoc)
          );
          sizeMap = sizeMap.insert(key, dbDocumentSize(dbRemoteDoc));
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
    query: Query
  ): PersistencePromise<DocumentMap> {
    assert(
      !query.isCollectionGroupQuery(),
      'CollectionGroup queries should be handled in LocalDocumentsView'
    );
    let results = documentMap();

    const immediateChildrenPathLength = query.path.length + 1;

    // Documents are ordered by key, so we can use a prefix scan to narrow down
    // the documents we need to match the query against.
    const startKey = query.path.toArray();
    const range = IDBKeyRange.lowerBound(startKey);
    return remoteDocumentsStore(transaction)
      .iterate({ range }, (key, dbRemoteDoc, control) => {
        // The query is actually returning any path that starts with the query
        // path prefix which may include documents in subcollections. For
        // example, a query on 'rooms' will return rooms/abc/messages/xyx but we
        // shouldn't match it. Fix this by discarding rows with document keys
        // more than one segment longer than the query path.
        if (key.length !== immediateChildrenPathLength) {
          return;
        }

        const maybeDoc = this.serializer.fromDbRemoteDocument(dbRemoteDoc);
        if (!query.path.isPrefixOf(maybeDoc.key.path)) {
          control.done();
        } else if (maybeDoc instanceof Document && query.matches(maybeDoc)) {
          results = results.insert(maybeDoc.key, maybeDoc);
        }
      })
      .next(() => results);
  }

  getNewDocumentChanges(
    transaction: PersistenceTransaction
  ): PersistencePromise<MaybeDocumentMap> {
    assert(
      this.keepDocumentChangeLog,
      'Can only call getNewDocumentChanges() when document change log is enabled'
    );
    let changedKeys = documentKeySet();
    let changedDocs = maybeDocumentMap();

    const range = IDBKeyRange.lowerBound(
      this._lastProcessedDocumentChangeId + 1
    );
    let firstIteration = true;

    const changesStore = documentChangesStore(transaction);
    return changesStore
      .iterate({ range }, (_, documentChange) => {
        if (firstIteration) {
          firstIteration = false;

          // If our client was throttled for more than 30 minutes, another
          // client may have garbage collected the remote document changelog.
          if (this._lastProcessedDocumentChangeId + 1 !== documentChange.id) {
            // Reset the `lastProcessedDocumentChangeId` to allow further
            // invocations to successfully return the changes after this
            // rejection.
            return this.synchronizeLastDocumentChangeId(changesStore).next(() =>
              PersistencePromise.reject(
                new FirestoreError(
                  Code.DATA_LOSS,
                  REMOTE_DOCUMENT_CHANGE_MISSING_ERR_MSG
                )
              )
            );
          }
        }

        changedKeys = changedKeys.unionWith(
          this.serializer.fromDbResourcePaths(documentChange.changes)
        );
        this._lastProcessedDocumentChangeId = documentChange.id!;
      })
      .next(() => {
        const documentPromises: Array<PersistencePromise<void>> = [];
        changedKeys.forEach(key => {
          documentPromises.push(
            this.getEntry(transaction, key).next(maybeDocument => {
              const doc =
                maybeDocument ||
                new NoDocument(key, SnapshotVersion.forDeletedDoc());
              changedDocs = changedDocs.insert(key, doc);
            })
          );
        });
        return PersistencePromise.waitFor(documentPromises);
      })
      .next(() => changedDocs);
  }

  /**
   * Removes all changes in the remote document changelog through `changeId`
   * (inclusive).
   */
  removeDocumentChangesThroughChangeId(
    transaction: PersistenceTransaction,
    changeId: number
  ): PersistencePromise<void> {
    const range = IDBKeyRange.upperBound(changeId);
    return documentChangesStore(transaction).delete(range);
  }

  private synchronizeLastDocumentChangeId(
    documentChangesStore: SimpleDbStore<
      DbRemoteDocumentChangesKey,
      DbRemoteDocumentChanges
    >
  ): PersistencePromise<void> {
    // If there are no existing changes, we set `lastProcessedDocumentChangeId`
    // to 0 since IndexedDb's auto-generated keys start at 1.
    this._lastProcessedDocumentChangeId = 0;
    return documentChangesStore.iterate(
      { keysOnly: true, reverse: true },
      (key, value, control) => {
        this._lastProcessedDocumentChangeId = key;
        control.done();
      }
    );
  }

  newChangeBuffer(): RemoteDocumentChangeBuffer {
    return new IndexedDbRemoteDocumentChangeBuffer(this);
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
        assert(!!metadata, 'Missing document cache metadata');
        return metadata!;
      });
  }

  private setMetadata(
    txn: PersistenceTransaction,
    metadata: DbRemoteDocumentGlobal
  ): PersistencePromise<void> {
    return documentGlobalStore(txn).put(DbRemoteDocumentGlobal.key, metadata);
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
 * Handles the details of adding and updating documents in the IndexedDbRemoteDocumentCache.
 *
 * Unlike the MemoryRemoteDocumentChangeBuffer, the IndexedDb implementation computes the size
 * delta for all submitted changes. This avoids having to re-read all documents from IndexedDb
 * when we apply the changes.
 */
class IndexedDbRemoteDocumentChangeBuffer extends RemoteDocumentChangeBuffer {
  // A map of document sizes prior to applying the changes in this buffer.
  protected documentSizes: ObjectMap<DocumentKey, number> = new ObjectMap(key =>
    key.toString()
  );

  constructor(private readonly documentCache: IndexedDbRemoteDocumentCache) {
    super();
  }

  protected applyChanges(
    transaction: PersistenceTransaction
  ): PersistencePromise<void> {
    const promises: PersistencePromise<void>[] = [];

    let sizeDelta = 0;
    let changedKeys = documentKeySet();

    this.changes.forEach((key, maybeDocument) => {
      const previousSize = this.documentSizes.get(key);
      assert(
        previousSize !== undefined,
        `Cannot modify a document that wasn't read (for ${key})`
      );
      if (maybeDocument) {
        const doc = this.documentCache.serializer.toDbRemoteDocument(
          maybeDocument
        );
        const size = dbDocumentSize(doc);
        sizeDelta += size - previousSize!;
        promises.push(this.documentCache.addEntry(transaction, key, doc));
      } else {
        sizeDelta -= previousSize!;
        promises.push(this.documentCache.removeEntry(transaction, key));
      }

      changedKeys = changedKeys.add(key);
    });

    promises.push(
      this.documentCache.updateMetadata(transaction, changedKeys, sizeDelta)
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
}

export function isDocumentChangeMissingError(err: FirestoreError): boolean {
  return (
    err.code === Code.DATA_LOSS &&
    err.message === REMOTE_DOCUMENT_CHANGE_MISSING_ERR_MSG
  );
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

/**
 * Helper to get a typed SimpleDbStore for the remoteDocumentChanges object
 * store.
 */
function documentChangesStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbRemoteDocumentChangesKey, DbRemoteDocumentChanges> {
  return IndexedDbPersistence.getStore<
    DbRemoteDocumentChangesKey,
    DbRemoteDocumentChanges
  >(txn, DbRemoteDocumentChanges.store);
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
