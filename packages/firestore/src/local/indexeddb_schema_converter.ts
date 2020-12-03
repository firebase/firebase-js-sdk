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

import { DocumentKey, ResourcePath } from '../model/path';
import {
  decodeResourcePath,
  encodeResourcePath
} from './encoded_resource_path';
import { SimpleDbSchemaConverter, SimpleDbTransaction } from './simple_db';
import {
  fromDbMutationBatch,
  fromDbTarget,
  LocalSerializer,
  toDbTarget
} from './local_serializer';
import { PersistencePromise } from './persistence_promise';
import { debugAssert, fail, hardAssert } from '../util/assert';
import { MemoryCollectionParentIndex } from './memory_index_manager';
import { SnapshotVersion } from '../core/snapshot_version';
import {
  DbBundle,
  DbClientMetadata,
  DbCollectionParent,
  DbCollectionParentKey,
  DbDocumentMutation,
  DbDocumentMutationKey,
  DbMutationBatch,
  DbMutationBatchKey,
  DbMutationQueue,
  DbMutationQueueKey,
  DbNamedQuery,
  DbPrimaryClient,
  DbRemoteDocument,
  DbRemoteDocumentGlobal,
  DbRemoteDocumentGlobalKey,
  DbRemoteDocumentKey,
  DbTarget,
  DbTargetDocument,
  DbTargetDocumentKey,
  DbTargetGlobal,
  DbTargetGlobalKey,
  DbTargetKey,
  SCHEMA_VERSION
} from './indexeddb_schema';

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
    hardAssert(
      fromVersion < toVersion &&
        fromVersion >= 0 &&
        toVersion <= SCHEMA_VERSION,
      `Unexpected schema upgrade from v${fromVersion} to v${toVersion}.`
    );

    const simpleDbTransaction = new SimpleDbTransaction('createOrUpgrade', txn);

    if (fromVersion < 1 && toVersion >= 1) {
      createPrimaryClientStore(db);
      createMutationQueue(db);
      createQueryCache(db);
      createRemoteDocumentCache(db);
    }

    // Migration 2 to populate the targetGlobal object no longer needed since
    // migration 3 unconditionally clears it.

    let p = PersistencePromise.resolve();
    if (fromVersion < 3 && toVersion >= 3) {
      // Brand new clients don't need to drop and recreate--only clients that
      // potentially have corrupt data.
      if (fromVersion !== 0) {
        dropQueryCache(db);
        createQueryCache(db);
      }
      p = p.next(() => writeEmptyTargetGlobalEntry(simpleDbTransaction));
    }

    if (fromVersion < 4 && toVersion >= 4) {
      if (fromVersion !== 0) {
        // Schema version 3 uses auto-generated keys to generate globally unique
        // mutation batch IDs (this was previously ensured internally by the
        // client). To migrate to the new schema, we have to read all mutations
        // and write them back out. We preserve the existing batch IDs to guarantee
        // consistency with other object stores. Any further mutation batch IDs will
        // be auto-generated.
        p = p.next(() =>
          upgradeMutationBatchSchemaAndMigrateData(db, simpleDbTransaction)
        );
      }

      p = p.next(() => {
        createClientMetadataStore(db);
      });
    }

    if (fromVersion < 5 && toVersion >= 5) {
      p = p.next(() => this.removeAcknowledgedMutations(simpleDbTransaction));
    }

    if (fromVersion < 6 && toVersion >= 6) {
      p = p.next(() => {
        createDocumentGlobalStore(db);
        return this.addDocumentGlobal(simpleDbTransaction);
      });
    }

    if (fromVersion < 7 && toVersion >= 7) {
      p = p.next(() => this.ensureSequenceNumbers(simpleDbTransaction));
    }

    if (fromVersion < 8 && toVersion >= 8) {
      p = p.next(() =>
        this.createCollectionParentIndex(db, simpleDbTransaction)
      );
    }

    if (fromVersion < 9 && toVersion >= 9) {
      p = p.next(() => {
        // Multi-Tab used to manage its own changelog, but this has been moved
        // to the DbRemoteDocument object store itself. Since the previous change
        // log only contained transient data, we can drop its object store.
        dropRemoteDocumentChangesStore(db);
        createRemoteDocumentReadTimeIndex(txn);
      });
    }

    if (fromVersion < 10 && toVersion >= 10) {
      p = p.next(() => this.rewriteCanonicalIds(simpleDbTransaction));
    }

    if (fromVersion < 11 && toVersion >= 11) {
      p = p.next(() => {
        createBundlesStore(db);
        createNamedQueriesStore(db);
      });
    }
    return p;
  }

  private addDocumentGlobal(
    txn: SimpleDbTransaction
  ): PersistencePromise<void> {
    let byteCount = 0;
    return txn
      .store<DbRemoteDocumentKey, DbRemoteDocument>(DbRemoteDocument.store)
      .iterate((_, doc) => {
        byteCount += dbDocumentSize(doc);
      })
      .next(() => {
        const metadata = new DbRemoteDocumentGlobal(byteCount);
        return txn
          .store<DbRemoteDocumentGlobalKey, DbRemoteDocumentGlobal>(
            DbRemoteDocumentGlobal.store
          )
          .put(DbRemoteDocumentGlobal.key, metadata);
      });
  }

  private removeAcknowledgedMutations(
    txn: SimpleDbTransaction
  ): PersistencePromise<void> {
    const queuesStore = txn.store<DbMutationQueueKey, DbMutationQueue>(
      DbMutationQueue.store
    );
    const mutationsStore = txn.store<DbMutationBatchKey, DbMutationBatch>(
      DbMutationBatch.store
    );

    return queuesStore.loadAll().next(queues => {
      return PersistencePromise.forEach(queues, (queue: DbMutationQueue) => {
        const range = IDBKeyRange.bound(
          [queue.userId, Number.MIN_SAFE_INTEGER],
          [queue.userId, queue.lastAcknowledgedBatchId]
        );

        return mutationsStore
          .loadAll(DbMutationBatch.userMutationsIndex, range)
          .next(dbBatches => {
            return PersistencePromise.forEach(
              dbBatches,
              (dbBatch: DbMutationBatch) => {
                hardAssert(
                  dbBatch.userId === queue.userId,
                  `Cannot process batch ${dbBatch.batchId} from unexpected user`
                );
                const batch = fromDbMutationBatch(this.serializer, dbBatch);

                return removeMutationBatch(
                  txn,
                  queue.userId,
                  batch
                ).next(() => {});
              }
            );
          });
      });
    });
  }

  /**
   * Ensures that every document in the remote document cache has a corresponding sentinel row
   * with a sequence number. Missing rows are given the most recently used sequence number.
   */
  private ensureSequenceNumbers(
    txn: SimpleDbTransaction
  ): PersistencePromise<void> {
    const documentTargetStore = txn.store<
      DbTargetDocumentKey,
      DbTargetDocument
    >(DbTargetDocument.store);
    const documentsStore = txn.store<DbRemoteDocumentKey, DbRemoteDocument>(
      DbRemoteDocument.store
    );
    const globalTargetStore = txn.store<DbTargetGlobalKey, DbTargetGlobal>(
      DbTargetGlobal.store
    );

    return globalTargetStore.get(DbTargetGlobal.key).next(metadata => {
      debugAssert(
        !!metadata,
        'Metadata should have been written during the version 3 migration'
      );
      const writeSentinelKey = (
        path: ResourcePath
      ): PersistencePromise<void> => {
        return documentTargetStore.put(
          new DbTargetDocument(
            0,
            encodeResourcePath(path),
            metadata!.highestListenSequenceNumber!
          )
        );
      };

      const promises: Array<PersistencePromise<void>> = [];
      return documentsStore
        .iterate((key, doc) => {
          const path = new ResourcePath(key);
          const docSentinelKey = sentinelKey(path);
          promises.push(
            documentTargetStore.get(docSentinelKey).next(maybeSentinel => {
              if (!maybeSentinel) {
                return writeSentinelKey(path);
              } else {
                return PersistencePromise.resolve();
              }
            })
          );
        })
        .next(() => PersistencePromise.waitFor(promises));
    });
  }

  private createCollectionParentIndex(
    db: IDBDatabase,
    txn: SimpleDbTransaction
  ): PersistencePromise<void> {
    // Create the index.
    db.createObjectStore(DbCollectionParent.store, {
      keyPath: DbCollectionParent.keyPath
    });

    const collectionParentsStore = txn.store<
      DbCollectionParentKey,
      DbCollectionParent
    >(DbCollectionParent.store);

    // Helper to add an index entry iff we haven't already written it.
    const cache = new MemoryCollectionParentIndex();
    const addEntry = (
      collectionPath: ResourcePath
    ): PersistencePromise<void> | undefined => {
      if (cache.add(collectionPath)) {
        const collectionId = collectionPath.lastSegment();
        const parentPath = collectionPath.popLast();
        return collectionParentsStore.put({
          collectionId,
          parent: encodeResourcePath(parentPath)
        });
      }
    };

    // Index existing remote documents.
    return txn
      .store<DbRemoteDocumentKey, DbRemoteDocument>(DbRemoteDocument.store)
      .iterate({ keysOnly: true }, (pathSegments, _) => {
        const path = new ResourcePath(pathSegments);
        return addEntry(path.popLast());
      })
      .next(() => {
        // Index existing mutations.
        return txn
          .store<DbDocumentMutationKey, DbDocumentMutation>(
            DbDocumentMutation.store
          )
          .iterate({ keysOnly: true }, ([userID, encodedPath, batchId], _) => {
            const path = decodeResourcePath(encodedPath);
            return addEntry(path.popLast());
          });
      });
  }

  private rewriteCanonicalIds(
    txn: SimpleDbTransaction
  ): PersistencePromise<void> {
    const targetStore = txn.store<DbTargetKey, DbTarget>(DbTarget.store);
    return targetStore.iterate((key, originalDbTarget) => {
      const originalTargetData = fromDbTarget(originalDbTarget);
      const updatedDbTarget = toDbTarget(this.serializer, originalTargetData);
      return targetStore.put(updatedDbTarget);
    });
  }
}

/**
 * Delete a mutation batch and the associated document mutations.
 * @returns A PersistencePromise of the document mutations that were removed.
 */
export function removeMutationBatch(
  txn: SimpleDbTransaction,
  userId: string,
  batch: { batchId: number; mutations: Array<{ key: DocumentKey }> }
): PersistencePromise<DocumentKey[]> {
  const mutationStore = txn.store<DbMutationBatchKey, DbMutationBatch>(
    DbMutationBatch.store
  );
  const indexTxn = txn.store<DbDocumentMutationKey, DbDocumentMutation>(
    DbDocumentMutation.store
  );
  const promises: Array<PersistencePromise<void>> = [];

  const range = IDBKeyRange.only(batch.batchId);
  let numDeleted = 0;
  const removePromise = mutationStore.iterate(
    { range },
    (key, value, control) => {
      numDeleted++;
      return control.delete();
    }
  );
  promises.push(
    removePromise.next(() => {
      hardAssert(
        numDeleted === 1,
        'Dangling document-mutation reference found: Missing batch ' +
          batch.batchId
      );
    })
  );
  const removedDocuments: DocumentKey[] = [];
  for (const mutation of batch.mutations) {
    const indexKey = DbDocumentMutation.key(
      userId,
      mutation.key.path,
      batch.batchId
    );
    promises.push(indexTxn.delete(indexKey));
    removedDocuments.push(mutation.key);
  }
  return PersistencePromise.waitFor(promises).next(() => removedDocuments);
}

/**
 * Returns an approximate size for the given document.
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

function sentinelKey(path: ResourcePath): DbTargetDocumentKey {
  return [0, encodeResourcePath(path)];
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

/**
 * Upgrade function to migrate the 'mutations' store from V1 to V3. Loads
 * and rewrites all data.
 */
function upgradeMutationBatchSchemaAndMigrateData(
  db: IDBDatabase,
  txn: SimpleDbTransaction
): PersistencePromise<void> {
  const v1MutationsStore = txn.store<[string, number], DbMutationBatch>(
    DbMutationBatch.store
  );
  return v1MutationsStore.loadAll().next(existingMutations => {
    db.deleteObjectStore(DbMutationBatch.store);

    const mutationsStore = db.createObjectStore(DbMutationBatch.store, {
      keyPath: DbMutationBatch.keyPath,
      autoIncrement: true
    });
    mutationsStore.createIndex(
      DbMutationBatch.userMutationsIndex,
      DbMutationBatch.userMutationsKeyPath,
      { unique: true }
    );

    const v3MutationsStore = txn.store<DbMutationBatchKey, DbMutationBatch>(
      DbMutationBatch.store
    );
    const writeAll = existingMutations.map(mutation =>
      v3MutationsStore.put(mutation)
    );

    return PersistencePromise.waitFor(writeAll);
  });
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

function dropQueryCache(db: IDBDatabase): void {
  db.deleteObjectStore(DbTargetDocument.store);
  db.deleteObjectStore(DbTarget.store);
  db.deleteObjectStore(DbTargetGlobal.store);
}

function dropRemoteDocumentChangesStore(db: IDBDatabase): void {
  if (db.objectStoreNames.contains('remoteDocumentChanges')) {
    db.deleteObjectStore('remoteDocumentChanges');
  }
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
