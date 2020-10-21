/**
 * @license
 * Copyright 2017 Google LLC
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

import * as firestore from '@firebase/firestore-types';
import { DEFAULT_PROJECT_ID, DEFAULT_SETTINGS } from './settings';
import * as firebaseExport from './firebase_export';
import { ALT_EMULATOR_PROJECT_ID } from './emulator_settings';

const newTestFirestore = firebaseExport.newTestFirestore;

/* eslint-disable no-restricted-globals */

function isIeOrEdge(): boolean {
  if (!window.navigator) {
    return false;
  }

  const ua = window.navigator.userAgent;
  return (
    ua.indexOf('MSIE ') > 0 ||
    ua.indexOf('Trident/') > 0 ||
    ua.indexOf('Edge/') > 0
  );
}

export function isPersistenceAvailable(): boolean {
  return (
    typeof window === 'object' &&
    typeof window.indexedDB === 'object' &&
    !isIeOrEdge() &&
    (typeof process === 'undefined' ||
      process.env?.INCLUDE_FIRESTORE_PERSISTENCE !== 'false')
  );
}

/**
 * A wrapper around Mocha's describe method that allows for it to be run with
 * persistence both disabled and enabled (if the browser is supported).
 */
function apiDescribeInternal(
  describeFn: Mocha.PendingSuiteFunction,
  message: string,
  testSuite: (persistence: boolean) => void
): void {
  const persistenceModes = [false];
  if (isPersistenceAvailable()) {
    persistenceModes.push(true);
  }

  for (const enabled of persistenceModes) {
    describeFn(`(Persistence=${enabled}) ${message}`, () => testSuite(enabled));
  }
}

type ApiSuiteFunction = (
  message: string,
  testSuite: (persistence: boolean) => void
) => void;
interface ApiDescribe {
  (message: string, testSuite: (persistence: boolean) => void): void;
  skip: ApiSuiteFunction;
  only: ApiSuiteFunction;
}

export const apiDescribe = apiDescribeInternal.bind(
  null,
  describe
) as ApiDescribe;
// eslint-disable-next-line no-restricted-properties
apiDescribe.skip = apiDescribeInternal.bind(null, describe.skip);
// eslint-disable-next-line no-restricted-properties
apiDescribe.only = apiDescribeInternal.bind(null, describe.only);

/** Converts the documents in a QuerySnapshot to an array with the data of each document. */
export function toDataArray(
  docSet: firestore.QuerySnapshot
): firestore.DocumentData[] {
  return docSet.docs.map(d => d.data());
}

/** Converts the changes in a QuerySnapshot to an array with the data of each document. */
export function toChangesArray(
  docSet: firestore.QuerySnapshot,
  options?: firestore.SnapshotListenOptions
): firestore.DocumentData[] {
  return docSet.docChanges(options).map(d => d.doc.data());
}

export function toDataMap(
  docSet: firestore.QuerySnapshot
): { [field: string]: firestore.DocumentData } {
  const docsData: { [field: string]: firestore.DocumentData } = {};
  docSet.forEach(doc => {
    docsData[doc.id] = doc.data();
  });
  return docsData;
}

/** Converts a DocumentSet to an array with the id of each document */
export function toIds(docSet: firestore.QuerySnapshot): string[] {
  return docSet.docs.map(d => d.id);
}

export function withTestDb(
  persistence: boolean,
  fn: (db: firestore.FirebaseFirestore) => Promise<void>
): Promise<void> {
  return withTestDbs(persistence, 1, ([db]) => {
    return fn(db);
  });
}

/** Runs provided fn with a db for an alternate project id. */
export function withAlternateTestDb(
  persistence: boolean,
  fn: (db: firestore.FirebaseFirestore) => Promise<void>
): Promise<void> {
  return withTestDbsSettings(
    persistence,
    ALT_EMULATOR_PROJECT_ID,
    DEFAULT_SETTINGS,
    1,
    ([db]) => {
      return fn(db);
    }
  );
}

export function withTestDbs(
  persistence: boolean,
  numDbs: number,
  fn: (db: firestore.FirebaseFirestore[]) => Promise<void>
): Promise<void> {
  return withTestDbsSettings(
    persistence,
    DEFAULT_PROJECT_ID,
    DEFAULT_SETTINGS,
    numDbs,
    fn
  );
}
export async function withTestDbsSettings(
  persistence: boolean,
  projectId: string,
  settings: firestore.Settings,
  numDbs: number,
  fn: (db: firestore.FirebaseFirestore[]) => Promise<void>
): Promise<void> {
  if (numDbs === 0) {
    throw new Error("Can't test with no databases");
  }

  const dbs: firestore.FirebaseFirestore[] = [];

  for (let i = 0; i < numDbs; i++) {
    const firestoreClient = newTestFirestore(
      projectId,
      /* name =*/ undefined,
      settings
    );
    if (persistence) {
      await firestoreClient.enablePersistence();
    }
    dbs.push(firestoreClient);
  }

  try {
    await fn(dbs);
  } finally {
    for (const db of dbs) {
      await db.terminate();
      if (persistence) {
        await db.clearPersistence();
      }
    }
  }
}

export function withTestDoc(
  persistence: boolean,
  fn: (doc: firestore.DocumentReference) => Promise<void>
): Promise<void> {
  return withTestDb(persistence, db => {
    return fn(db.collection('test-collection').doc());
  });
}

export function withTestDocAndSettings(
  persistence: boolean,
  settings: firestore.Settings,
  fn: (doc: firestore.DocumentReference) => Promise<void>
): Promise<void> {
  return withTestDbsSettings(
    persistence,
    DEFAULT_PROJECT_ID,
    settings,
    1,
    ([db]) => {
      return fn(db.collection('test-collection').doc());
    }
  );
}

// TODO(rsgowman): Modify withTestDoc to take in (an optional) initialData and
// fix existing usages of it. Then delete this function. This makes withTestDoc
// more analogous to withTestCollection and eliminates the pattern of
// `withTestDoc(..., docRef => { docRef.set(initialData) ...});` that otherwise is
// quite common.
export function withTestDocAndInitialData(
  persistence: boolean,
  initialData: firestore.DocumentData | null,
  fn: (doc: firestore.DocumentReference) => Promise<void>
): Promise<void> {
  return withTestDb(persistence, db => {
    const docRef: firestore.DocumentReference = db
      .collection('test-collection')
      .doc();
    if (initialData) {
      return docRef.set(initialData).then(() => fn(docRef));
    } else {
      return fn(docRef);
    }
  });
}

export function withTestCollection(
  persistence: boolean,
  docs: { [key: string]: firestore.DocumentData },
  fn: (collection: firestore.CollectionReference) => Promise<void>
): Promise<void> {
  return withTestCollectionSettings(persistence, DEFAULT_SETTINGS, docs, fn);
}

// TODO(mikelehen): Once we wipe the database between tests, we can probably
// return the same collection every time.
export function withTestCollectionSettings(
  persistence: boolean,
  settings: firestore.Settings,
  docs: { [key: string]: firestore.DocumentData },
  fn: (collection: firestore.CollectionReference) => Promise<void>
): Promise<void> {
  return withTestDbsSettings(
    persistence,
    DEFAULT_PROJECT_ID,
    settings,
    2,
    ([testDb, setupDb]) => {
      // Abuse .doc() to get a random ID.
      const collectionId = 'test-collection-' + testDb.collection('x').doc().id;
      const testCollection = testDb.collection(collectionId);
      const setupCollection = setupDb.collection(collectionId);
      const sets: Array<Promise<void>> = [];
      Object.keys(docs).forEach(key => {
        sets.push(setupCollection.doc(key).set(docs[key]));
      });
      return Promise.all(sets).then(() => {
        return fn(testCollection);
      });
    }
  );
}
