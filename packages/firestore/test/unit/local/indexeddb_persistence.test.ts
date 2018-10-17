/**
 * Copyright 2018 Google Inc.
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

import { expect } from 'chai';
import { PersistenceSettings } from '../../../src/api/database';
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import {
  DbDocumentMutation,
  DbDocumentMutationKey,
  DbMutationBatch,
  DbMutationBatchKey,
  DbMutationQueue,
  DbMutationQueueKey,
  DbPrimaryClient,
  DbPrimaryClientKey,
  DbRemoteDocument,
  DbRemoteDocumentGlobal,
  DbRemoteDocumentGlobalKey,
  DbRemoteDocumentKey,
  DbTarget,
  DbTargetGlobal,
  DbTargetGlobalKey,
  DbTargetKey,
  DbTimestamp,
  SCHEMA_VERSION,
  SchemaConverter,
  V1_STORES,
  V3_STORES,
  V4_STORES,
  V6_STORES
} from '../../../src/local/indexeddb_schema';
import { PersistencePromise } from '../../../src/local/persistence_promise';
import { ClientId } from '../../../src/local/shared_client_state';
import { SimpleDb, SimpleDbTransaction } from '../../../src/local/simple_db';
import { PlatformSupport } from '../../../src/platform/platform';
import { JsonProtoSerializer } from '../../../src/remote/serializer';
import { AsyncQueue } from '../../../src/util/async_queue';
import { doc, path } from '../../util/helpers';
import { SharedFakeWebStorage, TestPlatform } from '../../util/test_platform';
import {
  INDEXEDDB_TEST_DATABASE_NAME,
  MOCK_SEQUENCE_NUMBER_SYNCER,
  TEST_DATABASE_ID,
  TEST_PERSISTENCE_PREFIX,
  TEST_SERIALIZER
} from './persistence_test_helpers';

function withDb(
  schemaVersion,
  fn: (db: IDBDatabase) => Promise<void>
): Promise<void> {
  const schemaConverter = new SchemaConverter(TEST_SERIALIZER);

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(
      INDEXEDDB_TEST_DATABASE_NAME,
      schemaVersion
    );
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      schemaConverter.createOrUpgrade(
        db,
        new SimpleDbTransaction(request.transaction!),
        event.oldVersion,
        schemaVersion
      );
    };
    request.onsuccess = (event: Event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
    request.onerror = (event: Event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  })
    .then(db => fn(db).then(() => db))
    .then(db => {
      db.close();
    });
}

async function withCustomPersistence(
  clientId: ClientId,
  settings: PersistenceSettings,
  fn: (
    persistence: IndexedDbPersistence,
    platform: TestPlatform,
    queue: AsyncQueue
  ) => Promise<void>
): Promise<void> {
  const serializer = new JsonProtoSerializer(TEST_DATABASE_ID, {
    useProto3Json: true
  });

  const queue = new AsyncQueue();
  const platform = new TestPlatform(
    PlatformSupport.getPlatform(),
    new SharedFakeWebStorage()
  );
  const persistence = await (settings.experimentalTabSynchronization
    ? IndexedDbPersistence.createMultiClientIndexedDbPersistence(
        TEST_PERSISTENCE_PREFIX,
        clientId,
        platform,
        queue,
        serializer,
        {
          sequenceNumberSyncer: MOCK_SEQUENCE_NUMBER_SYNCER
        }
      )
    : IndexedDbPersistence.createIndexedDbPersistence(
        TEST_PERSISTENCE_PREFIX,
        clientId,
        platform,
        queue,
        serializer
      ));

  await fn(persistence, platform, queue);
  await persistence.shutdown();
}

async function withPersistence(
  clientId: ClientId,
  fn: (
    persistence: IndexedDbPersistence,
    platform: TestPlatform,
    queue: AsyncQueue
  ) => Promise<void>
): Promise<void> {
  return withCustomPersistence(
    clientId,
    new PersistenceSettings(/* enabled */ true),
    fn
  );
}

async function withMultiClientPersistence(
  clientId: ClientId,
  fn: (
    persistence: IndexedDbPersistence,
    platform: TestPlatform,
    queue: AsyncQueue
  ) => Promise<void>
): Promise<void> {
  return withCustomPersistence(
    clientId,
    new PersistenceSettings(/* enabled */ true, {
      experimentalTabSynchronization: true
    }),
    fn
  );
}

function getAllObjectStores(db: IDBDatabase): string[] {
  const objectStores: string[] = [];
  for (let i = 0; i < db.objectStoreNames.length; ++i) {
    objectStores.push(db.objectStoreNames.item(i)!);
  }
  objectStores.sort();
  return objectStores;
}

describe('IndexedDbSchema: createOrUpgradeDb', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping createOrUpgradeDb() tests.');
    return;
  }

  beforeEach(() => SimpleDb.delete(INDEXEDDB_TEST_DATABASE_NAME));

  after(() => SimpleDb.delete(INDEXEDDB_TEST_DATABASE_NAME));

  it('can install schema version 1', () => {
    return withDb(1, async db => {
      expect(db.version).to.equal(1);
      // Version 1 adds all of the stores so far.
      expect(getAllObjectStores(db)).to.have.members(V1_STORES);
    });
  });

  it('drops the query cache from 2 to 3', () => {
    const userId = 'user';
    const batchId = 1;
    const targetId = 2;

    const expectedMutation = new DbMutationBatch(userId, batchId, 1000, []);
    const dummyTargetGlobal = new DbTargetGlobal(
      /*highestTargetId=*/ 1,
      /*highestListenSequencNumber=*/ 1,
      /*lastRemoteSnapshotVersion=*/ new DbTimestamp(1, 1),
      /*targetCount=*/ 1
    );
    const resetTargetGlobal = new DbTargetGlobal(
      /*highestTargetId=*/ 0,
      /*highestListenSequencNumber=*/ 0,
      /*lastRemoteSnapshotVersion=*/ SnapshotVersion.MIN.toTimestamp(),
      /*targetCount=*/ 0
    );

    return withDb(2, db => {
      const sdb = new SimpleDb(db);
      return sdb.runTransaction(
        'readwrite',
        [DbTarget.store, DbTargetGlobal.store, DbMutationBatch.store],
        txn => {
          const targets = txn.store<DbTargetKey, DbTarget>(DbTarget.store);
          const targetGlobal = txn.store<DbTargetGlobalKey, DbTargetGlobal>(
            DbTargetGlobal.store
          );
          const mutations = txn.store<DbMutationBatchKey, DbMutationBatch>(
            DbMutationBatch.store
          );

          return (
            targets
              // tslint:disable-next-line:no-any
              .put({ targetId, canonicalId: 'foo' } as any)
              .next(() =>
                targetGlobal.put(DbTargetGlobal.key, dummyTargetGlobal)
              )
              .next(() => mutations.put(expectedMutation))
          );
        }
      );
    }).then(() => {
      return withDb(3, db => {
        expect(db.version).to.equal(3);
        expect(getAllObjectStores(db)).to.have.members(V3_STORES);

        const sdb = new SimpleDb(db);
        return sdb.runTransaction(
          'readwrite',
          [DbTarget.store, DbTargetGlobal.store, DbMutationBatch.store],
          txn => {
            const targets = txn.store<DbTargetKey, DbTarget>(DbTarget.store);
            const targetGlobal = txn.store<DbTargetGlobalKey, DbTargetGlobal>(
              DbTargetGlobal.store
            );
            const mutations = txn.store<DbMutationBatchKey, DbMutationBatch>(
              DbMutationBatch.store
            );

            return targets
              .get(targetId)
              .next(target => {
                // The target should have been dropped
                expect(target).to.be.null;
              })
              .next(() => targetGlobal.get(DbTargetGlobal.key))
              .next(targetGlobalEntry => {
                // Target Global should exist but be cleared.
                // HACK: round-trip through JSON to clear types, like IndexedDb
                // does.
                const expected = JSON.parse(JSON.stringify(resetTargetGlobal));
                expect(targetGlobalEntry).to.deep.equal(expected);
              })
              .next(() => mutations.get(batchId))
              .next(mutation => {
                // Mutations should be unaffected.
                expect(mutation!.userId).to.equal(userId);
                expect(mutation!.batchId).to.equal(batchId);
              });
          }
        );
      });
    });
  });

  it('can upgrade from schema version 3 to 4', () => {
    const testWrite = { delete: 'foo' };
    const testMutations: DbMutationBatch[] = [
      {
        userId: 'foo',
        batchId: 0,
        localWriteTimeMs: 1337,
        mutations: []
      },
      {
        userId: 'foo',
        batchId: 1,
        localWriteTimeMs: 1337,
        mutations: [testWrite]
      },
      {
        userId: 'foo',
        batchId: 42,
        localWriteTimeMs: 1337,
        mutations: [testWrite, testWrite]
      }
    ];

    return withDb(3, db => {
      const sdb = new SimpleDb(db);
      return sdb.runTransaction('readwrite', [DbMutationBatch.store], txn => {
        const store = txn.store(DbMutationBatch.store);
        return PersistencePromise.forEach(testMutations, testMutation =>
          store.put(testMutation)
        );
      });
    }).then(() =>
      withDb(4, db => {
        expect(db.version).to.be.equal(4);
        expect(getAllObjectStores(db)).to.have.members(V4_STORES);

        const sdb = new SimpleDb(db);
        return sdb.runTransaction('readwrite', [DbMutationBatch.store], txn => {
          const store = txn.store<DbMutationBatchKey, DbMutationBatch>(
            DbMutationBatch.store
          );
          let p = PersistencePromise.forEach(testMutations, testMutation =>
            store.get(testMutation.batchId).next(mutationBatch => {
              expect(mutationBatch).to.deep.equal(testMutation);
            })
          );
          p = p.next(() => {
            store
              .add({} as any) // tslint:disable-line:no-any
              .next(batchId => {
                expect(batchId).to.equal(43);
              });
          });
          return p;
        });
      })
    );
  });

  it('can upgrade from schema version 4 to 5', () => {
    // This test creates a database with schema version 4 that has two users,
    // both of which have acknowledged mutations that haven't yet been removed
    // from IndexedDb ("heldWriteAcks"). Schema version 5 removes heldWriteAcks,
    // and as such these mutations are deleted.
    const testWriteFoo = {
      update: {
        name: 'projects/test-project/databases/(default)/documents/docs/foo'
      }
    };
    const testWriteBar = {
      update: {
        name: 'projects/test-project/databases/(default)/documents/docs/bar'
      }
    };
    const testWriteBaz = {
      update: {
        name: 'projects/test-project/databases/(default)/documents/docs/baz'
      }
    };
    const testWritePending = {
      update: {
        name: 'projects/test-project/databases/(default)/documents/docs/pending'
      }
    };
    const testMutations: DbMutationBatch[] = [
      // User 'foo' has two acknowledged mutations and one that is pending.
      {
        userId: 'foo',
        batchId: 1,
        localWriteTimeMs: 1337,
        mutations: [testWriteFoo]
      },
      {
        userId: 'foo',
        batchId: 2,
        localWriteTimeMs: 1337,
        mutations: [testWriteFoo]
      },
      // User 'bar' has one acknowledged mutation and one that is pending.
      {
        userId: 'bar',
        batchId: 3,
        localWriteTimeMs: 1337,
        mutations: [testWriteBar, testWriteBaz]
      },
      {
        userId: 'bar',
        batchId: 4,
        localWriteTimeMs: 1337,
        mutations: [testWritePending]
      },
      {
        userId: 'foo',
        batchId: 5,
        localWriteTimeMs: 1337,
        mutations: [testWritePending]
      }
    ];

    return withDb(4, db => {
      const sdb = new SimpleDb(db);
      // We can only use the V4 stores here, since that's as far as we've upgraded.
      return sdb.runTransaction('readwrite', V4_STORES, txn => {
        const mutationBatchStore = txn.store<
          DbMutationBatchKey,
          DbMutationBatch
        >(DbMutationBatch.store);
        const documentMutationStore = txn.store<
          DbDocumentMutationKey,
          DbDocumentMutation
        >(DbDocumentMutation.store);
        const mutationQueuesStore = txn.store<
          DbMutationQueueKey,
          DbMutationQueue
        >(DbMutationQueue.store);
        // Manually populate the mutation queue and create all indicies.
        return PersistencePromise.forEach(testMutations, testMutation => {
          return mutationBatchStore.put(testMutation).next(() => {
            return PersistencePromise.forEach(testMutation.mutations, write => {
              const indexKey = DbDocumentMutation.key(
                testMutation.userId,
                path(write.update!.name!, 5),
                testMutation.batchId
              );
              return documentMutationStore.put(
                indexKey,
                DbDocumentMutation.PLACEHOLDER
              );
            });
          });
        }).next(() =>
          // Populate the mutation queues' metadata
          PersistencePromise.waitFor([
            mutationQueuesStore.put(new DbMutationQueue('foo', 2, '')),
            mutationQueuesStore.put(new DbMutationQueue('bar', 3, '')),
            mutationQueuesStore.put(new DbMutationQueue('empty', -1, ''))
          ])
        );
      });
    }).then(() =>
      withDb(5, db => {
        expect(db.version).to.be.equal(5);

        const sdb = new SimpleDb(db);
        // There is no V5_STORES, continue using V4.
        return sdb.runTransaction('readwrite', V4_STORES, txn => {
          const mutationBatchStore = txn.store<
            DbMutationBatchKey,
            DbMutationBatch
          >(DbMutationBatch.store);
          const documentMutationStore = txn.store<
            DbDocumentMutationKey,
            DbDocumentMutation
          >(DbDocumentMutation.store);
          const mutationQueuesStore = txn.store<
            DbMutationQueueKey,
            DbMutationQueue
          >(DbMutationQueue.store);

          // Verify that all but the two pending mutations have been cleared
          // by the migration.
          let p = mutationBatchStore.count().next(count => {
            expect(count).to.deep.equal(2);
          });
          p = p.next(() =>
            documentMutationStore.count().next(count => {
              expect(count).to.equal(2);
            })
          );

          // Verify that we still have one metadata entry for each existing
          // queue
          p = p.next(() =>
            mutationQueuesStore.count().next(count => {
              expect(count).to.equal(3);
            })
          );
          return p;
        });
      })
    );
  });

  it('can upgrade from version 5 to 6', async () => {
    await withDb(5, db => {
      // Add some documents
      const docs = [
        doc('docs/a', 1, { foo: 'bar' }),
        doc('docs/b', 2, { baz: false }),
        doc('docs/c', 3, { a: 1, b: [5, 'foo'] })
      ];
      const dbRemoteDocs = docs.map(doc => ({
        dbKey: doc.key.path.toArray(),
        dbDoc: TEST_SERIALIZER.toDbRemoteDocument(doc)
      }));
      // V5 stores doesn't exist
      const sdb = new SimpleDb(db);
      return sdb.runTransaction('readwrite', V4_STORES, txn => {
        const store = txn.store<DbRemoteDocumentKey, DbRemoteDocument>(
          DbRemoteDocument.store
        );
        return PersistencePromise.forEach(dbRemoteDocs, ({ dbKey, dbDoc }) =>
          store.put(dbKey, dbDoc)
        );
      });
    });
    await withDb(6, db => {
      const sdb = new SimpleDb(db);
      return sdb.runTransaction('readonly', V6_STORES, txn => {
        const store = txn.store<
          DbRemoteDocumentGlobalKey,
          DbRemoteDocumentGlobal
        >(DbRemoteDocumentGlobal.store);
        return store.get(DbRemoteDocumentGlobal.key).next(metadata => {
          // We don't really care what the size is, just that it's greater than 0.
          // Our sizing algorithm may change at some point.
          expect(metadata!.byteSize).to.be.greaterThan(0);
        });
      });
    });
  });
});

describe('IndexedDb: canActAsPrimary', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping canActAsPrimary() tests.');
    return;
  }

  async function clearPrimaryLease(): Promise<void> {
    const simpleDb = await SimpleDb.openOrCreate(
      INDEXEDDB_TEST_DATABASE_NAME,
      SCHEMA_VERSION,
      new SchemaConverter(TEST_SERIALIZER)
    );
    await simpleDb.runTransaction('readwrite', [DbPrimaryClient.store], txn => {
      const primaryStore = txn.store<DbPrimaryClientKey, DbPrimaryClient>(
        DbPrimaryClient.store
      );
      return primaryStore.delete(DbPrimaryClient.key);
    });
    simpleDb.close();
  }

  beforeEach(() => {
    return SimpleDb.delete(INDEXEDDB_TEST_DATABASE_NAME);
  });

  after(() => SimpleDb.delete(INDEXEDDB_TEST_DATABASE_NAME));

  const visible: VisibilityState = 'visible';
  const hidden: VisibilityState = 'hidden';
  const networkEnabled = true;
  const networkDisabled = false;
  const primary = true;
  const secondary = false;

  type ExpectedPrimaryStateTestCase = [
    boolean,
    VisibilityState,
    boolean,
    VisibilityState,
    boolean
  ];

  const testCases: ExpectedPrimaryStateTestCase[] = [
    [networkDisabled, hidden, networkDisabled, hidden, primary],
    [networkDisabled, hidden, networkDisabled, visible, primary],
    [networkDisabled, hidden, networkEnabled, hidden, primary],
    [networkDisabled, hidden, networkEnabled, visible, primary],
    [networkDisabled, visible, networkDisabled, hidden, secondary],
    [networkDisabled, visible, networkDisabled, visible, primary],
    [networkDisabled, visible, networkEnabled, hidden, primary],
    [networkDisabled, visible, networkEnabled, visible, primary],
    [networkEnabled, hidden, networkDisabled, hidden, secondary],
    [networkEnabled, hidden, networkDisabled, visible, secondary],
    [networkEnabled, hidden, networkEnabled, hidden, primary],
    [networkEnabled, hidden, networkEnabled, visible, primary],
    [networkEnabled, visible, networkDisabled, hidden, secondary],
    [networkEnabled, visible, networkDisabled, visible, secondary],
    [networkEnabled, visible, networkEnabled, hidden, secondary],
    [networkEnabled, visible, networkEnabled, visible, primary]
  ];

  for (const testCase of testCases) {
    const [
      thatNetwork,
      thatVisibility,
      thisNetwork,
      thisVisibility,
      primaryState
    ] = testCase;
    const testName = `is ${
      primaryState ? 'eligible' : 'not eligible'
    } when client is ${
      thisNetwork ? 'online' : 'offline'
    } and ${thisVisibility} and other client is ${
      thatNetwork ? 'online' : 'offline'
    } and ${thatVisibility}`;

    it(testName, () => {
      return withPersistence(
        'thatClient',
        async (thatPersistence, thatPlatform, thatQueue) => {
          thatPlatform.raiseVisibilityEvent(thatVisibility);
          thatPersistence.setNetworkEnabled(thatNetwork);
          await thatQueue.drain();

          // Clear the current primary holder, since our logic will not revoke
          // the lease until it expires.
          await clearPrimaryLease();

          await withPersistence(
            'thisClient',
            async (thisPersistence, thisPlatform, thisQueue) => {
              thisPlatform.raiseVisibilityEvent(thisVisibility);
              thisPersistence.setNetworkEnabled(thisNetwork);
              await thisQueue.drain();

              let isPrimary: boolean | undefined = undefined;
              await thisPersistence.setPrimaryStateListener(
                async primaryState => {
                  isPrimary = primaryState;
                }
              );
              expect(isPrimary).to.eq(primaryState);
            }
          );
        }
      );
    });
  }

  it('is eligible when only client', () => {
    return withPersistence('clientA', async (persistence, platform, queue) => {
      platform.raiseVisibilityEvent('hidden');
      persistence.setNetworkEnabled(false);
      await queue.drain();

      let isPrimary: boolean | undefined = undefined;
      await persistence.setPrimaryStateListener(async primaryState => {
        isPrimary = primaryState;
      });
      expect(isPrimary).to.be.true;
    });
  });
});

describe('IndexedDb: allowTabSynchronization', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping allowTabSynchronization tests.');
    return;
  }

  beforeEach(() => SimpleDb.delete(INDEXEDDB_TEST_DATABASE_NAME));

  after(() => SimpleDb.delete(INDEXEDDB_TEST_DATABASE_NAME));

  it('rejects access when synchronization is disabled', async () => {
    await withPersistence('clientA', async db1 => {
      await expect(
        withPersistence('clientB', db2 => Promise.resolve())
      ).to.eventually.be.rejectedWith(
        'Another tab has exclusive access to the persistence layer.'
      );
    });
  });

  it('grants access when synchronization is enabled', async () => {
    return withMultiClientPersistence('clientA', async db1 => {
      await withMultiClientPersistence('clientB', async db2 => {});
    });
  });
});
