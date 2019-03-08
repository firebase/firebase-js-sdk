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
   * Adds the supplied entries to the cache. Adds the given size delta to the cached size.
   */
  addEntries(
    transaction: PersistenceTransaction,
    entries: Array<{ key: DocumentKey; doc: DbRemoteDocument }>,
    sizeDelta: number
  ): PersistencePromise<void> {
    const promises: Array<PersistencePromise<void>> = [];

    if (entries.length > 0) {
      const documentStore = remoteDocumentsStore(transaction);
      let changedKeys = documentKeySet();
      for (const { key, doc } of entries) {
        promises.push(documentStore.put(dbKey(key), doc));
        changedKeys = changedKeys.add(key);

        promises.push(
          this.indexManager.addToCollectionParentIndex(
            transaction,
            key.path.popLast()
          )
        );
      }

      if (this.keepDocumentChangeLog) {
        promises.push(
          documentChangesStore(transaction).put({
            changes: this.serializer.toDbResourcePaths(changedKeys)
          })
        );
      }

      promises.push(this.updateSize(transaction, sizeDelta));
    }

    return PersistencePromise.waitFor(promises);
  }

  /**
   * Removes a document from the cache. Note that this method does *not* do any
   * size accounting. It is the responsibility of the caller to count the bytes removed
   * and issue a final updateSize() call after removing documents.
   *
   * @param documentKey The key of the document to remove
   * @return The size of the document that was removed.
   */
  removeEntry(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<number> {
    // We don't need to keep changelog for these removals since `removeEntry` is
    // only used for garbage collection.
    const store = remoteDocumentsStore(transaction);
    const key = dbKey(documentKey);
    return store.get(key).next(document => {
      if (document) {
        return store.delete(key).next(() => dbDocumentSize(document));
      } else {
        return PersistencePromise.resolve(0);
      }
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

  /**
   * Adds the given delta to the cached current size. Callers to removeEntry *must* call this
   * afterwards to update the size of the cache.
   *
   * @param sizeDelta
   */
  updateSize(
    txn: PersistenceTransaction,
    sizeDelta: number
  ): PersistencePromise<void> {
    return this.getMetadata(txn).next(metadata => {
      metadata.byteSize += sizeDelta;
      return this.setMetadata(txn, metadata);
    });
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
 * Handles the details of adding and updating documents in the IndexedDbRemoteDocumentCache
 */
class IndexedDbRemoteDocumentChangeBuffer extends RemoteDocumentChangeBuffer {
  constructor(private readonly documentCache: IndexedDbRemoteDocumentCache) {
    super();
  }

  protected applyChanges(
    transaction: PersistenceTransaction
  ): PersistencePromise<void> {
    const changes = this.assertChanges();
    let delta = 0;
    const toApply: Array<{ doc: DbRemoteDocument; key: DocumentKey }> = [];
    changes.forEach((key, maybeDocument) => {
      const doc = this.documentCache.serializer.toDbRemoteDocument(
        maybeDocument
      );
      const previousSize = this.documentSizes.get(key);
      // NOTE: if we ever decide we need to support doing writes without
      // reading first, this assert will need to change to do the read automatically.
      assert(
        previousSize !== undefined,
        `Attempting to change document ${key.toString()} without having read it first`
      );
      const size = dbDocumentSize(doc);
      delta += size - previousSize!;
      toApply.push({ key, doc });
    });

    return this.documentCache.addEntries(transaction, toApply, delta);
  }

  protected getFromCache(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<DocumentSizeEntry | null> {
    return this.documentCache.getSizedEntry(transaction, documentKey);
  }

  protected getAllFromCache(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<DocumentSizeEntries> {
    return this.documentCache.getSizedEntries(transaction, documentKeys);
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
