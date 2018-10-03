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
import {
  documentKeySet,
  DocumentMap,
  documentMap,
  MaybeDocumentMap,
  maybeDocumentMap
} from '../model/collections';
import { Document, MaybeDocument, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';

import { SnapshotVersion } from '../core/snapshot_version';
import { assert } from '../util/assert';
import { Code, FirestoreError } from '../util/error';
import { IndexedDbPersistence } from './indexeddb_persistence';
import {
  DbRemoteDocument,
  DbRemoteDocumentChanges,
  DbRemoteDocumentChangesKey,
  DbRemoteDocumentKey
} from './indexeddb_schema';
import { LocalSerializer } from './local_serializer';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { RemoteDocumentCache } from './remote_document_cache';
import { SimpleDb, SimpleDbStore, SimpleDbTransaction } from './simple_db';

const REMOTE_DOCUMENT_CHANGE_MISSING_ERR_MSG =
  'The remote document changelog no longer contains all changes for all ' +
  'local query views. It may be necessary to rebuild these views.';

export class IndexedDbRemoteDocumentCache implements RemoteDocumentCache {
  /** The last id read by `getNewDocumentChanges()`. */
  private _lastProcessedDocumentChangeId = 0;

  /**
   * @param {LocalSerializer} serializer The document serializer.
   * @param keepDocumentChangeLog Whether to keep a document change log in
   * IndexedDb. This change log is required for Multi-Tab synchronization, but
   * not needed in clients that don't share access to their remote document
   * cache.
   */
  constructor(
    private readonly serializer: LocalSerializer,
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

  addEntries(
    transaction: PersistenceTransaction,
    maybeDocuments: MaybeDocument[]
  ): PersistencePromise<void> {
    const promises: Array<PersistencePromise<void>> = [];

    if (maybeDocuments.length > 0) {
      const documentStore = remoteDocumentsStore(transaction);
      let changedKeys = documentKeySet();
      for (const maybeDocument of maybeDocuments) {
        promises.push(
          documentStore.put(
            dbKey(maybeDocument.key),
            this.serializer.toDbRemoteDocument(maybeDocument)
          )
        );
        changedKeys = changedKeys.add(maybeDocument.key);
      }

      if (this.keepDocumentChangeLog) {
        promises.push(
          documentChangesStore(transaction).put({
            changes: this.serializer.toDbResourcePaths(changedKeys)
          })
        );
      }
    }

    return PersistencePromise.waitFor(promises);
  }

  removeEntry(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<void> {
    // We don't need to keep changelog for these removals since `removeEntry` is
    // only used for garbage collection.
    return remoteDocumentsStore(transaction).delete(dbKey(documentKey));
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

  getDocumentsMatchingQuery(
    transaction: PersistenceTransaction,
    query: Query
  ): PersistencePromise<DocumentMap> {
    let results = documentMap();

    // Documents are ordered by key, so we can use a prefix scan to narrow down
    // the documents we need to match the query against.
    const startKey = query.path.toArray();
    const range = IDBKeyRange.lowerBound(startKey);
    return remoteDocumentsStore(transaction)
      .iterate({ range }, (key, dbRemoteDoc, control) => {
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
            this.getEntry(transaction, key).next(maybeDoc => {
              changedDocs = changedDocs.insert(
                key,
                maybeDoc || new NoDocument(key, SnapshotVersion.forDeletedDoc())
              );
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
