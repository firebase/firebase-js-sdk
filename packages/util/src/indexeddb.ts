/**
 * @license
 * Copyright 2021 Google LLC
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

export class IndexedDbDatabaseService {
  dbPromise: Promise<IDBDatabase>;
  constructor(
    public dbName: string,
    public storeName: string,
    public dbVersion: number,
    errorHandler: (error: Error) => void
  ) {
    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, this.dbVersion);

        request.onsuccess = event => {
          resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = event => {
          reject((event.target as IDBRequest).error?.message);
        };

        request.onupgradeneeded = event => {
          const db = (event.target as IDBOpenDBRequest).result;

          // We don't use 'break' in this switch statement, the fall-through
          // behavior is what we want, because if there are multiple versions between
          // the old version and the current version, we want ALL the migrations
          // that correspond to those versions to run, not only the last one.
          // eslint-disable-next-line default-case
          switch (event.oldVersion) {
            case 0:
              db.createObjectStore(this.storeName, {
                keyPath: 'compositeKey'
              });
          }
        };
      } catch (e) {
        reject(e.message);
      }
    });
    this.dbPromise.catch(errorHandler);
  }
}

export async function idbWrite(
  dbService: IndexedDbDatabaseService,
  key: string,
  value: unknown
): Promise<void> {
  const db = await dbService.dbPromise;

  const transaction = db.transaction(dbService.storeName, 'readwrite');
  const store = transaction.objectStore(dbService.storeName);
  const request = store.put({
    compositeKey: key,
    value
  });

  return new Promise((resolve, reject) => {
    request.onsuccess = _event => {
      resolve();
    };

    transaction.onerror = event => {
      reject((event.target as IDBRequest).error?.message);
    };
  });
}

export async function idbRead(
  dbService: IndexedDbDatabaseService,
  key: string
): Promise<unknown> {
  const db = await dbService.dbPromise;

  const transaction = db.transaction(dbService.storeName, 'readonly');
  const store = transaction.objectStore(dbService.storeName);
  const request = store.get(key);

  return new Promise((resolve, reject) => {
    request.onsuccess = event => {
      const result = (event.target as IDBRequest).result;

      if (result) {
        resolve(result.value);
      } else {
        resolve(undefined);
      }
    };

    transaction.onerror = event => {
      reject((event.target as IDBRequest).error?.message);
    };
  });
}

export async function idbDelete(
  dbService: IndexedDbDatabaseService,
  key: string
): Promise<void> {
  const db = await dbService.dbPromise;

  const transaction = db.transaction(dbService.storeName, 'readwrite');
  const store = transaction.objectStore(dbService.storeName);
  const request = store.delete(key);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve();
    };

    transaction.onerror = event => {
      reject((event.target as IDBRequest).error?.message);
    };
  });
}
