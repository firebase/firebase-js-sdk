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
 * Store db open promises for each db name/version combo to prevent
 * multiple attempts at opening the same db.
 */
const dbPromises: Record<string, Promise<IDBDatabase>> = {};

export function openDB(
  dbName: string,
  dbVersion: number,
  upgradeCallback: (event: IDBVersionChangeEvent) => void
): Promise<IDBDatabase> {
  const dbPromiseKey = dbName + dbVersion;
  if (dbPromises[dbPromiseKey] != null) {
    return dbPromises[dbPromiseKey];
  }
  dbPromises[dbPromiseKey] = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(dbName, dbVersion);

      request.onsuccess = event => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = event => {
        reject(
          `Error opening indexedDB: ${
            (event.target as IDBRequest).error?.message
          }`
        );
      };

      request.onupgradeneeded = event => {
        upgradeCallback(event);
      };
    } catch (e) {
      reject(`Error opening indexedDB: ${e.message}`);
    }
  });
  return dbPromises[dbPromiseKey];
}

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
