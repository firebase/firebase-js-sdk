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
import { DocumentMap, documentMap } from '../model/collections';
import { Document, MaybeDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';

import { DbRemoteDocument, DbRemoteDocumentKey } from './indexeddb_schema';
import { LocalSerializer } from './local_serializer';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { RemoteDocumentCache } from './remote_document_cache';
import { SimpleDb, SimpleDbStore } from './simple_db';

export class IndexedDbRemoteDocumentCache implements RemoteDocumentCache {
  constructor(private serializer: LocalSerializer) {}

  addEntry(
    transaction: PersistenceTransaction,
    maybeDocument: MaybeDocument
  ): PersistencePromise<void> {
    return remoteDocumentsStore(transaction).put(
      dbKey(maybeDocument.key),
      this.serializer.toDbRemoteDocument(maybeDocument)
    );
  }

  removeEntry(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<void> {
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

function dbKey(docKey: DocumentKey): DbRemoteDocumentKey {
  return docKey.path.toArray();
}
