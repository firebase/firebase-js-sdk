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

// TODO(multitab): Rename this file to `indexeddb_persistence.test.ts`.

import { expect } from 'chai';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import {
  createOrUpgradeDb,
  DbMutationBatch,
  DbMutationBatchKey,
  DbOwner,
  DbOwnerKey,
  DbTarget,
  DbTargetGlobal,
  DbTargetGlobalKey,
  DbTargetKey,
  DbTimestamp,
  SCHEMA_VERSION,
  V1_STORES,
  V3_STORES,
  V4_STORES
} from '../../../src/local/indexeddb_schema';
import { SimpleDb, SimpleDbTransaction } from '../../../src/local/simple_db';
import { PersistencePromise } from '../../../src/local/persistence_promise';
import { ClientId } from '../../../src/local/shared_client_state';
import { DatabaseId } from '../../../src/core/database_info';
import { JsonProtoSerializer } from '../../../src/remote/serializer';
import { PlatformSupport } from '../../../src/platform/platform';
import { AsyncQueue } from '../../../src/util/async_queue';
import { SharedFakeWebStorage, TestPlatform } from '../../util/test_platform';
import { SnapshotVersion } from '../../../src/core/snapshot_version';

const INDEXEDDB_TEST_DATABASE_PREFIX = 'schemaTest/';
const INDEXEDDB_TEST_DATABASE =
  INDEXEDDB_TEST_DATABASE_PREFIX + IndexedDbPersistence.MAIN_DATABASE;

function withDb(
  schemaVersion,
  fn: (db: IDBDatabase) => Promise<void>
): Promise<void> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(
      INDEXEDDB_TEST_DATABASE,
      schemaVersion
    );
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      createOrUpgradeDb(
        db,
        new SimpleDbTransaction(request.transaction),
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

async function withPersistence(
  clientId: ClientId,
  fn: (
    persistence: IndexedDbPersistence,
    platform: TestPlatform,
    queue: AsyncQueue
  ) => Promise<void>
): Promise<void> {
  const partition = new DatabaseId('project');
  const serializer = new JsonProtoSerializer(partition, {
    useProto3Json: true
  });

  const queue = new AsyncQueue();
  const platform = new TestPlatform(
    PlatformSupport.getPlatform(),
    new SharedFakeWebStorage()
  );
  const persistence = new IndexedDbPersistence(
    INDEXEDDB_TEST_DATABASE_PREFIX,
    clientId,
    platform,
    queue,
    serializer
  );

  await fn(persistence, platform, queue);
  await persistence.shutdown();
}

function getAllObjectStores(db: IDBDatabase): string[] {
  const objectStores: string[] = [];
  for (let i = 0; i < db.objectStoreNames.length; ++i) {
    objectStores.push(db.objectStoreNames.item(i));
  }
  objectStores.sort();
  return objectStores;
}

describe('IndexedDbSchema: createOrUpgradeDb', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping createOrUpgradeDb() tests.');
    return;
  }

  beforeEach(() => SimpleDb.delete(INDEXEDDB_TEST_DATABASE));

  after(() => SimpleDb.delete(INDEXEDDB_TEST_DATABASE));

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
                expect(mutation.userId).to.equal(userId);
                expect(mutation.batchId).to.equal(batchId);
              });
          }
        );
      });
    });
  });

  it('can upgrade from schema version 3 to 4', () => {
    const testWrite = { delete: 'foo' };
    const testMutations = [
      {
        userId: 'foo',
        batchId: 0,
        localWriteTime: 1337,
        mutations: []
      },
      {
        userId: 'foo',
        batchId: 1,
        localWriteTime: 1337,
        mutations: [testWrite]
      },
      {
        userId: 'foo',
        batchId: 42,
        localWriteTime: 1337,
        mutations: [testWrite, testWrite]
      }
    ];

    return withDb(3, db => {
      const sdb = new SimpleDb(db);
      return sdb.runTransaction('readwrite', [DbMutationBatch.store], txn => {
        const store = txn.store(DbMutationBatch.store);
        let p = PersistencePromise.resolve();
        for (const testMutation of testMutations) {
          p = p.next(() => store.put(testMutation));
        }
        return p;
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
          let p = PersistencePromise.resolve();
          for (const testMutation of testMutations) {
            p = p.next(() =>
              store.get(testMutation.batchId).next(mutationBatch => {
                expect(mutationBatch).to.deep.equal(testMutation);
              })
            );
          }
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
});

describe('IndexedDb: canActAsPrimary', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping canActAsPrimary() tests.');
    return;
  }

  async function clearOwner(): Promise<void> {
    const simpleDb = await SimpleDb.openOrCreate(
      INDEXEDDB_TEST_DATABASE,
      SCHEMA_VERSION,
      createOrUpgradeDb
    );
    await simpleDb.runTransaction('readwrite', [DbOwner.store], txn => {
      const ownerStore = txn.store<DbOwnerKey, DbOwner>(DbOwner.store);
      return ownerStore.delete('owner');
    });
    simpleDb.close();
  }

  beforeEach(() => {
    return SimpleDb.delete(INDEXEDDB_TEST_DATABASE);
  });

  after(() => SimpleDb.delete(INDEXEDDB_TEST_DATABASE));

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
          await thatPersistence.start();
          thatPlatform.raiseVisibilityEvent(thatVisibility);
          thatPersistence.setNetworkEnabled(thatNetwork);
          await thatQueue.drain();

          // Clear the current primary holder, since our logic will not revoke
          // the lease until it expires.
          await clearOwner();

          await withPersistence(
            'thisClient',
            async (thisPersistence, thisPlatform, thisQueue) => {
              await thisPersistence.start();
              thisPlatform.raiseVisibilityEvent(thisVisibility);
              thisPersistence.setNetworkEnabled(thisNetwork);
              await thisQueue.drain();

              let isPrimary: boolean;
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
      await persistence.start();
      platform.raiseVisibilityEvent('hidden');
      persistence.setNetworkEnabled(false);
      await queue.drain();

      let isPrimary: boolean;
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

  beforeEach(() => SimpleDb.delete(INDEXEDDB_TEST_DATABASE));

  after(() => SimpleDb.delete(INDEXEDDB_TEST_DATABASE));

  it('rejects access when synchronization is disabled', () => {
    return withPersistence('clientA', async db1 => {
      await db1.start(/*synchronizeTabs=*/ false);
      await withPersistence('clientB', async db2 => {
        await expect(
          db2.start(/*synchronizeTabs=*/ false)
        ).to.eventually.be.rejectedWith(
          'Another tab has exclusive access to the persistence layer.'
        );
      });
    });
  });

  it('grants access when synchronization is enabled', async () => {
    return withPersistence('clientA', async db1 => {
      await db1.start(/*synchronizeTabs=*/ true);
      await withPersistence('clientB', async db2 => {
        await db2.start(/*synchronizeTabs=*/ true);
      });
    });
  });
});
