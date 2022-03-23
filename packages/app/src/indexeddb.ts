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

import { DBWrapper, openDB } from '@firebase/util';
import { AppError, ERROR_FACTORY } from './errors';
import { FirebaseApp } from './public-types';
import { HeartbeatsInIndexedDB } from './types';
const DB_NAME = 'firebase-heartbeat-database';
const DB_VERSION = 1;
const STORE_NAME = 'firebase-heartbeat-store';

let dbPromise: Promise<DBWrapper> | null = null;
function getDbPromise(): Promise<DBWrapper> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, (db, oldVersion) => {
      // We don't use 'break' in this switch statement, the fall-through
      // behavior is what we want, because if there are multiple versions between
      // the old version and the current version, we want ALL the migrations
      // that correspond to those versions to run, not only the last one.
      // eslint-disable-next-line default-case
      switch (oldVersion) {
        case 0:
          db.createObjectStore(STORE_NAME);
      }
    }).catch(e => {
      throw ERROR_FACTORY.create(AppError.STORAGE_OPEN, {
        originalErrorMessage: e.message
      });
    });
  }
  return dbPromise;
}

export async function readHeartbeatsFromIndexedDB(
  app: FirebaseApp
): Promise<HeartbeatsInIndexedDB | undefined> {
  try {
    const db = await getDbPromise();
    return db
      .transaction(STORE_NAME)
      .objectStore(STORE_NAME)
      .get(computeKey(app)) as Promise<HeartbeatsInIndexedDB | undefined>;
  } catch (e) {
    throw ERROR_FACTORY.create(AppError.STORAGE_GET, {
      originalErrorMessage: e.message
    });
  }
}

export async function writeHeartbeatsToIndexedDB(
  app: FirebaseApp,
  heartbeatObject: HeartbeatsInIndexedDB
): Promise<void> {
  try {
    const db = await getDbPromise();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const objectStore = tx.objectStore(STORE_NAME);
    await objectStore.put(heartbeatObject, computeKey(app));
    return tx.complete;
  } catch (e) {
    throw ERROR_FACTORY.create(AppError.STORAGE_WRITE, {
      originalErrorMessage: e.message
    });
  }
}

function computeKey(app: FirebaseApp): string {
  return `${app.name}!${app.options.appId}`;
}
