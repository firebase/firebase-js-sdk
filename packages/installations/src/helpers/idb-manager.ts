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

import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { AppConfig } from '../interfaces/installation-impl';
import { InstallationEntry } from '../interfaces/installation-entry';
import { getKey } from '../util/get-key';
import { fidChanged } from './fid-changed';

const DATABASE_NAME = 'firebase-installations-database';
const DATABASE_VERSION = 1;
const OBJECT_STORE_NAME = 'firebase-installations-store';

interface InstallationsDB extends DBSchema {
  'firebase-installations-store': {
    key: string;
    value: InstallationEntry | undefined;
  };
}

let dbPromise: Promise<IDBPDatabase<InstallationsDB>> | null = null;
function getDbPromise(): Promise<IDBPDatabase<InstallationsDB>> {
  if (!dbPromise) {
    dbPromise = openDB(DATABASE_NAME, DATABASE_VERSION, {
      upgrade: (db, oldVersion) => {
        // We don't use 'break' in this switch statement, the fall-through
        // behavior is what we want, because if there are multiple versions between
        // the old version and the current version, we want ALL the migrations
        // that correspond to those versions to run, not only the last one.
        // eslint-disable-next-line default-case
        switch (oldVersion) {
          case 0:
            db.createObjectStore(OBJECT_STORE_NAME);
        }
      }
    });
  }
  return dbPromise;
}

/** Gets record(s) from the objectStore that match the given key. */
export async function get(
  appConfig: AppConfig
): Promise<InstallationEntry | undefined> {
  const key = getKey(appConfig);
  const db = await getDbPromise();
  return db
    .transaction(OBJECT_STORE_NAME)
    .objectStore(OBJECT_STORE_NAME)
    .get(key) as Promise<InstallationEntry>;
}

/** Assigns or overwrites the record for the given key with the given value. */
export async function set<ValueType extends InstallationEntry>(
  appConfig: AppConfig,
  value: ValueType
): Promise<ValueType> {
  const key = getKey(appConfig);
  const db = await getDbPromise();
  const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
  const objectStore = tx.objectStore(OBJECT_STORE_NAME);
  const oldValue = (await objectStore.get(key)) as InstallationEntry;
  await objectStore.put(value, key);
  await tx.done;

  if (!oldValue || oldValue.fid !== value.fid) {
    fidChanged(appConfig, value.fid);
  }

  return value;
}

/** Removes record(s) from the objectStore that match the given key. */
export async function remove(appConfig: AppConfig): Promise<void> {
  const key = getKey(appConfig);
  const db = await getDbPromise();
  const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
  await tx.objectStore(OBJECT_STORE_NAME).delete(key);
  await tx.done;
}

/**
 * Atomically updates a record with the result of updateFn, which gets
 * called with the current value. If newValue is undefined, the record is
 * deleted instead.
 * @return Updated value
 */
export async function update<ValueType extends InstallationEntry | undefined>(
  appConfig: AppConfig,
  updateFn: (previousValue: InstallationEntry | undefined) => ValueType
): Promise<ValueType> {
  const key = getKey(appConfig);
  const db = await getDbPromise();
  const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
  const store = tx.objectStore(OBJECT_STORE_NAME);
  const oldValue: InstallationEntry | undefined = (await store.get(
    key
  )) as InstallationEntry;
  const newValue = updateFn(oldValue);

  if (newValue === undefined) {
    await store.delete(key);
  } else {
    await store.put(newValue, key);
  }
  await tx.done;

  if (newValue && (!oldValue || oldValue.fid !== newValue.fid)) {
    fidChanged(appConfig, newValue.fid);
  }

  return newValue;
}

export async function clear(): Promise<void> {
  const db = await getDbPromise();
  const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
  await tx.objectStore(OBJECT_STORE_NAME).clear();
  await tx.done;
}
