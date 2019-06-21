/**
 * @license
 * Copyright 2017 Google Inc.
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
import { clearTestPersistence } from './../../unit/local/persistence_test_helpers';
import firebase from './firebase_export';

/**
 * NOTE: These helpers are used by api/ tests and therefore may not have any
 * dependencies on src/ files.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any, __karma__ is an untyped global
declare const __karma__: any;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PROJECT_CONFIG = require('../../../../../config/project.json');

const EMULATOR_PORT = process.env.FIRESTORE_EMULATOR_PORT;
const EMULATOR_PROJECT_ID = process.env.FIRESTORE_EMULATOR_PROJECT_ID;
export const USE_EMULATOR = !!EMULATOR_PORT;

const EMULATOR_FIRESTORE_SETTING = {
  host: `localhost:${EMULATOR_PORT}`,
  ssl: false
};

const PROD_FIRESTORE_SETTING = {
  host: 'firestore.googleapis.com',
  ssl: true
};

export const DEFAULT_SETTINGS = getDefaultSettings();

// eslint-disable-next-line no-console
console.log(`Default Settings: ${JSON.stringify(DEFAULT_SETTINGS)}`);

function getDefaultSettings(): firestore.Settings {
  const karma = typeof __karma__ !== 'undefined' ? __karma__ : undefined;
  if (karma && karma.config.firestoreSettings) {
    return karma.config.firestoreSettings;
  } else {
    return USE_EMULATOR ? EMULATOR_FIRESTORE_SETTING : PROD_FIRESTORE_SETTING;
  }
}

export const DEFAULT_PROJECT_ID = USE_EMULATOR
  ? EMULATOR_PROJECT_ID
  : PROJECT_CONFIG.projectId;
export const ALT_PROJECT_ID = 'test-db2';

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
    !isIeOrEdge()
  );
}

export function isRunningAgainstEmulator(): boolean {
  return USE_EMULATOR;
}

/**
 * A wrapper around Jasmine's describe method that allows for it to be run with
 * persistence both disabled and enabled (if the browser is supported).
 */
export const apiDescribe = apiDescribeInternal.bind(null, describe);
apiDescribe.skip = apiDescribeInternal.bind(null, describe.skip);
apiDescribe.only = apiDescribeInternal.bind(null, describe.only);

function apiDescribeInternal(
  describeFn: Mocha.IContextDefinition,
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
    ALT_PROJECT_ID,
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

let appCount = 0;

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
  const promises: Array<Promise<firestore.FirebaseFirestore>> = [];
  for (let i = 0; i < numDbs; i++) {
    // TODO(dimond): Right now we create a new app and Firestore instance for
    // every test and never clean them up. We may need to revisit.
    const app = firebase.initializeApp(
      { apiKey: 'fake-api-key', projectId },
      'test-app-' + appCount++
    );

    const firestore = firebase.firestore!(app);
    firestore.settings(settings);

    let ready: Promise<firestore.FirebaseFirestore>;
    if (persistence) {
      ready = firestore.enablePersistence().then(() => firestore);
    } else {
      ready = Promise.resolve(firestore);
    }

    promises.push(ready);
  }

  const dbs = await Promise.all(promises);

  try {
    await fn(dbs);
  } finally {
    await wipeDb(dbs[0]);
    for (const db of dbs) {
      await db.INTERNAL.delete();
    }
    if (persistence) {
      await clearTestPersistence();
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

function wipeDb(db: firestore.FirebaseFirestore): Promise<void> {
  // TODO(dimond): actually wipe DB and assert or listenables have been turned
  // off. We probably need deep queries for this.
  return Promise.resolve(undefined);
}

// TODO(in-queries): This exists just so we don't have to do the cast
// repeatedly. Once we expose 'array-contains-any' publicly we can remove it and
// just use 'array-contains-any' in all the tests.
export const arrayContainsAnyOp = 'array-contains-any' as firestore.WhereFilterOp;

// TODO(in-queries): This exists just so we don't have to do the cast
// repeatedly. Once we expose 'in' publicly we can remove it and just use 'in'
// in all the tests.
export const inOp = 'in' as firestore.WhereFilterOp;
