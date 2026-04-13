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

import { deleteDB, openDB } from 'idb';
import type { DBSchema, IDBPDatabase, OpenDBCallbacks } from 'idb';

import { FirebaseInternalDependencies } from '../interfaces/internal-dependencies';
import { TokenDetails } from '../interfaces/registration-details';
import { migrateOldDatabase } from '../helpers/migrate-old-database';

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

type IdbImpl = {
  openDB: typeof openDB;
  deleteDB: typeof deleteDB;
};

const defaultIdb: IdbImpl = { openDB, deleteDB };
let idbImpl: IdbImpl = defaultIdb;

// Exported for tests.
export function _setIdbForTests(impl: IdbImpl): void {
  idbImpl = impl;
}

export function _resetIdbForTests(): void {
  idbImpl = defaultIdb;
}

// Open v2, but fall back to v1 if upgrade/open fails. Cache as `unknown` and guard store access.
let dbPromise: Promise<IDBPDatabase<unknown>> | null = null;

function migrateMessagingDb(
  upgradeDb: IDBPDatabase<unknown>,
  oldVersion: number,
  targetSchemaVersion: 1 | 2
): void {
  // Intentional fall-through for v2: run all intermediate migrations.
  // eslint-disable-next-line default-case
  switch (oldVersion) {
    case 0:
      upgradeDb.createObjectStore(TOKEN_OBJECT_STORE_NAME);
      if (targetSchemaVersion === 1) {
        break;
      }
    // fall through
    case 1:
      if (targetSchemaVersion === 2) {
        upgradeDb.createObjectStore(FID_REGISTRATION_OBJECT_STORE_NAME);
      }
  }
}

function createOpenDbOptions(
  targetSchemaVersion: 1 | 2
): OpenDBCallbacks<unknown> {
  return {
    upgrade: (upgradeDb: IDBPDatabase<unknown>, oldVersion: number) => {
      migrateMessagingDb(upgradeDb, oldVersion, targetSchemaVersion);
    },
    blocked: () => {
      /* no-op */
    },
    blocking: (
      _currentVersion: number,
      _blockedVersion: number | null,
      event: IDBVersionChangeEvent
    ) => {
      dbPromise = null;
      (event.target as IDBDatabase | null)?.close();
    },
    terminated: () => {
      dbPromise = null;
    }
  };
}

function getDbPromise(): Promise<IDBPDatabase<MessagingDB>> {
  if (!dbPromise) {
    const openLatest = idbImpl.openDB(
      DATABASE_NAME,
      DATABASE_VERSION,
      createOpenDbOptions(2)
    );

    // Assign synchronously to avoid concurrent openDB() calls.
    dbPromise = (openLatest as unknown as Promise<IDBPDatabase<unknown>>).catch(
      () =>
        idbImpl.openDB(
          DATABASE_NAME,
          DATABASE_VERSION - 1,
          createOpenDbOptions(1)
        ) as unknown as Promise<IDBPDatabase<unknown>>
    );
  }
  return dbPromise as Promise<IDBPDatabase<MessagingDB>>;
}

function hasObjectStore(db: IDBPDatabase<unknown>, storeName: string): boolean {
  return db.objectStoreNames.contains(storeName);
}

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
    const oldTokenDetails = await migrateOldDatabase(
      firebaseDependencies.appConfig.senderId
    );
    if (oldTokenDetails) {
      await dbSet(firebaseDependencies, oldTokenDetails);
      return oldTokenDetails;
    }
  }
}

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
  if (
    !hasObjectStore(
      db as unknown as IDBPDatabase<unknown>,
      FID_REGISTRATION_OBJECT_STORE_NAME
    )
  ) {
    return undefined;
  }
  return (await db
    .transaction(FID_REGISTRATION_OBJECT_STORE_NAME)
    .objectStore(FID_REGISTRATION_OBJECT_STORE_NAME)
    .get(key)) as FidRegistrationDetails | undefined;
}

export async function dbSetFidRegistration(
  firebaseDependencies: FirebaseInternalDependencies,
  details: FidRegistrationDetails
): Promise<FidRegistrationDetails> {
  const key = getKey(firebaseDependencies);
  const db = await getDbPromise();
  if (
    !hasObjectStore(
      db as unknown as IDBPDatabase<unknown>,
      FID_REGISTRATION_OBJECT_STORE_NAME
    )
  ) {
    return details;
  }
  const tx = db.transaction(FID_REGISTRATION_OBJECT_STORE_NAME, 'readwrite');
  await tx.objectStore(FID_REGISTRATION_OBJECT_STORE_NAME).put(details, key);
  await tx.done;
  return details;
}

/** Deletes the DB. Useful for tests. */
export async function dbDelete(): Promise<void> {
  const promise = dbPromise;
  dbPromise = null;

  try {
    if (promise) {
      (await promise).close();
    }
  } catch {
    // Ignore open failures; deleting the DB is the recovery mechanism.
  } finally {
    await idbImpl.deleteDB(DATABASE_NAME);
  }
}

function getKey({ appConfig }: FirebaseInternalDependencies): string {
  return appConfig.appId;
}
