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

import { User } from '../auth/user';
import { ListenSequence } from '../core/listen_sequence';
import { SnapshotVersion } from '../core/snapshot_version';
import { DocumentKeySet, documentKeySet } from '../model/collections';
import { DocumentKey } from '../model/document_key';
import { ResourcePath } from '../model/path';
import { debugAssert, fail, hardAssert } from '../util/assert';
import { BATCHID_UNKNOWN } from '../util/types';

import {
  decodeResourcePath,
  encodeResourcePath
} from './encoded_resource_path';
import { IndexedDbDocumentOverlayCache } from './indexeddb_document_overlay_cache';
import {
  dbDocumentSize,
  removeMutationBatch
} from './indexeddb_mutation_batch_impl';
import { IndexedDbMutationQueue } from './indexeddb_mutation_queue';
import { newIndexedDbRemoteDocumentCache } from './indexeddb_remote_document_cache';
import {
  DbCollectionParent,
  DbDocumentMutation,
  DbMutationBatch,
  DbMutationQueue,
  DbRemoteDocument,
  DbRemoteDocumentGlobal,
  DbTarget,
  DbTargetDocument,
  DbTargetGlobal,
  SCHEMA_VERSION
} from './indexeddb_schema';
import {
  DbRemoteDocument as DbRemoteDocumentLegacy,
  DbRemoteDocumentStore as DbRemoteDocumentStoreLegacy,
  DbRemoteDocumentKey as DbRemoteDocumentKeyLegacy
} from './indexeddb_schema_legacy';
import {
  DbBundleKeyPath,
  DbBundleStore,
  DbClientMetadataKeyPath,
  DbClientMetadataStore,
  DbCollectionParentKey,
  DbCollectionParentKeyPath,
  DbCollectionParentStore,
  DbDocumentMutationKey,
  DbDocumentMutationStore,
  DbDocumentOverlayCollectionGroupOverlayIndex,
  DbDocumentOverlayCollectionGroupOverlayIndexPath,
  DbDocumentOverlayCollectionPathOverlayIndex,
  DbDocumentOverlayCollectionPathOverlayIndexPath,
  DbDocumentOverlayKeyPath,
  DbDocumentOverlayStore,
  DbIndexConfigurationCollectionGroupIndex,
  DbIndexConfigurationCollectionGroupIndexPath,
  DbIndexConfigurationKeyPath,
  DbIndexConfigurationStore,
  DbIndexEntryDocumentKeyIndex,
  DbIndexEntryDocumentKeyIndexPath,
  DbIndexEntryKeyPath,
  DbIndexEntryStore,
  DbIndexStateKeyPath,
  DbIndexStateSequenceNumberIndex,
  DbIndexStateSequenceNumberIndexPath,
  DbIndexStateStore,
  DbMutationBatchKey,
  DbMutationBatchKeyPath,
  DbMutationBatchStore,
  DbMutationBatchUserMutationsIndex,
  DbMutationBatchUserMutationsKeyPath,
  DbMutationQueueKey,
  DbMutationQueueKeyPath,
  DbMutationQueueStore,
  DbNamedQueryKeyPath,
  DbNamedQueryStore,
  DbPrimaryClientStore,
  DbRemoteDocumentCollectionGroupIndex,
  DbRemoteDocumentCollectionGroupIndexPath,
  DbRemoteDocumentDocumentKeyIndex,
  DbRemoteDocumentDocumentKeyIndexPath,
  DbRemoteDocumentGlobalKey,
  DbRemoteDocumentGlobalStore,
  DbRemoteDocumentKey,
  DbRemoteDocumentKeyPath,
  DbRemoteDocumentStore,
  DbTargetDocumentDocumentTargetsIndex,
  DbTargetDocumentDocumentTargetsKeyPath,
  DbTargetDocumentKey,
  DbTargetDocumentKeyPath,
  DbTargetDocumentStore,
  DbTargetGlobalKey,
  DbTargetGlobalStore,
  DbTargetKey,
  DbTargetKeyPath,
  DbTargetQueryTargetsIndexName,
  DbTargetQueryTargetsKeyPath,
  DbTargetStore
} from './indexeddb_sentinels';
import { IndexedDbTransaction } from './indexeddb_transaction';
import { LocalDocumentsView } from './local_documents_view';
import {
  fromDbMutationBatch,
  fromDbTarget,
  LocalSerializer,
  toDbTarget
} from './local_serializer';
import { MemoryCollectionParentIndex } from './memory_index_manager';
import { MemoryEagerDelegate, MemoryPersistence } from './memory_persistence';
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
      createLegacyRemoteDocumentCache(db);
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

        // Note: Schema version 9 used to create a read time index for the
        // RemoteDocumentCache. This is now done with schema version 13.
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

    if (fromVersion < 12 && toVersion >= 12) {
      p = p.next(() => {
        createDocumentOverlayStore(db);
      });
    }

    if (fromVersion < 13 && toVersion >= 13) {
      p = p
        .next(() => createRemoteDocumentCache(db))
        .next(() => this.rewriteRemoteDocumentCache(db, simpleDbTransaction))
        .next(() => db.deleteObjectStore(DbRemoteDocumentStoreLegacy));
    }

    if (fromVersion < 14 && toVersion >= 14) {
      p = p.next(() => this.runOverlayMigration(db, simpleDbTransaction));
    }

    if (fromVersion < 15 && toVersion >= 15) {
      p = p.next(() => createFieldIndex(db));
    }

    return p;
  }

  private addDocumentGlobal(
    txn: SimpleDbTransaction
  ): PersistencePromise<void> {
    let byteSize = 0;
    return txn
      .store<DbRemoteDocumentKeyLegacy, DbRemoteDocumentLegacy>(
        DbRemoteDocumentStoreLegacy
      )
      .iterate((_, doc) => {
        byteSize += dbDocumentSize(doc);
      })
      .next(() => {
        const metadata: DbRemoteDocumentGlobal = { byteSize };
        return txn
          .store<DbRemoteDocumentGlobalKey, DbRemoteDocumentGlobal>(
            DbRemoteDocumentGlobalStore
          )
          .put(DbRemoteDocumentGlobalKey, metadata);
      });
  }

  private removeAcknowledgedMutations(
    txn: SimpleDbTransaction
  ): PersistencePromise<void> {
    const queuesStore = txn.store<DbMutationQueueKey, DbMutationQueue>(
      DbMutationQueueStore
    );
    const mutationsStore = txn.store<DbMutationBatchKey, DbMutationBatch>(
      DbMutationBatchStore
    );

    return queuesStore.loadAll().next(queues => {
      return PersistencePromise.forEach(queues, (queue: DbMutationQueue) => {
        const range = IDBKeyRange.bound(
          [queue.userId, BATCHID_UNKNOWN],
          [queue.userId, queue.lastAcknowledgedBatchId]
        );

        return mutationsStore
          .loadAll(DbMutationBatchUserMutationsIndex, range)
          .next(dbBatches => {
            return PersistencePromise.forEach(
              dbBatches,
              (dbBatch: DbMutationBatch) => {
                hardAssert(
                  dbBatch.userId === queue.userId,
                  `Cannot process batch ${dbBatch.batchId} from unexpected user`
                );
                const batch = fromDbMutationBatch(this.serializer, dbBatch);

                return removeMutationBatch(txn, queue.userId, batch).next(
                  () => {}
                );
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
    >(DbTargetDocumentStore);
    const documentsStore = txn.store<
      DbRemoteDocumentKeyLegacy,
      DbRemoteDocumentKeyLegacy
    >(DbRemoteDocumentStoreLegacy);
    const globalTargetStore = txn.store<DbTargetGlobalKey, DbTargetGlobal>(
      DbTargetGlobalStore
    );

    return globalTargetStore.get(DbTargetGlobalKey).next(metadata => {
      debugAssert(
        !!metadata,
        'Metadata should have been written during the version 3 migration'
      );
      const writeSentinelKey = (
        path: ResourcePath
      ): PersistencePromise<void> => {
        return documentTargetStore.put({
          targetId: 0,
          path: encodeResourcePath(path),
          sequenceNumber: metadata!.highestListenSequenceNumber!
        });
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
    db.createObjectStore(DbCollectionParentStore, {
      keyPath: DbCollectionParentKeyPath
    });

    const collectionParentsStore = txn.store<
      DbCollectionParentKey,
      DbCollectionParent
    >(DbCollectionParentStore);

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
      .store<DbRemoteDocumentKeyLegacy, DbRemoteDocumentLegacy>(
        DbRemoteDocumentStoreLegacy
      )
      .iterate({ keysOnly: true }, (pathSegments, _) => {
        const path = new ResourcePath(pathSegments);
        return addEntry(path.popLast());
      })
      .next(() => {
        // Index existing mutations.
        return txn
          .store<DbDocumentMutationKey, DbDocumentMutation>(
            DbDocumentMutationStore
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
    const targetStore = txn.store<DbTargetKey, DbTarget>(DbTargetStore);
    return targetStore.iterate((key, originalDbTarget) => {
      const originalTargetData = fromDbTarget(originalDbTarget);
      const updatedDbTarget = toDbTarget(this.serializer, originalTargetData);
      return targetStore.put(updatedDbTarget);
    });
  }

  private rewriteRemoteDocumentCache(
    db: IDBDatabase,
    transaction: SimpleDbTransaction
  ): PersistencePromise<void> {
    const legacyRemoteDocumentStore = transaction.store<
      DbRemoteDocumentKeyLegacy,
      DbRemoteDocumentLegacy
    >(DbRemoteDocumentStoreLegacy);

    const writes: Array<PersistencePromise<void>> = [];
    return legacyRemoteDocumentStore
      .iterate((_, legacyDocument) => {
        const remoteDocumentStore = transaction.store<
          DbRemoteDocumentKey,
          DbRemoteDocument
        >(DbRemoteDocumentStore);

        const path = extractKey(legacyDocument).path.toArray();
        const dbRemoteDocument = {
          prefixPath: path.slice(0, path.length - 2),
          collectionGroup: path[path.length - 2],
          documentId: path[path.length - 1],
          readTime: legacyDocument.readTime || [0, 0],
          unknownDocument: legacyDocument.unknownDocument,
          noDocument: legacyDocument.noDocument,
          document: legacyDocument.document,
          hasCommittedMutations: !!legacyDocument.hasCommittedMutations
        };
        writes.push(remoteDocumentStore.put(dbRemoteDocument));
      })
      .next(() => PersistencePromise.waitFor(writes));
  }

  private runOverlayMigration(
    db: IDBDatabase,
    transaction: SimpleDbTransaction
  ): PersistencePromise<void> {
    const mutationsStore = transaction.store<
      DbMutationBatchKey,
      DbMutationBatch
    >(DbMutationBatchStore);

    const remoteDocumentCache = newIndexedDbRemoteDocumentCache(
      this.serializer
    );
    const memoryPersistence = new MemoryPersistence(
      MemoryEagerDelegate.factory,
      this.serializer.remoteSerializer
    );

    return mutationsStore.loadAll().next(dbBatches => {
      const userToDocumentSet = new Map<string, DocumentKeySet>();
      dbBatches.forEach(dbBatch => {
        let documentSet =
          userToDocumentSet.get(dbBatch.userId) ?? documentKeySet();
        const batch = fromDbMutationBatch(this.serializer, dbBatch);
        batch.keys().forEach(key => (documentSet = documentSet.add(key)));
        userToDocumentSet.set(dbBatch.userId, documentSet);
      });
      return PersistencePromise.forEach(
        userToDocumentSet,
        (allDocumentKeysForUser, userId) => {
          const user = new User(userId);
          const documentOverlayCache = IndexedDbDocumentOverlayCache.forUser(
            this.serializer,
            user
          );
          // NOTE: The index manager and the reference delegate are
          // irrelevant for the purpose of recalculating and saving
          // overlays. We can therefore simply use the memory
          // implementation.
          const indexManager = memoryPersistence.getIndexManager(user);
          const mutationQueue = IndexedDbMutationQueue.forUser(
            user,
            this.serializer,
            indexManager,
            memoryPersistence.referenceDelegate
          );
          const localDocumentsView = new LocalDocumentsView(
            remoteDocumentCache,
            mutationQueue,
            documentOverlayCache,
            indexManager
          );
          return localDocumentsView
            .recalculateAndSaveOverlaysForDocumentKeys(
              new IndexedDbTransaction(transaction, ListenSequence.INVALID),
              allDocumentKeysForUser
            )
            .next();
        }
      );
    });
  }
}

function sentinelKey(path: ResourcePath): DbTargetDocumentKey {
  return [0, encodeResourcePath(path)];
}

function createPrimaryClientStore(db: IDBDatabase): void {
  db.createObjectStore(DbPrimaryClientStore);
}

function createMutationQueue(db: IDBDatabase): void {
  db.createObjectStore(DbMutationQueueStore, {
    keyPath: DbMutationQueueKeyPath
  });

  const mutationBatchesStore = db.createObjectStore(DbMutationBatchStore, {
    keyPath: DbMutationBatchKeyPath,
    autoIncrement: true
  });
  mutationBatchesStore.createIndex(
    DbMutationBatchUserMutationsIndex,
    DbMutationBatchUserMutationsKeyPath,
    { unique: true }
  );

  db.createObjectStore(DbDocumentMutationStore);
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
    DbMutationBatchStore
  );
  return v1MutationsStore.loadAll().next(existingMutations => {
    db.deleteObjectStore(DbMutationBatchStore);

    const mutationsStore = db.createObjectStore(DbMutationBatchStore, {
      keyPath: DbMutationBatchKeyPath,
      autoIncrement: true
    });
    mutationsStore.createIndex(
      DbMutationBatchUserMutationsIndex,
      DbMutationBatchUserMutationsKeyPath,
      { unique: true }
    );

    const v3MutationsStore = txn.store<DbMutationBatchKey, DbMutationBatch>(
      DbMutationBatchStore
    );
    const writeAll = existingMutations.map(mutation =>
      v3MutationsStore.put(mutation)
    );

    return PersistencePromise.waitFor(writeAll);
  });
}

function createLegacyRemoteDocumentCache(db: IDBDatabase): void {
  db.createObjectStore(DbRemoteDocumentStoreLegacy);
}

function createRemoteDocumentCache(db: IDBDatabase): void {
  const remoteDocumentStore = db.createObjectStore(DbRemoteDocumentStore, {
    keyPath: DbRemoteDocumentKeyPath
  });
  remoteDocumentStore.createIndex(
    DbRemoteDocumentDocumentKeyIndex,
    DbRemoteDocumentDocumentKeyIndexPath
  );
  remoteDocumentStore.createIndex(
    DbRemoteDocumentCollectionGroupIndex,
    DbRemoteDocumentCollectionGroupIndexPath
  );
}

function createDocumentGlobalStore(db: IDBDatabase): void {
  db.createObjectStore(DbRemoteDocumentGlobalStore);
}

function createQueryCache(db: IDBDatabase): void {
  const targetDocumentsStore = db.createObjectStore(DbTargetDocumentStore, {
    keyPath: DbTargetDocumentKeyPath
  });
  targetDocumentsStore.createIndex(
    DbTargetDocumentDocumentTargetsIndex,
    DbTargetDocumentDocumentTargetsKeyPath,
    { unique: true }
  );

  const targetStore = db.createObjectStore(DbTargetStore, {
    keyPath: DbTargetKeyPath
  });

  // NOTE: This is unique only because the TargetId is the suffix.
  targetStore.createIndex(
    DbTargetQueryTargetsIndexName,
    DbTargetQueryTargetsKeyPath,
    { unique: true }
  );
  db.createObjectStore(DbTargetGlobalStore);
}

function dropQueryCache(db: IDBDatabase): void {
  db.deleteObjectStore(DbTargetDocumentStore);
  db.deleteObjectStore(DbTargetStore);
  db.deleteObjectStore(DbTargetGlobalStore);
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
    DbTargetGlobalStore
  );
  const metadata: DbTargetGlobal = {
    highestTargetId: 0,
    highestListenSequenceNumber: 0,
    lastRemoteSnapshotVersion: SnapshotVersion.min().toTimestamp(),
    targetCount: 0
  };
  return globalStore.put(DbTargetGlobalKey, metadata);
}

function createClientMetadataStore(db: IDBDatabase): void {
  db.createObjectStore(DbClientMetadataStore, {
    keyPath: DbClientMetadataKeyPath
  });
}

function createBundlesStore(db: IDBDatabase): void {
  db.createObjectStore(DbBundleStore, {
    keyPath: DbBundleKeyPath
  });
}

function createNamedQueriesStore(db: IDBDatabase): void {
  db.createObjectStore(DbNamedQueryStore, {
    keyPath: DbNamedQueryKeyPath
  });
}

function createFieldIndex(db: IDBDatabase): void {
  const indexConfigurationStore = db.createObjectStore(
    DbIndexConfigurationStore,
    {
      keyPath: DbIndexConfigurationKeyPath,
      autoIncrement: true
    }
  );
  indexConfigurationStore.createIndex(
    DbIndexConfigurationCollectionGroupIndex,
    DbIndexConfigurationCollectionGroupIndexPath,
    { unique: false }
  );

  const indexStateStore = db.createObjectStore(DbIndexStateStore, {
    keyPath: DbIndexStateKeyPath
  });
  indexStateStore.createIndex(
    DbIndexStateSequenceNumberIndex,
    DbIndexStateSequenceNumberIndexPath,
    { unique: false }
  );

  const indexEntryStore = db.createObjectStore(DbIndexEntryStore, {
    keyPath: DbIndexEntryKeyPath
  });
  indexEntryStore.createIndex(
    DbIndexEntryDocumentKeyIndex,
    DbIndexEntryDocumentKeyIndexPath,
    { unique: false }
  );
}

function createDocumentOverlayStore(db: IDBDatabase): void {
  const documentOverlayStore = db.createObjectStore(DbDocumentOverlayStore, {
    keyPath: DbDocumentOverlayKeyPath
  });
  documentOverlayStore.createIndex(
    DbDocumentOverlayCollectionPathOverlayIndex,
    DbDocumentOverlayCollectionPathOverlayIndexPath,
    { unique: false }
  );
  documentOverlayStore.createIndex(
    DbDocumentOverlayCollectionGroupOverlayIndex,
    DbDocumentOverlayCollectionGroupOverlayIndexPath,
    { unique: false }
  );
}

function extractKey(remoteDoc: DbRemoteDocumentLegacy): DocumentKey {
  if (remoteDoc.document) {
    return new DocumentKey(
      ResourcePath.fromString(remoteDoc.document.name!).popFirst(5)
    );
  } else if (remoteDoc.noDocument) {
    return DocumentKey.fromSegments(remoteDoc.noDocument.path);
  } else if (remoteDoc.unknownDocument) {
    return DocumentKey.fromSegments(remoteDoc.unknownDocument.path);
  } else {
    return fail('Unexpected DbRemoteDocument');
  }
}
