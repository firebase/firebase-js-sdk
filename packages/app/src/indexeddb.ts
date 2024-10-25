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

import { FirebaseError } from '@firebase/util';
import { DBSchema, openDB, IDBPDatabase } from 'idb';
import { AppError, ERROR_FACTORY } from './errors';
import { FirebaseApp } from './public-types';
import { HeartbeatsInIndexedDB } from './types';
import { logger } from './logger';

const DB_NAME = 'firebase-heartbeat-database';
const DB_VERSION = 1;
const STORE_NAME = 'firebase-heartbeat-store';

interface AppDB extends DBSchema {
  'firebase-heartbeat-store': {
    key: string;
    value: HeartbeatsInIndexedDB;
  };
}

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null;
function getDbPromise(): Promise<IDBPDatabase<AppDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AppDB>(DB_NAME, DB_VERSION, {
      upgrade: (db, oldVersion) => {
        // We don't use 'break' in this switch statement, the fall-through
        // behavior is what we want, because if there are multiple versions between
        // the old version and the current version, we want ALL the migrations
        // that correspond to those versions to run, not only the last one.
        // eslint-disable-next-line default-case
        switch (oldVersion) {
          case 0:
            try {
              db.createObjectStore(STORE_NAME);
            } catch (e) {
              // Safari/iOS browsers throw occasional exceptions on
              // db.createObjectStore() that may be a bug. Avoid blocking
              // the rest of the app functionality.
              console.warn(e);
            }
        }
      }
    }).catch(e => {
      throw ERROR_FACTORY.create(AppError.IDB_OPEN, {
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
    const tx = db.transaction(STORE_NAME);
    const result = await tx.objectStore(STORE_NAME).get(computeKey(app));
    // We already have the value but tx.done can throw,
    // so we need to await it here to catch errors
    await tx.done;
    return result;
  } catch (e) {
    if (e instanceof FirebaseError) {
      logger.warn(e.message);
    } else {
      const idbGetError = ERROR_FACTORY.create(AppError.IDB_GET, {
        originalErrorMessage: (e as Error)?.message
      });
      logger.warn(idbGetError.message);
    }
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
    await tx.done;
  } catch (e) {
    if (e instanceof FirebaseError) {
      logger.warn(e.message);
    } else {
      const idbGetError = ERROR_FACTORY.create(AppError.IDB_WRITE, {
        originalErrorMessage: (e as Error)?.message
      });
      logger.warn(idbGetError.message);
    }
  }
}

function computeKey(app: FirebaseApp): string {
  return `${app.name}!${app.options.appId}`;
}
