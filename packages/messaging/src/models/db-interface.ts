/**
 * Copyright 2017 Google Inc.
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

import { ErrorFactory } from '@firebase/util';

import { ERROR_CODES, ERROR_MAP } from './errors';

export abstract class DBInterface {
  private dbPromise: Promise<IDBDatabase> | null = null;

  protected abstract readonly dbName: string;
  protected abstract readonly dbVersion: number;
  protected abstract readonly objectStoreName: string;

  protected readonly errorFactory: ErrorFactory<string> = new ErrorFactory(
    'messaging',
    'Messaging',
    ERROR_MAP
  );

  /**
   * Database initialization.
   *
   * This function should create and update object stores.
   */
  protected abstract onDbUpgrade(
    request: IDBOpenDBRequest,
    event: IDBVersionChangeEvent
  ): void;

  /** Gets record(s) from the objectStore that match the given key. */
  get<T>(key: IDBValidKey): Promise<T | undefined> {
    return this.createTransaction(objectStore => objectStore.get(key));
  }

  /** Gets record(s) from the objectStore that match the given index. */
  getIndex<T>(index: string, key: IDBValidKey): Promise<T | undefined> {
    function runRequest(objectStore: IDBObjectStore): IDBRequest {
      const idbIndex = objectStore.index(index);
      return idbIndex.get(key);
    }

    return this.createTransaction(runRequest);
  }

  /** Assigns or overwrites the record for the given value. */
  // tslint:disable-next-line:no-any IndexedDB values are of type "any"
  put(value: any): Promise<void> {
    return this.createTransaction(
      objectStore => objectStore.put(value),
      'readwrite'
    );
  }

  /** Deletes record(s) from the objectStore that match the given key. */
  delete(key: IDBValidKey | IDBKeyRange): Promise<void> {
    return this.createTransaction(
      objectStore => objectStore.delete(key),
      'readwrite'
    );
  }

  /**
   * Close the currently open database.
   */
  async closeDatabase(): Promise<void> {
    if (this.dbPromise) {
      const db = await this.dbPromise;
      db.close();
      this.dbPromise = null;
    }
  }

  /**
   * Creates an IndexedDB Transaction and passes its objectStore to the
   * runRequest function, which runs the database request.
   *
   * @return Promise that resolves with the result of the runRequest function
   */
  private async createTransaction<T>(
    runRequest: (objectStore: IDBObjectStore) => IDBRequest,
    mode?: 'readonly' | 'readwrite'
  ): Promise<T> {
    const db = await this.getDb();
    const transaction = db.transaction(this.objectStoreName, mode);
    const request = transaction.objectStore(this.objectStoreName);
    const result = await promisify<T>(runRequest(request));

    return new Promise<T>((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve(result);
      };
      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  }

  /** Gets the cached db connection or opens a new one. */
  private getDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = () => {
          this.dbPromise = null;
          reject(request.error);
        };
        request.onupgradeneeded = event => this.onDbUpgrade(request, event);
      });
    }

    return this.dbPromise;
  }
}

/** Promisifies an IDBRequest. Resolves with the IDBRequest's result. */
function promisify<T>(request: IDBRequest): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}
