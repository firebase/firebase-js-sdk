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

import { isIndexedDBAvailable } from '@firebase/util';

import {
  clearIndexedDbPersistence,
  collection,
  CollectionReference,
  doc,
  DocumentData,
  DocumentReference,
  Firestore,
  memoryEagerGarbageCollector,
  memoryLocalCache,
  memoryLruGarbageCollector,
  newTestApp,
  newTestFirestore,
  persistentLocalCache,
  PrivateSettings,
  QuerySnapshot,
  setDoc,
  SnapshotListenOptions,
  terminate,
  WriteBatch,
  writeBatch
} from './firebase_export';
import {
  ALT_PROJECT_ID,
  DEFAULT_PROJECT_ID,
  DEFAULT_SETTINGS,
  USE_EMULATOR
} from './settings';

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
    isIndexedDBAvailable() &&
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
export function toDataArray(docSet: QuerySnapshot): DocumentData[] {
  return docSet.docs.map(d => d.data());
}

/** Converts the changes in a QuerySnapshot to an array with the data of each document. */
export function toChangesArray(
  docSet: QuerySnapshot,
  options?: SnapshotListenOptions
): DocumentData[] {
  return docSet.docChanges(options).map(d => d.doc.data());
}

export function toDataMap(docSet: QuerySnapshot): {
  [field: string]: DocumentData;
} {
  const docsData: { [field: string]: DocumentData } = {};
  docSet.forEach(doc => {
    docsData[doc.id] = doc.data();
  });
  return docsData;
}

/** Converts a DocumentSet to an array with the id of each document */
export function toIds(docSet: QuerySnapshot): string[] {
  return docSet.docs.map(d => d.id);
}

export function withTestDb(
  persistence: boolean,
  fn: (db: Firestore) => Promise<void>
): Promise<void> {
  return withTestDbs(persistence, 1, ([db]) => {
    return fn(db);
  });
}

export function withEnsuredEagerGcTestDb(
  fn: (db: Firestore) => Promise<void>
): Promise<void> {
  const newSettings = { ...DEFAULT_SETTINGS };
  newSettings.localCache = memoryLocalCache({
    garbageCollector: memoryEagerGarbageCollector()
  });
  return withTestDbsSettings(
    false,
    DEFAULT_PROJECT_ID,
    newSettings,
    1,
    async ([db]) => {
      return fn(db);
    }
  );
}

export function withEnsuredLruGcTestDb(
  persistence: boolean,
  fn: (db: Firestore) => Promise<void>
): Promise<void> {
  const newSettings = { ...DEFAULT_SETTINGS };
  if (persistence) {
    newSettings.localCache = persistentLocalCache({
      cacheSizeBytes: 1 * 1024 * 1024
    });
  } else {
    newSettings.localCache = memoryLocalCache({
      garbageCollector: memoryLruGarbageCollector({
        cacheSizeBytes: 1 * 1024 * 1024
      })
    });
  }
  return withTestDbsSettings(
    persistence,
    DEFAULT_PROJECT_ID,
    newSettings,
    1,
    async ([db]) => {
      return fn(db);
    }
  );
}

/** Runs provided fn with a db for an alternate project id. */
export function withAlternateTestDb(
  persistence: boolean,
  fn: (db: Firestore) => Promise<void>
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
  fn: (db: Firestore[]) => Promise<void>
): Promise<void> {
  return withTestDbsSettings(
    persistence,
    DEFAULT_PROJECT_ID,
    DEFAULT_SETTINGS,
    numDbs,
    fn
  );
}
export async function withTestDbsSettings<T>(
  persistence: boolean,
  projectId: string,
  settings: PrivateSettings,
  numDbs: number,
  fn: (db: Firestore[]) => Promise<T>
): Promise<T> {
  if (numDbs === 0) {
    throw new Error("Can't test with no databases");
  }

  const dbs: Firestore[] = [];

  for (let i = 0; i < numDbs; i++) {
    const newSettings = { ...settings };
    if (persistence) {
      newSettings.localCache = persistentLocalCache();
    }
    const db = newTestFirestore(newTestApp(projectId), newSettings);
    dbs.push(db);
  }

  try {
    return await fn(dbs);
  } finally {
    for (const db of dbs) {
      await terminate(db);
      if (persistence) {
        await clearIndexedDbPersistence(db);
      }
    }
  }
}

export async function withNamedTestDbsOrSkipUnlessUsingEmulator(
  persistence: boolean,
  dbNames: string[],
  fn: (db: Firestore[]) => Promise<void>
): Promise<void> {
  // Tests with named DBs can only run on emulator for now. This is because the
  // emulator does not require DB to be created before use.
  // TODO: Design ability to run named DB tests on backend. Maybe create DBs
  // TODO: beforehand, or create DBs as part of test setup.
  if (!USE_EMULATOR) {
    return Promise.resolve();
  }
  const app = newTestApp(DEFAULT_PROJECT_ID);
  const dbs: Firestore[] = [];
  for (const dbName of dbNames) {
    const newSettings = { ...DEFAULT_SETTINGS };
    if (persistence) {
      newSettings.localCache = persistentLocalCache();
    }
    const db = newTestFirestore(app, newSettings, dbName);
    dbs.push(db);
  }

  try {
    await fn(dbs);
  } finally {
    for (const db of dbs) {
      await terminate(db);
      if (persistence) {
        await clearIndexedDbPersistence(db);
      }
    }
  }
}

export function withTestDoc(
  persistence: boolean,
  fn: (doc: DocumentReference, db: Firestore) => Promise<void>
): Promise<void> {
  return withTestDb(persistence, db => {
    return fn(doc(collection(db, 'test-collection')), db);
  });
}

export function withTestDocAndSettings(
  persistence: boolean,
  settings: PrivateSettings,
  fn: (doc: DocumentReference) => Promise<void>
): Promise<void> {
  return withTestDbsSettings(
    persistence,
    DEFAULT_PROJECT_ID,
    settings,
    1,
    ([db]) => {
      return fn(doc(collection(db, 'test-collection')));
    }
  );
}

// TODO(rsgowman): Modify withTestDoc to take in (an optional) initialData and
// fix existing usages of it. Then delete this function. This makes withTestDoc
// more analogous to withTestCollection and eliminates the pattern of
// `withTestDoc(..., docRef => { setDoc(docRef, initialData) ...});` that
// otherwise is quite common.
export function withTestDocAndInitialData(
  persistence: boolean,
  initialData: DocumentData | null,
  fn: (doc: DocumentReference, db: Firestore) => Promise<void>
): Promise<void> {
  return withTestDb(persistence, db => {
    const docRef: DocumentReference = doc(collection(db, 'test-collection'));
    if (initialData) {
      return setDoc(docRef, initialData).then(() => fn(docRef, db));
    } else {
      return fn(docRef, db);
    }
  });
}

export function withTestCollection<T>(
  persistence: boolean,
  docs: { [key: string]: DocumentData },
  fn: (collection: CollectionReference, db: Firestore) => Promise<T>
): Promise<T> {
  return withTestCollectionSettings(persistence, DEFAULT_SETTINGS, docs, fn);
}

export function withEmptyTestCollection(
  persistence: boolean,
  fn: (collection: CollectionReference, db: Firestore) => Promise<void>
): Promise<void> {
  return withTestCollection(persistence, {}, fn);
}

// TODO(mikelehen): Once we wipe the database between tests, we can probably
// return the same collection every time.
export function withTestCollectionSettings<T>(
  persistence: boolean,
  settings: PrivateSettings,
  docs: { [key: string]: DocumentData },
  fn: (collection: CollectionReference, db: Firestore) => Promise<T>
): Promise<T> {
  return withTestDbsSettings(
    persistence,
    DEFAULT_PROJECT_ID,
    settings,
    2,
    ([testDb, setupDb]) => {
      // Abuse .doc() to get a random ID.
      const collectionId = 'test-collection-' + doc(collection(testDb, 'x')).id;
      const testCollection = collection(testDb, collectionId);
      const setupCollection = collection(setupDb, collectionId);

      const writeBatchCommits: Array<Promise<void>> = [];
      let writeBatch_: WriteBatch | null = null;
      let writeBatchSize = 0;

      for (const key of Object.keys(docs)) {
        if (writeBatch_ === null) {
          writeBatch_ = writeBatch(setupDb);
        }

        writeBatch_.set(doc(setupCollection, key), docs[key]);
        writeBatchSize++;

        // Write batches are capped at 500 writes. Use 400 just to be safe.
        if (writeBatchSize === 400) {
          writeBatchCommits.push(writeBatch_.commit());
          writeBatch_ = null;
          writeBatchSize = 0;
        }
      }

      if (writeBatch_ !== null) {
        writeBatchCommits.push(writeBatch_.commit());
      }

      return Promise.all(writeBatchCommits).then(() =>
        fn(testCollection, testDb)
      );
    }
  );
}
