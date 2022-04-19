/**
 * @license
 * Copyright 2022 Google LLC
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

/**
 * @internal
 */
function promisifyRequest(
  request: IDBRequest,
  errorMessage: string
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    request.onsuccess = event => {
      resolve((event.target as IDBRequest).result);
    };
    request.onerror = event => {
      reject(`${errorMessage}: ${(event.target as IDBRequest).error?.message}`);
    };
  });
}

/**
 * @internal
 */
export class DBWrapper {
  objectStoreNames: DOMStringList;
  constructor(private _db: IDBDatabase) {
    this.objectStoreNames = this._db.objectStoreNames;
  }
  transaction(
    storeNames: string[] | string,
    mode: IDBTransactionMode = 'readonly'
  ): TransactionWrapper {
    return new TransactionWrapper(
      this._db.transaction.call(this._db, storeNames, mode)
    );
  }
  createObjectStore(
    storeName: string,
    options?: IDBObjectStoreParameters
  ): ObjectStoreWrapper {
    return new ObjectStoreWrapper(
      this._db.createObjectStore(storeName, options)
    );
  }
  close(): void {
    this._db.close();
  }
}

/**
 * @internal
 */
class TransactionWrapper {
  complete: Promise<void>;
  constructor(private _transaction: IDBTransaction) {
    this.complete = new Promise((resolve, reject) => {
      this._transaction.oncomplete = function () {
        resolve();
      };
      this._transaction.onerror = () => {
        reject(this._transaction.error);
      };
      this._transaction.onabort = () => {
        reject(this._transaction.error);
      };
    });
  }
  objectStore(storeName: string): ObjectStoreWrapper {
    return new ObjectStoreWrapper(this._transaction.objectStore(storeName));
  }
}

/**
 * @internal
 */
class ObjectStoreWrapper {
  constructor(private _store: IDBObjectStore) {}
  index(name: string): IndexWrapper {
    return new IndexWrapper(this._store.index(name));
  }
  createIndex(
    name: string,
    keypath: string,
    options: IDBIndexParameters
  ): IndexWrapper {
    return new IndexWrapper(this._store.createIndex(name, keypath, options));
  }
  get(key: string): Promise<unknown> {
    const request = this._store.get(key);
    return promisifyRequest(request, 'Error reading from IndexedDB');
  }
  put(value: unknown, key?: string): Promise<unknown> {
    const request = this._store.put(value, key);
    return promisifyRequest(request, 'Error writing to IndexedDB');
  }
  delete(key: string): Promise<unknown> {
    const request = this._store.delete(key);
    return promisifyRequest(request, 'Error deleting from IndexedDB');
  }
  clear(): Promise<unknown> {
    const request = this._store.clear();
    return promisifyRequest(request, 'Error clearing IndexedDB object store');
  }
}

/**
 * @internal
 */
class IndexWrapper {
  constructor(private _index: IDBIndex) {}
  get(key: string): Promise<unknown> {
    const request = this._index.get(key);
    return promisifyRequest(request, 'Error reading from IndexedDB');
  }
}

/**
 * @internal
 */
export function openDB(
  dbName: string,
  dbVersion: number,
  upgradeCallback: (
    db: DBWrapper,
    oldVersion: number,
    newVersion: number | null,
    transaction: TransactionWrapper
  ) => void
): Promise<DBWrapper> {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(dbName, dbVersion);

      request.onsuccess = event => {
        resolve(new DBWrapper((event.target as IDBOpenDBRequest).result));
      };

      request.onerror = event => {
        reject(
          `Error opening indexedDB: ${
            (event.target as IDBRequest).error?.message
          }`
        );
      };

      request.onupgradeneeded = event => {
        upgradeCallback(
          new DBWrapper(request.result),
          event.oldVersion,
          event.newVersion,
          new TransactionWrapper(request.transaction!)
        );
      };
    } catch (e) {
      reject(`Error opening indexedDB: ${e.message}`);
    }
  });
}

/**
 * @internal
 */
export async function deleteDB(dbName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = event => {
        reject(
          `Error deleting indexedDB database "${dbName}": ${
            (event.target as IDBRequest).error?.message
          }`
        );
      };
    } catch (e) {
      reject(`Error deleting indexedDB database "${dbName}": ${e.message}`);
    }
  });
}
