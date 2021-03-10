/**
 * @license
 * Copyright 2020 Google LLC
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

const INDEXED_DB_NAME = 'firebaseLocalStorageDb';

// Save these variables for test utils use below, since some tests may delete them.
const indexedDB = window.indexedDB;
const localStorage = window.localStorage;
const sessionStorage = window.sessionStorage;

export async function clearPersistence() {
  sessionStorage.clear();
  localStorage.clear();
  return dbPromise(indexedDB.deleteDatabase(INDEXED_DB_NAME)).catch(
    () => undefined
  );
}

export async function localStorageSnap() {
  return dumpStorage(localStorage);
}
export async function sessionStorageSnap() {
  return dumpStorage(sessionStorage);
}

const DB_OBJECTSTORE_NAME = 'firebaseLocalStorage';

export async function indexedDBSnap() {
  const db = await dbPromise(indexedDB.open(INDEXED_DB_NAME));
  let entries;
  try {
    const store = db
      .transaction([DB_OBJECTSTORE_NAME], 'readonly')
      .objectStore(DB_OBJECTSTORE_NAME);
    entries = await dbPromise(store.getAll());
  } catch {
    // May throw if DB_OBJECTSTORE_NAME is never created -- this is normal.
    return {};
  }
  const result = {};
  for (const { fbase_key: key, value } of entries) {
    result[key] = value;
  }
  return result;
}

function dumpStorage(storage) {
  const result = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    result[key] = JSON.parse(storage.getItem(key));
  }
  return result;
}

function dbPromise(dbRequest) {
  return new Promise((resolve, reject) => {
    dbRequest.addEventListener('success', () => {
      resolve(dbRequest.result);
    });
    dbRequest.addEventListener('error', () => {
      reject(dbRequest.error);
    });
    dbRequest.addEventListener('blocked', () => {
      reject(dbRequest.error || 'blocked');
    });
  });
}
