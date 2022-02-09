/**
 * @license
 * Copyright 2020 Google LLC
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

import { SnapshotVersion } from '../core/snapshot_version';
import { debugAssert } from '../util/assert';

import {
  DbBundle,
  DbClientMetadata,
  DbCollectionParent,
  DbDocumentMutation,
  DbIndexConfiguration,
  DbIndexEntries,
  DbIndexState,
  DbMutationBatch,
  DbMutationQueue,
  DbNamedQuery,
  DbPrimaryClient,
  DbRemoteDocument,
  DbRemoteDocumentGlobal,
  DbRemoteDocumentGlobalKey,
  DbTarget,
  DbTargetDocument,
  DbTargetGlobal,
  DbTargetGlobalKey
} from './indexeddb_schema';
import { LocalSerializer } from './local_serializer';
import { PersistencePromise } from './persistence_promise';
import { SimpleDbSchemaConverter, SimpleDbTransaction } from './simple_db';

/** Performs database creation and schema upgrades. */
export class SchemaConverter implements SimpleDbSchemaConverter {
  constructor(private readonly serializer: LocalSerializer) {}

  /**
   * Performs database creation and schema upgrades.
   *
   * Note that in production, this method is only ever used to upgrade the schema
   * to SCHEMA_VERSION. Different values of toVersion are only used for testing
   * and local feature development.
   */
  createOrUpgrade(
    db: IDBDatabase,
    txn: IDBTransaction,
    fromVersion: number,
    toVersion: number
  ): PersistencePromise<void> {
    debugAssert(
      fromVersion < toVersion && fromVersion >= 0 && toVersion === 13,
      `Unexpected schema upgrade from v${fromVersion} to v${toVersion}.`
    );

    const simpleDbTransaction = new SimpleDbTransaction('createOrUpgrade', txn);

    let p = PersistencePromise.resolve();
    if (fromVersion < 13 && toVersion >= 13) {
      dropAllStores(db);
      createPrimaryClientStore(db);
      createMutationQueue(db);
      createQueryCache(db);
      createRemoteDocumentCache(db);
      createCollectionParentStore(db);
      createClientMetadataStore(db);
      createDocumentGlobalStore(db);
      createRemoteDocumentReadTimeIndex(txn);
      createBundlesStore(db);
      createNamedQueriesStore(db);
      createFieldIndex(db);
      p = p.next(() => writeEmptyTargetGlobalEntry(simpleDbTransaction));
      p = p.next(() => writreDocumentGlobalEntry(simpleDbTransaction));
    }
    return p;
  }
}

function dropAllStores(db: IDBDatabase): void {
  for (let i = 0; i < db.objectStoreNames.length; ++i) {
    db.deleteObjectStore(db.objectStoreNames[i]);
  }
}

function createCollectionParentStore(db: IDBDatabase) : void{
  db.createObjectStore(DbCollectionParent.store, {
    keyPath: DbCollectionParent.keyPath
  });
}

function createPrimaryClientStore(db: IDBDatabase): void {
  db.createObjectStore(DbPrimaryClient.store);
}

function createMutationQueue(db: IDBDatabase): void {
  db.createObjectStore(DbMutationQueue.store, {
    keyPath: DbMutationQueue.keyPath
  });

  const mutationBatchesStore = db.createObjectStore(DbMutationBatch.store, {
    keyPath: DbMutationBatch.keyPath,
    autoIncrement: true
  });
  mutationBatchesStore.createIndex(
    DbMutationBatch.userMutationsIndex,
    DbMutationBatch.userMutationsKeyPath,
    { unique: true }
  );

  db.createObjectStore(DbDocumentMutation.store);
}

function createRemoteDocumentCache(db: IDBDatabase): void {
  db.createObjectStore(DbRemoteDocument.store);
}

function createDocumentGlobalStore(db: IDBDatabase): void {
  db.createObjectStore(DbRemoteDocumentGlobal.store);
}

function createQueryCache(db: IDBDatabase): void {
  const targetDocumentsStore = db.createObjectStore(DbTargetDocument.store, {
    keyPath: DbTargetDocument.keyPath
  });
  targetDocumentsStore.createIndex(
    DbTargetDocument.documentTargetsIndex,
    DbTargetDocument.documentTargetsKeyPath,
    { unique: true }
  );

  const targetStore = db.createObjectStore(DbTarget.store, {
    keyPath: DbTarget.keyPath
  });

  // NOTE: This is unique only because the TargetId is the suffix.
  targetStore.createIndex(
    DbTarget.queryTargetsIndexName,
    DbTarget.queryTargetsKeyPath,
    { unique: true }
  );
  db.createObjectStore(DbTargetGlobal.store);
}

/**
 * Creates the target global singleton row.
 *
 * @param txn - The version upgrade transaction for indexeddb
 */
function writeEmptyTargetGlobalEntry(
  txn: SimpleDbTransaction
): PersistencePromise<void> {
  const globalStore = txn.store<DbTargetGlobalKey, DbTargetGlobal>(
    DbTargetGlobal.store
  );
  const metadata = new DbTargetGlobal(
    /*highestTargetId=*/ 0,
    /*lastListenSequenceNumber=*/ 0,
    SnapshotVersion.min().toTimestamp(),
    /*targetCount=*/ 0
  );
  return globalStore.put(DbTargetGlobal.key, metadata);
}

function writreDocumentGlobalEntry(
  txn: SimpleDbTransaction
): PersistencePromise<void> {
  const metadata = new DbRemoteDocumentGlobal(0);
  return txn
    .store<DbRemoteDocumentGlobalKey, DbRemoteDocumentGlobal>(
      DbRemoteDocumentGlobal.store
    )
    .put(DbRemoteDocumentGlobal.key, metadata);
}

/**
 * Creates indices on the RemoteDocuments store used for both multi-tab
 * and Index-Free queries.
 */
function createRemoteDocumentReadTimeIndex(txn: IDBTransaction): void {
  const remoteDocumentStore = txn.objectStore(DbRemoteDocument.store);
  remoteDocumentStore.createIndex(
    DbRemoteDocument.readTimeIndex,
    DbRemoteDocument.readTimeIndexPath,
    { unique: false }
  );
  remoteDocumentStore.createIndex(
    DbRemoteDocument.collectionReadTimeIndex,
    DbRemoteDocument.collectionReadTimeIndexPath,
    { unique: false }
  );
}

function createClientMetadataStore(db: IDBDatabase): void {
  db.createObjectStore(DbClientMetadata.store, {
    keyPath: DbClientMetadata.keyPath
  });
}

function createBundlesStore(db: IDBDatabase): void {
  db.createObjectStore(DbBundle.store, {
    keyPath: DbBundle.keyPath
  });
}

function createNamedQueriesStore(db: IDBDatabase): void {
  db.createObjectStore(DbNamedQuery.store, {
    keyPath: DbNamedQuery.keyPath
  });
}

function createFieldIndex(db: IDBDatabase): void {
  db.createObjectStore(DbIndexConfiguration.store, {
    keyPath: DbIndexConfiguration.keyPath
  });
  db.createObjectStore(DbIndexState.store, {
    keyPath: DbIndexState.keyPath
  });
  db.createObjectStore(DbIndexEntries.store, {
    keyPath: DbIndexEntries.keyPath
  });
}
