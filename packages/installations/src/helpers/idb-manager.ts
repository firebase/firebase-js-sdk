/**
 * @license
 * Copyright 2019 Google Inc.
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

import { DB, openDb } from 'idb';
import { AppConfig } from '../interfaces/app-config';

const DATABASE_NAME = 'firebase-installations-database';
const DATABASE_VERSION = 1;
const OBJECT_STORE_NAME = 'firebase-installations-store';

const dbPromise: Promise<DB> = openDb(
  DATABASE_NAME,
  DATABASE_VERSION,
  upgradeDB => {
    // We don't use 'break' in this switch statement, the fall-through
    // behavior is what we want, because if there are multiple versions between
    // the old version and the current version, we want ALL the migrations
    // that correspond to those versions to run, not only the last one.
    switch (upgradeDB.oldVersion) {
      case 0:
        upgradeDB.createObjectStore(OBJECT_STORE_NAME);
    }
  }
);

/** Gets record(s) from the objectStore that match the given key. */
export async function get(appConfig: AppConfig): Promise<unknown> {
  const key = getKey(appConfig);
  const db = await dbPromise;
  return db
    .transaction(OBJECT_STORE_NAME)
    .objectStore(OBJECT_STORE_NAME)
    .get(key);
}

/** Assigns or overwrites the record for the given key with the given value. */
export async function set<ValueType>(
  appConfig: AppConfig,
  value: ValueType
): Promise<ValueType> {
  const key = getKey(appConfig);
  const db = await dbPromise;
  const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
  tx.objectStore(OBJECT_STORE_NAME).put(value, key);
  await tx.complete;
  return value;
}

/** Removes record(s) from the objectStore that match the given key. */
export async function remove(appConfig: AppConfig): Promise<void> {
  const key = getKey(appConfig);
  const db = await dbPromise;
  const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
  tx.objectStore(OBJECT_STORE_NAME).delete(key);
  return tx.complete;
}

/**
 * Atomically updates a record with the result of updateFn, which gets
 * called with the current value. If newValue is undefined, the record is
 * deleted instead.
 * @return Updated value
 */
export async function update<OldType, NewType>(
  appConfig: AppConfig,
  updateFn: (previousValue: OldType | undefined) => NewType
): Promise<NewType> {
  const key = getKey(appConfig);
  const db = await dbPromise;
  const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
  const store = tx.objectStore(OBJECT_STORE_NAME);
  const oldValue = await store.get(key);
  const newValue = updateFn(oldValue);

  if (newValue === oldValue) {
    return newValue;
  }

  if (newValue === undefined) {
    store.delete(key);
  } else {
    store.put(newValue, key);
  }

  await tx.complete;
  return newValue;
}

export async function clear(): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
  tx.objectStore(OBJECT_STORE_NAME).clear();
  return tx.complete;
}

function getKey(appConfig: AppConfig): string {
  return `${appConfig.appName}!${appConfig.appId}`;
}
