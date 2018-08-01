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
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import {
  ALL_STORES,
  createOrUpgradeDb,
  DbMutationBatch,
  DbMutationBatchKey,
  DbTarget,
  DbTargetGlobal,
  DbTargetGlobalKey,
  DbTargetKey,
  DbTimestamp
} from '../../../src/local/indexeddb_schema';
import { SimpleDb, SimpleDbTransaction } from '../../../src/local/simple_db';
import { SnapshotVersion } from '../../../src/core/snapshot_version';

const INDEXEDDB_TEST_DATABASE = 'schemaTest';

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
    return withDb(1, db => {
      expect(db.version).to.equal(1);
      // Version 1 adds all of the stores so far.
      expect(getAllObjectStores(db)).to.have.members(ALL_STORES);
      return Promise.resolve();
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
        expect(getAllObjectStores(db)).to.have.members(ALL_STORES);

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
              .next(() => mutations.get([userId, batchId]))
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
});
