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

import { FirebaseApp } from '@firebase/app-exp';
import { ERROR_FACTORY, AppCheckError } from './errors';
import { AppCheckTokenInternal } from './state';
const DB_NAME = 'firebase-app-check-database';
const DB_VERSION = 1;
const STORE_NAME = 'firebase-app-check-store';
const DEBUG_TOKEN_KEY = 'debug-token';

let dbPromise: Promise<IDBDatabase> | null = null;
function getDBPromise(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onsuccess = event => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = event => {
        reject(
          ERROR_FACTORY.create(AppCheckError.STORAGE_OPEN, {
            originalErrorMessage: (event.target as IDBRequest).error?.message
          })
        );
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
            db.createObjectStore(STORE_NAME, {
              keyPath: 'compositeKey'
            });
        }
      };
    } catch (e) {
      reject(
        ERROR_FACTORY.create(AppCheckError.STORAGE_OPEN, {
          originalErrorMessage: e.message
        })
      );
    }
  });

  return dbPromise;
}

export function readTokenFromIndexedDB(
  app: FirebaseApp
): Promise<AppCheckTokenInternal | undefined> {
  return read(computeKey(app)) as Promise<AppCheckTokenInternal | undefined>;
}

export function writeTokenToIndexedDB(
  app: FirebaseApp,
  token: AppCheckTokenInternal
): Promise<void> {
  return write(computeKey(app), token);
}

export function writeDebugTokenToIndexedDB(token: string): Promise<void> {
  return write(DEBUG_TOKEN_KEY, token);
}

export function readDebugTokenFromIndexedDB(): Promise<string | undefined> {
  return read(DEBUG_TOKEN_KEY) as Promise<string | undefined>;
}

async function write(key: string, value: unknown): Promise<void> {
  const db = await getDBPromise();

  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.put({
    compositeKey: key,
    value
  });

  return new Promise((resolve, reject) => {
    request.onsuccess = _event => {
      resolve();
    };

    transaction.onerror = event => {
      reject(
        ERROR_FACTORY.create(AppCheckError.STORAGE_WRITE, {
          originalErrorMessage: (event.target as IDBRequest).error?.message
        })
      );
    };
  });
}

async function read(key: string): Promise<unknown> {
  const db = await getDBPromise();

  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);
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
      reject(
        ERROR_FACTORY.create(AppCheckError.STORAGE_GET, {
          originalErrorMessage: (event.target as IDBRequest).error?.message
        })
      );
    };
  });
}

function computeKey(app: FirebaseApp): string {
  return `${app.options.appId}-${app.name}`;
}
