/**
 * @license
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 */

const DB_NAME = 'firebase-messaging-database';
/** Must match @firebase/messaging `idb-manager` so peeking the DB never creates a broken schema. */
const DB_VERSION = 2;
const TOKEN_STORE = 'firebase-messaging-store';
const FID_STORE = 'firebase-messaging-fid-registration-store';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = (): void => reject(req.error ?? new Error('indexedDB.open failed'));
    req.onupgradeneeded = (): void => {
      const db = req.result;
      if (!db.objectStoreNames.contains(TOKEN_STORE)) {
        db.createObjectStore(TOKEN_STORE);
      }
      if (!db.objectStoreNames.contains(FID_STORE)) {
        db.createObjectStore(FID_STORE);
      }
    };
    req.onsuccess = (): void => resolve(req.result);
  });
}

function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onerror = (): void => reject(req.error ?? new Error('deleteDatabase failed'));
    req.onsuccess = (): void => resolve();
  });
}

/** Matches @firebase/installations `idb-manager`. */
const INSTALLATIONS_DB_NAME = 'firebase-installations-database';

function deleteIndexedDbByName(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name);
    req.onerror = (): void =>
      reject(req.error ?? new Error(`deleteDatabase failed: ${name}`));
    req.onsuccess = (): void => resolve();
  });
}

/**
 * Deletes Firebase client IndexedDB databases used by Messaging and Installations on this origin.
 * Call after unregistering service workers so deletes are not blocked by open connections.
 */
export async function resetFirebaseClientIndexedDatabases(): Promise<void> {
  for (const name of [DB_NAME, INSTALLATIONS_DB_NAME]) {
    try {
      await deleteIndexedDbByName(name);
    } catch (e) {
      console.warn(`resetFirebaseClientIndexedDatabases: ${name}`, e);
    }
  }
}

/**
 * Opens the messaging DB with the same version/schema as the SDK. If a prior buggy peek left a
 * v2 database missing `firebase-messaging-store`, delete and recreate once.
 */
async function openMessagingDbForRead(): Promise<IDBDatabase> {
  let db = await openDb();
  if (
    db.objectStoreNames.contains(TOKEN_STORE) &&
    db.objectStoreNames.contains(FID_STORE)
  ) {
    return db;
  }
  db.close();
  await deleteDatabase();
  return openDb();
}

function getFromStore(
  db: IDBDatabase,
  storeName: string,
  key: string
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(storeName)) {
      resolve(undefined);
      return;
    }
    const tx = db.transaction(storeName, 'readonly');
    const r = tx.objectStore(storeName).get(key);
    r.onerror = (): void => reject(r.error);
    r.onsuccess = (): void => resolve(r.result);
  });
}

/** Reads FCM client IndexedDB rows for this app (key = `appId`). */
export async function readMessagingIdbState(appId: string): Promise<{
  tokenDetails: unknown;
  fidRegistration: unknown;
}> {
  let db: IDBDatabase;
  try {
    db = await openMessagingDbForRead();
  } catch {
    return { tokenDetails: undefined, fidRegistration: undefined };
  }
  try {
    const [tokenDetails, fidRegistration] = await Promise.all([
      getFromStore(db, TOKEN_STORE, appId),
      getFromStore(db, FID_STORE, appId)
    ]);
    return { tokenDetails, fidRegistration };
  } finally {
    db.close();
  }
}

export function formatIdbSummary(state: {
  tokenDetails: unknown;
  fidRegistration: unknown;
}): string {
  const hasToken =
    state.tokenDetails != null &&
    typeof state.tokenDetails === 'object' &&
    state.tokenDetails !== null &&
    'token' in state.tokenDetails;
  const fid =
    state.fidRegistration != null &&
    typeof state.fidRegistration === 'object' &&
    state.fidRegistration !== null &&
    'fid' in state.fidRegistration
      ? String((state.fidRegistration as { fid: string }).fid)
      : null;
  return `token row: ${hasToken ? 'present' : 'absent'}; fid row: ${
    fid ? `present (${fid.slice(0, 8)}…)` : 'absent'
  }`;
}
