/**
 * @license
 * Copyright 2019 Google LLC
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

import * as externs from '@firebase/auth-types-exp';

import {
    PersistedBlob, Persistence, PersistenceType, PersistenceValue, STORAGE_AVAILABLE_KEY
} from './';

export const DB_NAME = 'firebaseLocalStorageDb';
const DB_VERSION = 1;
const DB_OBJECTSTORE_NAME = 'firebaseLocalStorage';
const DB_DATA_KEYPATH = 'fbase_key';

interface DBObject {
  [DB_DATA_KEYPATH]: string;
  value: PersistedBlob;
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

function getObjectStore(db: IDBDatabase, isReadWrite: boolean): IDBObjectStore {
  return db
    .transaction([DB_OBJECTSTORE_NAME], isReadWrite ? 'readwrite' : 'readonly')
    .objectStore(DB_OBJECTSTORE_NAME);
}

function deleteDatabase(): Promise<void> {
  const request = indexedDB.deleteDatabase(DB_NAME);
  return new DBPromise<void>(request).toPromise();
}

function openDatabase(): Promise<IDBDatabase> {
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
        await deleteDatabase();
        return openDatabase();
      } else {
        resolve(db);
      }
    });
  });
}

async function putObject(
  db: IDBDatabase,
  key: string,
  value: PersistenceValue | string
): Promise<void> {
  const getRequest = getObjectStore(db, false).get(key);
  const data = await new DBPromise<DBObject | null>(getRequest).toPromise();
  if (data) {
    // Force an index signature on the user object
    data.value = value as PersistedBlob;
    const request = getObjectStore(db, true).put(data);
    return new DBPromise<void>(request).toPromise();
  } else {
    const request = getObjectStore(db, true).add({
      [DB_DATA_KEYPATH]: key,
      value
    });
    return new DBPromise<void>(request).toPromise();
  }
}

async function getObject(
  db: IDBDatabase,
  key: string
): Promise<PersistedBlob | null> {
  const request = getObjectStore(db, false).get(key);
  const data = await new DBPromise<DBObject | undefined>(request).toPromise();
  return data === undefined ? null : data.value;
}

function deleteObject(db: IDBDatabase, key: string): Promise<void> {
  const request = getObjectStore(db, true).delete(key);
  return new DBPromise<void>(request).toPromise();
}

class IndexedDBLocalPersistence implements Persistence {
  type: PersistenceType = PersistenceType.LOCAL;
  db?: IDBDatabase;

  private async initialize(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }
    this.db = await openDatabase();
    return this.db;
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!indexedDB) {
        return false;
      }
      const db = await openDatabase();
      await putObject(db, STORAGE_AVAILABLE_KEY, '1');
      await deleteObject(db, STORAGE_AVAILABLE_KEY);
      return true;
    } catch {}
    return false;
  }

  async set(key: string, value: PersistenceValue): Promise<void> {
    const db = await this.initialize();
    return putObject(db, key, value);
  }

  async get<T extends PersistenceValue>(key: string): Promise<T | null> {
    const db = await this.initialize();
    const obj = await getObject(db, key);
    return obj as T;
  }

  async remove(key: string): Promise<void> {
    const db = await this.initialize();
    return deleteObject(db, key);
  }
}

export const indexedDBLocalPersistence: externs.Persistence = new IndexedDBLocalPersistence();
