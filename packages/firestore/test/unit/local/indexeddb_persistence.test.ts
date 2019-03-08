/**
 * @license
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
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { decode, encode } from '../../../src/local/encoded_resource_path';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import {
  DbCollectionParent,
  DbCollectionParentKey,
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
  DbTargetDocument,
  DbTargetDocumentKey,
  DbTargetGlobal,
  DbTargetGlobalKey,
  DbTargetKey,
  DbTimestamp,
  SCHEMA_VERSION,
  SchemaConverter,
  V1_STORES,
  V3_STORES,
  V4_STORES,
  V6_STORES,
  V8_STORES
} from '../../../src/local/indexeddb_schema';
import { LruParams } from '../../../src/local/lru_garbage_collector';
import { PersistencePromise } from '../../../src/local/persistence_promise';
import { ClientId } from '../../../src/local/shared_client_state';
import { SimpleDb, SimpleDbTransaction } from '../../../src/local/simple_db';
import { PlatformSupport } from '../../../src/platform/platform';
import { JsonProtoSerializer } from '../../../src/remote/serializer';
import { AsyncQueue } from '../../../src/util/async_queue';
import { FirestoreError } from '../../../src/util/error';
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
  multiClient: boolean,
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
  const persistence = await (multiClient
    ? IndexedDbPersistence.createMultiClientIndexedDbPersistence(
        TEST_PERSISTENCE_PREFIX,
        clientId,
        platform,
        queue,
        serializer,
        LruParams.DEFAULT,
        {
          sequenceNumberSyncer: MOCK_SEQUENCE_NUMBER_SYNCER
        }
      )
    : IndexedDbPersistence.createIndexedDbPersistence(
        TEST_PERSISTENCE_PREFIX,
        clientId,
        platform,
        queue,
        serializer,
        LruParams.DEFAULT
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
  return withCustomPersistence(clientId, /* multiClient= */ false, fn);
}

async function withMultiClientPersistence(
  clientId: ClientId,
  fn: (
    persistence: IndexedDbPersistence,
    platform: TestPlatform,
    queue: AsyncQueue
  ) => Promise<void>
): Promise<void> {
  return withCustomPersistence(clientId, /* multiClient= */ true, fn);
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

    const expectedMutation = new DbMutationBatch(userId, batchId, 1000, [], []);
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
        baseMutations: undefined,
        mutations: []
      },
      {
        userId: 'foo',
        batchId: 1,
        localWriteTimeMs: 1337,
        baseMutations: undefined,
        mutations: [testWrite]
      },
      {
        userId: 'foo',
        batchId: 42,
        localWriteTimeMs: 1337,
        baseMutations: undefined,
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
        baseMutations: undefined,
        mutations: [testWriteFoo]
      },
      {
        userId: 'foo',
        batchId: 2,
        localWriteTimeMs: 1337,
        baseMutations: undefined,
        mutations: [testWriteFoo]
      },
      // User 'bar' has one acknowledged mutation and one that is pending.
      {
        userId: 'bar',
        batchId: 3,
        localWriteTimeMs: 1337,
        baseMutations: undefined,
        mutations: [testWriteBar, testWriteBaz]
      },
      {
        userId: 'bar',
        batchId: 4,
        localWriteTimeMs: 1337,
        baseMutations: undefined,
        mutations: [testWritePending]
      },
      {
        userId: 'foo',
        batchId: 5,
        localWriteTimeMs: 1337,
        baseMutations: undefined,
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

  it('can upgrade from version 6 to 7', async () => {
    const oldSequenceNumber = 1;
    // Set the highest sequence number to this value so that untagged documents
    // will pick up this value.
    const newSequenceNumber = 2;
    await withDb(6, db => {
      const serializer = TEST_SERIALIZER;

      const sdb = new SimpleDb(db);
      return sdb.runTransaction('readwrite', V6_STORES, txn => {
        const targetGlobalStore = txn.store<DbTargetGlobalKey, DbTargetGlobal>(
          DbTargetGlobal.store
        );
        const remoteDocumentStore = txn.store<
          DbRemoteDocumentKey,
          DbRemoteDocument
        >(DbRemoteDocument.store);
        const targetDocumentStore = txn.store<
          DbTargetDocumentKey,
          DbTargetDocument
        >(DbTargetDocument.store);
        return targetGlobalStore
          .get(DbTargetGlobal.key)
          .next(metadata => {
            expect(metadata).to.not.be.null;
            metadata!.highestListenSequenceNumber = newSequenceNumber;
            return targetGlobalStore.put(DbTargetGlobal.key, metadata!);
          })
          .next(() => {
            // Set up some documents (we only need the keys)
            // For the odd ones, add sentinel rows.
            const promises: Array<PersistencePromise<void>> = [];
            for (let i = 0; i < 10; i++) {
              const document = doc('docs/doc_' + i, 1, { foo: 'bar' });
              promises.push(
                remoteDocumentStore.put(
                  document.key.path.toArray(),
                  serializer.toDbRemoteDocument(document)
                )
              );
              if (i % 2 === 1) {
                promises.push(
                  targetDocumentStore.put(
                    new DbTargetDocument(
                      0,
                      encode(document.key.path),
                      oldSequenceNumber
                    )
                  )
                );
              }
            }
            return PersistencePromise.waitFor(promises);
          });
      });
    });

    // Now run the migration and verify
    await withDb(7, db => {
      const sdb = new SimpleDb(db);
      return sdb.runTransaction('readonly', V6_STORES, txn => {
        const targetDocumentStore = txn.store<
          DbTargetDocumentKey,
          DbTargetDocument
        >(DbTargetDocument.store);
        const range = IDBKeyRange.bound(
          [0],
          [1],
          /*lowerOpen=*/ false,
          /*upperOpen=*/ true
        );
        return targetDocumentStore.iterate(
          { range },
          ([_, path], targetDocument) => {
            const decoded = decode(path);
            const lastSegment = decoded.lastSegment();
            const docNum = +lastSegment.split('_')[1];
            const expected =
              docNum % 2 === 1 ? oldSequenceNumber : newSequenceNumber;
            expect(targetDocument.sequenceNumber).to.equal(expected);
          }
        );
      });
    });
  });

  it('can upgrade from version 7 to 8', async () => {
    // This test creates a database with schema version 7 that has a few
    // mutations and a few remote documents and then ensures that appropriate
    // entries are written to the collectionParentIndex.
    const writePaths = [
      'cg1/x',
      'cg1/y',
      'cg1/x/cg1/x',
      'cg2/x',
      'cg1/x/cg2/x'
    ];
    const remoteDocPaths = [
      'cg1/z',
      'cg1/y/cg1/x',
      'cg2/x/cg3/x',
      'blah/x/blah/x/cg3/x'
    ];
    const expectedParents = {
      cg1: ['', 'cg1/x', 'cg1/y'],
      cg2: ['', 'cg1/x'],
      cg3: ['blah/x/blah/x', 'cg2/x']
    };

    await withDb(7, db => {
      const sdb = new SimpleDb(db);
      return sdb.runTransaction('readwrite', V6_STORES, txn => {
        const remoteDocumentStore = txn.store<
          DbRemoteDocumentKey,
          DbRemoteDocument
        >(DbRemoteDocument.store);
        const documentMutationStore = txn.store<
          DbDocumentMutationKey,
          DbDocumentMutation
        >(DbDocumentMutation.store);
        // We "cheat" and only write the DbDocumentMutation index entries, since that's
        // all the migration uses.
        return PersistencePromise.forEach(writePaths, writePath => {
          const indexKey = DbDocumentMutation.key(
            'dummy-uid',
            path(writePath),
            /*dummy batchId=*/ 123
          );
          return documentMutationStore.put(
            indexKey,
            DbDocumentMutation.PLACEHOLDER
          );
        }).next(() => {
          // Write the remote document entries.
          return PersistencePromise.forEach(remoteDocPaths, path => {
            const remoteDoc = doc(path, /*version=*/ 1, { data: 1 });
            return remoteDocumentStore.put(
              remoteDoc.key.path.toArray(),
              TEST_SERIALIZER.toDbRemoteDocument(remoteDoc)
            );
          });
        });
      });
    });

    // Migrate to v8 and verify index entries.
    await withDb(8, db => {
      const sdb = new SimpleDb(db);
      return sdb.runTransaction('readwrite', V8_STORES, txn => {
        const collectionParentsStore = txn.store<
          DbCollectionParentKey,
          DbCollectionParent
        >(DbCollectionParent.store);
        return collectionParentsStore.loadAll().next(indexEntries => {
          const actualParents = {};
          for (const { collectionId, parent } of indexEntries) {
            let parents = actualParents[collectionId];
            if (!parents) {
              parents = [];
              actualParents[collectionId] = parents;
            }
            parents.push(decode(parent).toString());
          }

          expect(actualParents).to.deep.equal(expectedParents);
        });
      });
    });
  });

  it('downgrading throws a custom error', async () => {
    // Upgrade to latest version
    await withDb(SCHEMA_VERSION, async db => {
      expect(db.version).to.equal(SCHEMA_VERSION);
    });
    // downgrade by one version
    const downgradeVersion = SCHEMA_VERSION - 1;
    const schemaConverter = new SchemaConverter(TEST_SERIALIZER);
    let error: FirestoreError | null = null;
    try {
      await SimpleDb.openOrCreate(
        INDEXEDDB_TEST_DATABASE_NAME,
        downgradeVersion,
        schemaConverter
      );
    } catch (e) {
      error = e;
      expect(
        e.message.indexOf('A newer version of the Firestore SDK')
      ).to.not.equal(-1);
    }
    expect(error).to.not.be.null;
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
