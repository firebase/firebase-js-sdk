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
  V1_STORES
} from '../../../src/local/indexeddb_schema';
import { Deferred } from '../../../src/util/promise';
import { SimpleDb } from '../../../src/local/simple_db';

const INDEXEDDB_TEST_DATABASE = 'schemaTest';

function withDb(schemaVersion, fn: (db: IDBDatabase) => void): Promise<void> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(
      INDEXEDDB_TEST_DATABASE,
      schemaVersion
    );
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      createOrUpgradeDb(db, event.oldVersion, schemaVersion);
    };
    request.onsuccess = (event: Event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
    request.onerror = (event: ErrorEvent) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  }).then(db => {
    fn(db);
    db.close();
  });
}

function getAllObjectStores(db: IDBDatabase): String[] {
  const objectStores: String[] = [];
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

  it('can install schema version 1', () => {
    return withDb(1, db => {
      expect(db.version).to.be.equal(1);
      expect(getAllObjectStores(db)).to.have.members(V1_STORES);
    });
  });

  it('can install schema version 2', () => {
    return withDb(2, db => {
      expect(db.version).to.be.equal(2);
      expect(getAllObjectStores(db)).to.have.members(ALL_STORES);
    });
  });

  it('can upgrade from schema version 1 to 2', () => {
    return withDb(1, () => {}).then(() =>
      withDb(2, db => {
        expect(db.version).to.be.equal(2);
        expect(getAllObjectStores(db)).to.have.members(ALL_STORES);
      })
    );
  });
});
