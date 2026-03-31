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

import * as idb from 'idb';
import { DBSchema, IDBPDatabase } from 'idb';

import { FirebaseInternalDependencies } from '../interfaces/internal-dependencies';
import { TokenDetails } from '../interfaces/registration-details';
import { migrateOldDatabase } from '../helpers/migrate-old-database';

// Exported for tests.
export const DATABASE_NAME = 'firebase-messaging-database';
const DATABASE_VERSION = 2;
const TOKEN_OBJECT_STORE_NAME = 'firebase-messaging-store';
const FID_REGISTRATION_OBJECT_STORE_NAME =
  'firebase-messaging-fid-registration-store';

interface MessagingDB extends DBSchema {
  'firebase-messaging-store': {
    key: string;
    value: TokenDetails;
  };
  'firebase-messaging-fid-registration-store': {
    key: string;
    value: FidRegistrationDetails;
  };
}

export interface FidRegistrationDetails {
  fid: string;
  lastRegisterTime: number;
}

// NOTE: We may open DB v2 (new stores) but fall back to v1 if the upgrade/open fails (e.g.
// blocked/aborted/unavailable). Since `IDBPDatabase<TSchema>` is not safely assignable across
// different schemas (the generic affects method signatures deeply), we cache the promise as
// `IDBPDatabase<unknown>` and narrow/guard at call sites:
// - Token store is present in both v1 and v2.
// - FID-registration store exists only in v2, so those helpers are best-effort and handle missing
//   stores gracefully.
let dbPromise: Promise<IDBPDatabase<unknown>> | null = null;
function getDbPromise(): Promise<IDBPDatabase<MessagingDB>> {
  if (!dbPromise) {
    let openLatest: Promise<IDBPDatabase<MessagingDB>>;
    try {
      openLatest = idb.openDB(DATABASE_NAME, DATABASE_VERSION, {
        upgrade: (upgradeDb, oldVersion) => {
          // We don't use 'break' in this switch statement, the fall-through behavior is what we want,
          // because if there are multiple versions between the old version and the current version, we
          // want ALL the migrations that correspond to those versions to run, not only the last one.
          // eslint-disable-next-line default-case
          switch (oldVersion) {
            case 0:
              upgradeDb.createObjectStore(TOKEN_OBJECT_STORE_NAME);
            // fall through
            case 1:
              upgradeDb.createObjectStore(FID_REGISTRATION_OBJECT_STORE_NAME);
          }
        }
      });
    } catch (e) {
      openLatest = Promise.reject(e);
    }

    // If the upgrade fails (e.g. blocked/aborted), fall back to opening the previous DB
    // version so token reads/writes can continue to work.
    dbPromise = (openLatest as unknown as Promise<IDBPDatabase<unknown>>).catch(
      () =>
        idb.openDB(DATABASE_NAME, DATABASE_VERSION - 1, {
          upgrade: (upgradeDb, oldVersion) => {
            // eslint-disable-next-line default-case
            switch (oldVersion) {
              case 0:
                upgradeDb.createObjectStore(TOKEN_OBJECT_STORE_NAME);
            }
          }
        }) as unknown as Promise<IDBPDatabase<unknown>>
    );
  }
  return dbPromise as Promise<IDBPDatabase<MessagingDB>>;
}

/** Gets record(s) from the objectStore that match the given key. */
export async function dbGet(
  firebaseDependencies: FirebaseInternalDependencies
): Promise<TokenDetails | undefined> {
  const key = getKey(firebaseDependencies);
  const db = await getDbPromise();
  const tokenDetails = (await db
    .transaction(TOKEN_OBJECT_STORE_NAME)
    .objectStore(TOKEN_OBJECT_STORE_NAME)
    .get(key)) as TokenDetails;

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
  const tx = db.transaction(TOKEN_OBJECT_STORE_NAME, 'readwrite');
  await tx.objectStore(TOKEN_OBJECT_STORE_NAME).put(tokenDetails, key);
  await tx.done;
  return tokenDetails;
}

/** Removes record(s) from the objectStore that match the given key. */
export async function dbRemove(
  firebaseDependencies: FirebaseInternalDependencies
): Promise<void> {
  const key = getKey(firebaseDependencies);
  const db = await getDbPromise();
  const tx = db.transaction(TOKEN_OBJECT_STORE_NAME, 'readwrite');
  await tx.objectStore(TOKEN_OBJECT_STORE_NAME).delete(key);
  await tx.done;
}

export async function dbGetFidRegistration(
  firebaseDependencies: FirebaseInternalDependencies
): Promise<FidRegistrationDetails | undefined> {
  const key = getKey(firebaseDependencies);
  const db = await getDbPromise();
  try {
    return (await db
      .transaction(FID_REGISTRATION_OBJECT_STORE_NAME)
      .objectStore(FID_REGISTRATION_OBJECT_STORE_NAME)
      .get(key)) as FidRegistrationDetails | undefined;
  } catch {
    // If DB fell back to v1 (or store missing), treat as no record.
    return undefined;
  }
}

export async function dbSetFidRegistration(
  firebaseDependencies: FirebaseInternalDependencies,
  details: FidRegistrationDetails
): Promise<FidRegistrationDetails> {
  const key = getKey(firebaseDependencies);
  const db = await getDbPromise();
  try {
    const tx = db.transaction(FID_REGISTRATION_OBJECT_STORE_NAME, 'readwrite');
    await tx.objectStore(FID_REGISTRATION_OBJECT_STORE_NAME).put(details, key);
    await tx.done;
  } catch {
    // Best-effort: if store missing, skip persistence but don't break callers.
  }
  return details;
}

/** Deletes the DB. Useful for tests. */
export async function dbDelete(): Promise<void> {
  if (dbPromise) {
    (await dbPromise).close();
    await idb.deleteDB(DATABASE_NAME);
    dbPromise = null;
  }
}

function getKey({ appConfig }: FirebaseInternalDependencies): string {
  return appConfig.appId;
}
