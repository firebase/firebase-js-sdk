/**
 * @license
 * Copyright 2019 Google Inc.
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

import { Persistence, PersistenceType, PersistenceValue, Instantiator } from '../persistence';

const STORAGE_AVAILABLE_KEY_ = '__sak';

export const DB_NAME = 'firebaseLocalStorageDb';
const DB_VERSION = 1;
const DB_OBJECTSTORE_NAME = 'firebaseLocalStorage';
const DB_DATA_KEYPATH = 'fbase_key';

// TODO: this should take a user instead of string
interface DBObject<R> {
  [DB_DATA_KEYPATH]: string;
  value: R;
}

/**
 * Promise wrapper for IDBRequest
 *
 * Unfortunately we can't cleanly extend Promise<T> since promises are not callable in ES6
 */
class DBPromise<T> {
  constructor(private readonly request: IDBRequest) {}

  toPromise(): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.request.addEventListener('success', () => {
        resolve(this.request.result);
      });
      this.request.addEventListener('error', () => {
        reject(this.request.error);
      });
    });
  }
}

function getObjectStore_(
  db: IDBDatabase,
  isReadWrite: boolean
): IDBObjectStore {
  return db
    .transaction([DB_OBJECTSTORE_NAME], isReadWrite ? 'readwrite' : 'readonly')
    .objectStore(DB_OBJECTSTORE_NAME);
}

function deleteDatabase_(): Promise<void> {
  const request = indexedDB.deleteDatabase(DB_NAME);
  return new DBPromise<void>(request).toPromise();
}

function openDatabase_(): Promise<IDBDatabase> {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  return new Promise((resolve, reject) => {
    request.addEventListener('error', () => {
      reject(request.error);
    });

    request.addEventListener('upgradeneeded', () => {
      const db = request.result;

      try {
        db.createObjectStore(DB_OBJECTSTORE_NAME, { keyPath: DB_DATA_KEYPATH });
      } catch (e) {
        reject(e);
      }
    });

    request.addEventListener('success', async () => {
      const db: IDBDatabase = request.result;
      // Strange bug that occurs in Firefox when multiple tabs are opened at the
      // same time. The only way to recover seems to be deleting the database
      // and re-initializing it.
      // https://github.com/firebase/firebase-js-sdk/issues/634

      if (!db.objectStoreNames.contains(DB_OBJECTSTORE_NAME)) {
        await deleteDatabase_();
        return openDatabase_();
      } else {
        resolve(db);
      }
    });
  });
}

async function putObject_(
  db: IDBDatabase,
  key: string,
  value: PersistenceValue | string
): Promise<void> {
  const getRequest = getObjectStore_(db, false).get(key);
  const data = await new DBPromise<DBObject<PersistenceValue | string> | null>(
    getRequest
  ).toPromise();
  if (data) {
    data.value = value;
    const request = getObjectStore_(db, true).put(data);
    return new DBPromise<void>(request).toPromise();
  } else {
    const request = getObjectStore_(db, true).add({
      [DB_DATA_KEYPATH]: key,
      value
    });
    return new DBPromise<void>(request).toPromise();
  }
}

async function getObject_<T extends PersistenceValue>(
  db: IDBDatabase,
  key: string
): Promise<T | null> {
  const request = getObjectStore_(db, false).get(key);
  const data = await new DBPromise<DBObject<PersistenceValue> | undefined>(
    request
  ).toPromise();
  return data === undefined ? null : (data.value as T);
}

function deleteObject_(db: IDBDatabase, key: string): Promise<void> {
  const request = getObjectStore_(db, true).delete(key);
  return new DBPromise<void>(request).toPromise();
}

class IndexedDBLocalPersistence implements Persistence {
  type: PersistenceType = PersistenceType.LOCAL;
  db?: IDBDatabase;

  async initialize(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }
    this.db = await openDatabase_();
    return this.db;
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!indexedDB) {
        return false;
      }
      const db = await openDatabase_();
      await putObject_(db, STORAGE_AVAILABLE_KEY_, '1');
      await deleteObject_(db, STORAGE_AVAILABLE_KEY_);
      return true;
    } catch (e) {}
    return false;
  }

  async set(key: string, value: PersistenceValue): Promise<void> {
    const db = await this.initialize();
    return putObject_(db, key, value);
  }

  async get<T extends PersistenceValue>(key: string, instantiator?: Instantiator<T>): Promise<T | null> {
    const db = await this.initialize();
    const obj = getObject_<T>(db, key);
    return instantiator && obj ? instantiator(obj) : obj;
  }

  async remove(key: string): Promise<void> {
    const db = await this.initialize();
    return deleteObject_(db, key);
  }
}

export const indexedDBLocalPersistence: Persistence = new IndexedDBLocalPersistence();
