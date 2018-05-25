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
import { documentKeySet, DocumentMap, documentMap } from '../model/collections';
import { Document, MaybeDocument, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';

import {
  DbRemoteDocument,
  DbRemoteDocumentKey,
  DbRemoteDocumentChanges,
  DbRemoteDocumentChangesKey
} from './indexeddb_schema';
import { LocalSerializer } from './local_serializer';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { RemoteDocumentCache } from './remote_document_cache';
import { SimpleDb, SimpleDbStore } from './simple_db';
import { SnapshotVersion } from '../core/snapshot_version';

export class IndexedDbRemoteDocumentCache implements RemoteDocumentCache {
  /** The last id read by `getNewDocumentChanges()`. */
  private lastReturnedDocumentChangesId = 0;

  constructor(private serializer: LocalSerializer) {}

  start(transaction: PersistenceTransaction): PersistencePromise<void> {
    // If there are no existing changes, we set `lastReturnedDocumentChangesId`
    // to 0 since IndexedDb's auto-generated keys start at 1.
    this.lastReturnedDocumentChangesId = 0;

    return documentChangesStore(transaction).iterate(
      { keysOnly: true, reverse: true },
      (key, value, control) => {
        this.lastReturnedDocumentChangesId = key;
        control.done();
      }
    );
  }

  addEntries(
    transaction: PersistenceTransaction,
    maybeDocuments: MaybeDocument[]
  ): PersistencePromise<void> {
    const promises: Array<PersistencePromise<void>> = [];
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

    promises.push(
      documentChangesStore(transaction).put({
        changes: this.serializer.toDbResourcePaths(changedKeys)
      })
    );
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
  ): PersistencePromise<MaybeDocument[]> {
    const documentPromises: Array<PersistencePromise<MaybeDocument>> = [];

    let changedKeys = documentKeySet();

    const range = IDBKeyRange.lowerBound(
      this.lastReturnedDocumentChangesId,
      /*lowerOpen=*/ true
    );

    return documentChangesStore(transaction)
      .iterate({ range }, (_, documentChange) => {
        changedKeys = changedKeys.unionWith(
          this.serializer.fromDbResourcePaths(documentChange.changes)
        );
        this.lastReturnedDocumentChangesId = documentChange.id;
      })
      .next(() => {
        changedKeys.forEach(key => {
          documentPromises.push(
            this.getEntry(transaction, key).next(
              maybeDoc =>
                maybeDoc || new NoDocument(key, SnapshotVersion.forDeletedDoc())
            )
          );
        });
      })
      .next(() => PersistencePromise.map(documentPromises));
  }
}

/**
 * Helper to get a typed SimpleDbStore for the remoteDocuments object store.
 */
function remoteDocumentsStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbRemoteDocumentKey, DbRemoteDocument> {
  return SimpleDb.getStore<DbRemoteDocumentKey, DbRemoteDocument>(
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
  return SimpleDb.getStore<DbRemoteDocumentChangesKey, DbRemoteDocumentChanges>(
    txn,
    DbRemoteDocumentChanges.store
  );
}
function dbKey(docKey: DocumentKey): DbRemoteDocumentKey {
  return docKey.path.toArray();
}
