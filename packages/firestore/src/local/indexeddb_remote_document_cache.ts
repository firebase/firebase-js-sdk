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
  DocumentKeySet,
  DocumentMap,
  documentMap
} from '../model/collections';
import { Document, MaybeDocument, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { fail } from '../util/assert';

import {
  DbRemoteDocument,
  DbRemoteDocumentKey,
  DbSnapshotChange,
  DbSnapshotChangeKey
} from './indexeddb_schema';
import { LocalSerializer } from './local_serializer';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { RemoteDocumentCache } from './remote_document_cache';
import { SimpleDbStore, SimpleDbTransaction } from './simple_db';
import { SnapshotVersion } from '../core/snapshot_version';
import { SortedMap } from '../util/sorted_map';

export class IndexedDbRemoteDocumentCache implements RemoteDocumentCache {
  constructor(private serializer: LocalSerializer) {}

  addEntries(
    transaction: PersistenceTransaction,
    maybeDocuments: MaybeDocument[]
  ): PersistencePromise<void> {
    const promises: Array<PersistencePromise<void>> = [];
    const documentStore = remoteDocumentsStore(transaction);

    let accumulatedChanges = new SortedMap<SnapshotVersion, DocumentKeySet>(
      SnapshotVersion.comparator
    );

    for (const maybeDocument of maybeDocuments) {
      promises.push(
        documentStore.put(
          dbKey(maybeDocument.key),
          this.serializer.toDbRemoteDocument(maybeDocument)
        )
      );

      const existingChanges =
        accumulatedChanges.get(maybeDocument.version) || documentKeySet();
      accumulatedChanges = accumulatedChanges.insert(
        maybeDocument.version,
        existingChanges.add(maybeDocument.key)
      );
    }

    promises.push(this.persistChanges(transaction, accumulatedChanges));

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

  getDocumentsChangedSince(
    transaction: PersistenceTransaction,
    snapshotVersion: SnapshotVersion
  ): PersistencePromise<MaybeDocument[]> {
    const documentPromises: Array<PersistencePromise<MaybeDocument>> = [];

    let changedKeys = documentKeySet();

    const range = IDBKeyRange.lowerBound(
      this.serializer.toTimestampArray(snapshotVersion.toTimestamp()),
      /*lowerOpen=*/ false
    );

    return snapshotChangeStore(transaction)
      .iterate({ range }, (_, snapshotChange) => {
        changedKeys = changedKeys.unionWith(
          this.serializer.fromDbResourcePaths(snapshotChange.changes)
        );
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

  private persistChanges(
    transaction: PersistenceTransaction,
    changes: SortedMap<SnapshotVersion, DocumentKeySet>
  ): PersistencePromise<void> {
    const changesStore = snapshotChangeStore(transaction);

    const promises: Array<PersistencePromise<void>> = [];

    changes.forEach((snapshotVersion, changedKeys) => {
      const timestamp = this.serializer.toTimestampArray(
        snapshotVersion.toTimestamp()
      );

      const appendChanges = changesStore
        .get(timestamp)
        .next(maybeChanges => (maybeChanges ? maybeChanges.changes : []))
        .next(existingChanges => {
          changedKeys = changedKeys.unionWith(
            this.serializer.fromDbResourcePaths(existingChanges)
          );
          return changesStore.put(
            this.serializer.toDbSnapshotChange(snapshotVersion, changedKeys)
          );
        });

      promises.push(appendChanges);
    });

    return PersistencePromise.waitFor(promises);
  }
}

/**
 * Helper to get a typed SimpleDbStore for the remoteDocuments object store.
 */
function remoteDocumentsStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbRemoteDocumentKey, DbRemoteDocument> {
  return getStore<DbRemoteDocumentKey, DbRemoteDocument>(
    txn,
    DbRemoteDocument.store
  );
}

/**
 * Helper to get a typed SimpleDbStore for the snapshotChanges object store.
 */
function snapshotChangeStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbSnapshotChangeKey, DbSnapshotChange> {
  return getStore<DbSnapshotChangeKey, DbSnapshotChange>(
    txn,
    DbSnapshotChange.store
  );
}

/**
 * Helper to get a typed SimpleDbStore from a transaction.
 */
function getStore<KeyType extends IDBValidKey, ValueType>(
  txn: PersistenceTransaction,
  store: string
): SimpleDbStore<KeyType, ValueType> {
  if (txn instanceof SimpleDbTransaction) {
    return txn.store<KeyType, ValueType>(store);
  } else {
    return fail('Invalid transaction object provided!');
  }
}

function dbKey(docKey: DocumentKey): DbRemoteDocumentKey {
  return docKey.path.toArray();
}
