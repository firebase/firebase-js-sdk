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

import { DB, deleteDb, openDb } from 'idb';

import { FirebaseInternalDependencies } from '../interfaces/internal-dependencies';
import { TokenDetails } from '../interfaces/token-details';
import { migrateOldDatabase } from './migrate-old-database';

// Exported for tests.
export const DATABASE_NAME = 'firebase-messaging-database';
const DATABASE_VERSION = 1;
const OBJECT_STORE_NAME = 'firebase-messaging-store';

let dbPromise: Promise<DB> | null = null;
function getDbPromise(): Promise<DB> {
  if (!dbPromise) {
    dbPromise = openDb(DATABASE_NAME, DATABASE_VERSION, upgradeDb => {
      // We don't use 'break' in this switch statement, the fall-through behavior is what we want,
      // because if there are multiple versions between the old version and the current version, we
      // want ALL the migrations that correspond to those versions to run, not only the last one.
      // eslint-disable-next-line default-case
      switch (upgradeDb.oldVersion) {
        case 0:
          upgradeDb.createObjectStore(OBJECT_STORE_NAME);
      }
    });
  }
  return dbPromise;
}

/** Gets record(s) from the objectStore that match the given key. */
export async function dbGet(
  firebaseDependencies: FirebaseInternalDependencies
): Promise<TokenDetails | undefined> {
  const key = getKey(firebaseDependencies);
  const db = await getDbPromise();
  const tokenDetails = await db
    .transaction(OBJECT_STORE_NAME)
    .objectStore(OBJECT_STORE_NAME)
    .get(key);

  if (tokenDetails) {
    return tokenDetails;
  } else {
    // Check if there is a tokenDetails object in the old DB.
    const oldTokenDetails = await migrateOldDatabase(
      firebaseDependencies.appConfig.senderId
    );
    if (oldTokenDetails) {
      await dbSet(firebaseDependencies, oldTokenDetails);
      return oldTokenDetails;
    }
  }
}

/** Assigns or overwrites the record for the given key with the given value. */
export async function dbSet(
  firebaseDependencies: FirebaseInternalDependencies,
  tokenDetails: TokenDetails
): Promise<TokenDetails> {
  const key = getKey(firebaseDependencies);
  const db = await getDbPromise();
  const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
  await tx.objectStore(OBJECT_STORE_NAME).put(tokenDetails, key);
  await tx.complete;
  return tokenDetails;
}

/** Removes record(s) from the objectStore that match the given key. */
export async function dbRemove(
  firebaseDependencies: FirebaseInternalDependencies
): Promise<void> {
  const key = getKey(firebaseDependencies);
  const db = await getDbPromise();
  const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
  await tx.objectStore(OBJECT_STORE_NAME).delete(key);
  await tx.complete;
}

/** Deletes the DB. Useful for tests. */
export async function dbDelete(): Promise<void> {
  if (dbPromise) {
    (await dbPromise).close();
    await deleteDb(DATABASE_NAME);
    dbPromise = null;
  }
}

function getKey({ appConfig }: FirebaseInternalDependencies): string {
  return appConfig.appId;
}
