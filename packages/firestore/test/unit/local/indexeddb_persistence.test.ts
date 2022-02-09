/**
 * @license
 * Copyright 2018 Google LLC
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

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { Context } from 'mocha';

import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import {
  DbPrimaryClient,
  DbPrimaryClientKey,
  DbRemoteDocument,
  DbRemoteDocumentKey,
  SCHEMA_VERSION,
  V13_STORES
} from '../../../src/local/indexeddb_schema';
import { SchemaConverter } from '../../../src/local/indexeddb_schema_converter';
import {
  toDbRemoteDocument,
  toDbTimestampKey
} from '../../../src/local/local_serializer';
import { LruParams } from '../../../src/local/lru_garbage_collector';
import { PersistencePromise } from '../../../src/local/persistence_promise';
import { ClientId } from '../../../src/local/shared_client_state';
import { SimpleDb, SimpleDbTransaction } from '../../../src/local/simple_db';
import { getWindow } from '../../../src/platform/dom';
import { JsonProtoSerializer } from '../../../src/remote/serializer';
import { AsyncQueue, TimerId } from '../../../src/util/async_queue';
import {
  AsyncQueueImpl,
  newAsyncQueue
} from '../../../src/util/async_queue_impl';
import { FirestoreError } from '../../../src/util/error';
import { doc, version } from '../../util/helpers';
import { FakeDocument, testDocument } from '../../util/test_platform';
import { MockIndexedDbPersistence } from '../specs/spec_test_components';

import {
  INDEXEDDB_TEST_DATABASE_NAME,
  MOCK_SEQUENCE_NUMBER_SYNCER,
  TEST_DATABASE_ID,
  TEST_PERSISTENCE_PREFIX,
  TEST_SERIALIZER
} from './persistence_test_helpers';

use(chaiAsPromised);

/* eslint-disable no-restricted-globals */
async function withDb(
  schemaVersion: number,
  fn: (db: SimpleDb, version: number, objectStores: string[]) => Promise<void>
): Promise<void> {
  const schemaConverter = new SchemaConverter(TEST_SERIALIZER);
  const simpleDb = new SimpleDb(
    INDEXEDDB_TEST_DATABASE_NAME,
    schemaVersion,
    schemaConverter
  );
  const database = await simpleDb.ensureDb('IndexedDbPersistenceTests');
  await fn(simpleDb, database.version, Array.from(database.objectStoreNames));
  await simpleDb.close();
}

async function withUnstartedCustomPersistence(
  clientId: ClientId,
  multiClient: boolean,
  forceOwningTab: boolean,
  fn: (
    persistence: MockIndexedDbPersistence,
    document: FakeDocument,
    queue: AsyncQueueImpl
  ) => Promise<void>
): Promise<void> {
  const serializer = new JsonProtoSerializer(
    TEST_DATABASE_ID,
    /* useProto3Json= */ true
  );

  const queue = newAsyncQueue() as AsyncQueueImpl;
  const document = testDocument();
  const persistence = new MockIndexedDbPersistence(
    multiClient,
    TEST_PERSISTENCE_PREFIX,
    clientId,
    LruParams.DEFAULT,
    queue,
    getWindow(),
    document,
    serializer,
    MOCK_SEQUENCE_NUMBER_SYNCER,
    forceOwningTab
  );

  await fn(persistence, document, queue);
}

function withCustomPersistence(
  clientId: ClientId,
  multiClient: boolean,
  forceOwningTab: boolean,
  fn: (
    persistence: MockIndexedDbPersistence,
    document: FakeDocument,
    queue: AsyncQueueImpl
  ) => Promise<void>
): Promise<void> {
  return withUnstartedCustomPersistence(
    clientId,
    multiClient,
    forceOwningTab,
    async (persistence, document, queue) => {
      await persistence.start();
      await fn(persistence, document, queue);
      await persistence.shutdown();
    }
  );
}

async function withPersistence(
  clientId: ClientId,
  fn: (
    persistence: MockIndexedDbPersistence,
    document: FakeDocument,
    queue: AsyncQueueImpl
  ) => Promise<void>
): Promise<void> {
  return withCustomPersistence(
    clientId,
    /* multiClient= */ false,
    /* forceOwningTab= */ false,
    fn
  );
}

async function withMultiClientPersistence(
  clientId: ClientId,
  fn: (
    persistence: MockIndexedDbPersistence,
    document: FakeDocument,
    queue: AsyncQueueImpl
  ) => Promise<void>
): Promise<void> {
  return withCustomPersistence(
    clientId,
    /* multiClient= */ true,
    /* forceOwningTab= */ false,
    fn
  );
}

async function withForcedPersistence(
  clientId: ClientId,
  fn: (
    persistence: IndexedDbPersistence,
    document: FakeDocument,
    queue: AsyncQueue
  ) => Promise<void>
): Promise<void> {
  return withCustomPersistence(
    clientId,
    /* multiClient= */ false,
    /* forceOwningTab= */ true,
    fn
  );
}

function addDocs(
  txn: SimpleDbTransaction,
  keys: string[],
  version: number
): PersistencePromise<void> {
  const remoteDocumentStore = txn.store<DbRemoteDocumentKey, DbRemoteDocument>(
    DbRemoteDocument.store
  );
  return PersistencePromise.forEach(keys, (key: string) => {
    const remoteDoc = doc(key, version, { data: 'foo' });
    const dbRemoteDoc = toDbRemoteDocument(TEST_SERIALIZER, remoteDoc);
    return remoteDocumentStore.put(remoteDoc.key.path.toArray(), dbRemoteDoc);
  });
}

describe('IndexedDbSchema: createOrUpgradeDb', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping createOrUpgradeDb() tests.');
    return;
  }

  beforeEach(() => SimpleDb.delete(INDEXEDDB_TEST_DATABASE_NAME));

  after(() => SimpleDb.delete(INDEXEDDB_TEST_DATABASE_NAME));

  it('can install schema version 13', () => {
    return withDb(13, async (db, version, objectStores) => {
      expect(version).to.equal(13);
      // Version 1 adds all of the stores so far.
      expect(objectStores).to.have.members(V13_STORES);
    });
  });

  it('can get recent document changes in a collection', async function (this: Context) {
    const oldDocPaths = ['coll/doc1', 'coll/doc2', 'abc/doc1'];
    const newDocPaths = ['coll/doc3', 'coll/doc4', 'abc/doc2'];

    await withDb(SCHEMA_VERSION, db => {
      return db.runTransaction(
        this.test!.fullTitle(),
        'readwrite',
        V13_STORES,
        txn => {
          return addDocs(txn, oldDocPaths, /* version= */ 1).next(() =>
            addDocs(txn, newDocPaths, /* version= */ 2).next(() => {
              const remoteDocumentStore = txn.store<
                DbRemoteDocumentKey,
                DbRemoteDocument
              >(DbRemoteDocument.store);

              const lastReadTime = toDbTimestampKey(version(1));
              const range = IDBKeyRange.lowerBound(
                [['coll'], lastReadTime],
                true
              );
              return remoteDocumentStore
                .loadAll(DbRemoteDocument.collectionReadTimeIndex, range)
                .next(docsRead => {
                  const keys = docsRead.map(dbDoc => dbDoc.document!.name);
                  expect(keys).to.have.members([
                    'projects/test-project/databases/(default)/documents/coll/doc3',
                    'projects/test-project/databases/(default)/documents/coll/doc4'
                  ]);
                });
            })
          );
        }
      );
    });
  });

  it('can get recent document changes', async function (this: Context) {
    const oldDocPaths = ['coll1/old', 'coll2/old'];
    const newDocPaths = ['coll1/new', 'coll2/new'];

    await withDb(SCHEMA_VERSION, db => {
      return db.runTransaction(
        this.test!.fullTitle(),
        'readwrite',
        V13_STORES,
        txn => {
          return addDocs(txn, oldDocPaths, /* version= */ 1).next(() =>
            addDocs(txn, newDocPaths, /* version= */ 2).next(() => {
              const remoteDocumentStore = txn.store<
                DbRemoteDocumentKey,
                DbRemoteDocument
              >(DbRemoteDocument.store);

              const lastReadTime = toDbTimestampKey(version(1));
              const range = IDBKeyRange.lowerBound(lastReadTime, true);
              return remoteDocumentStore
                .loadAll(DbRemoteDocument.readTimeIndex, range)
                .next(docsRead => {
                  const keys = docsRead.map(dbDoc => dbDoc.document!.name);
                  expect(keys).to.have.members([
                    'projects/test-project/databases/(default)/documents/coll1/new',
                    'projects/test-project/databases/(default)/documents/coll2/new'
                  ]);
                });
            })
          );
        }
      );
    });
  });

  it('downgrading throws a custom error', async function (this: Context) {
    // Upgrade to latest version
    await withDb(SCHEMA_VERSION, async (db, version) => {
      expect(version).to.equal(SCHEMA_VERSION);
    });
    // downgrade by one version
    const downgradeVersion = SCHEMA_VERSION - 1;
    const schemaConverter = new SchemaConverter(TEST_SERIALIZER);
    let error: FirestoreError | null = null;
    try {
      const db = new SimpleDb(
        INDEXEDDB_TEST_DATABASE_NAME,
        downgradeVersion,
        schemaConverter
      );
      await db.ensureDb(this.test!.fullTitle());
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
    const simpleDb = new SimpleDb(
      INDEXEDDB_TEST_DATABASE_NAME,
      SCHEMA_VERSION,
      new SchemaConverter(TEST_SERIALIZER)
    );
    await simpleDb.runTransaction(
      'clearPrimaryLease',
      'readwrite',
      [DbPrimaryClient.store],
      txn => {
        const primaryStore = txn.store<DbPrimaryClientKey, DbPrimaryClient>(
          DbPrimaryClient.store
        );
        return primaryStore.delete(DbPrimaryClient.key);
      }
    );
    simpleDb.close();
  }

  async function getCurrentLeaseOwner(): Promise<ClientId | null> {
    const simpleDb = new SimpleDb(
      INDEXEDDB_TEST_DATABASE_NAME,
      SCHEMA_VERSION,
      new SchemaConverter(TEST_SERIALIZER)
    );
    const leaseOwner = await simpleDb.runTransaction(
      'getCurrentLeaseOwner',
      'readonly',
      [DbPrimaryClient.store],
      txn => {
        const primaryStore = txn.store<DbPrimaryClientKey, DbPrimaryClient>(
          DbPrimaryClient.store
        );
        return primaryStore
          .get(DbPrimaryClient.key)
          .next(owner => (owner ? owner.ownerId : null));
      }
    );
    simpleDb.close();
    return leaseOwner;
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
      return withMultiClientPersistence(
        'thatClient',
        async (thatPersistence, thatDocument, thatQueue) => {
          thatDocument.raiseVisibilityEvent(thatVisibility);
          thatPersistence.setNetworkEnabled(thatNetwork);
          await thatQueue.drain();

          // Clear the current primary holder, since our logic will not revoke
          // the lease until it expires.
          await clearPrimaryLease();

          await withMultiClientPersistence(
            'thisClient',
            async (thisPersistence, thisDocument, thisQueue) => {
              thisDocument.raiseVisibilityEvent(thisVisibility);
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
    return withPersistence('clientA', async (persistence, document, queue) => {
      document.raiseVisibilityEvent('hidden');
      persistence.setNetworkEnabled(false);
      await queue.drain();

      let isPrimary: boolean | undefined = undefined;
      await persistence.setPrimaryStateListener(async primaryState => {
        isPrimary = primaryState;
      });
      expect(isPrimary).to.be.true;
    });
  });

  it('regains lease if available', () => {
    return withPersistence('clientA', async persistence => {
      expect(await getCurrentLeaseOwner()).to.not.be.null;

      await clearPrimaryLease();
      expect(await getCurrentLeaseOwner()).to.be.null;

      await persistence.runTransaction(
        'regain lease',
        'readwrite-primary',
        () => PersistencePromise.resolve()
      );

      expect(await getCurrentLeaseOwner()).to.not.be.null;
    });
  });

  it('obtains lease if forceOwningTab is set', () => {
    return withPersistence('clientA', async clientA => {
      await withForcedPersistence('clientB', async () => {
        return expect(
          clientA.runTransaction('tx', 'readwrite-primary', () =>
            PersistencePromise.resolve()
          )
        ).to.be.eventually.rejected;
      });
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

  it('blocks start() on IndexedDbTransactionError when synchronization is disabled ', async () => {
    await withUnstartedCustomPersistence(
      'clientA',
      /* multiClient= */ false,
      /* forceOwningTab= */ false,
      async db => {
        db.injectFailures = ['updateClientMetadataAndTryBecomePrimary'];
        await expect(db.start()).to.eventually.be.rejectedWith(
          'Failed to obtain exclusive access to the persistence layer.'
        );
        await db.shutdown();
      }
    );
  });

  it('allows start() with IndexedDbTransactionError when synchronization is enabled ', async () => {
    await withUnstartedCustomPersistence(
      'clientA',
      /* multiClient= */ true,
      /* forceOwningTab= */ false,
      async db => {
        db.injectFailures = ['updateClientMetadataAndTryBecomePrimary'];
        await db.start();
        await db.shutdown();
      }
    );
  });

  it('blocks start() when getHighestListenSequenceNumber() fails', async () => {
    await withUnstartedCustomPersistence(
      'clientA',
      /* multiClient= */ false,
      /* forceOwningTab= */ false,
      async db1 => {
        db1.injectFailures = ['getHighestListenSequenceNumber'];
        await expect(db1.start()).to.eventually.be.rejectedWith(
          "IndexedDB transaction 'Simulated error' failed"
        );
        await db1.shutdown();
      }
    );
  });

  it('ignores intermittent IndexedDbTransactionError during lease refresh', async () => {
    await withPersistence('clientA', async (db, _, queue) => {
      db.injectFailures = ['updateClientMetadataAndTryBecomePrimary'];
      await queue.runAllDelayedOperationsUntil(TimerId.ClientMetadataRefresh);
      await queue.enqueue(() => {
        db.injectFailures = [];
        return db.runTransaction('check success', 'readwrite-primary', () =>
          PersistencePromise.resolve()
        );
      });
    });
  });

  it('rejects access when synchronization is disabled', async () => {
    await withMultiClientPersistence('clientA', async db1 => {
      await expect(
        withPersistence('clientB', db2 => Promise.resolve())
      ).to.eventually.be.rejectedWith(
        'Failed to obtain exclusive access to the persistence layer.'
      );
    });
  });

  it('grants access when synchronization is enabled', async () => {
    return withMultiClientPersistence('clientA', async db1 => {
      await withMultiClientPersistence('clientB', async db2 => {});
    });
  });
});

describe('IndexedDb', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping tests.');
    return;
  }

  it('can re-open after close', async function (this: Context) {
    return withDb(SCHEMA_VERSION, async db => {
      db.close();
      // Running a new IndexedDB transaction should re-open the database and not
      // throw.
      await db.runTransaction(
        this.test!.fullTitle(),
        'readwrite',
        V13_STORES,
        () => PersistencePromise.resolve()
      );
    });
  });
});
