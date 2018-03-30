/**
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
import firebase from './firebase_export';

/**
 * NOTE: These helpers are used by api/ tests and therefore may not have any
 * dependencies on src/ files.
 */

// tslint:disable-next-line:no-any __karma__ is an untyped global
declare const __karma__: any;

const PROJECT_CONFIG = require('../../../../../config/project.json');

export const DEFAULT_SETTINGS = getDefaultSettings();

function getDefaultSettings(): firestore.Settings {
  const karma = typeof __karma__ !== 'undefined' ? __karma__ : undefined;
  if (karma && karma.config.firestoreSettings) {
    return karma.config.firestoreSettings;
  } else {
    return {
      host: 'firestore.googleapis.com',
      ssl: true,
      timestampsInSnapshots: true
    };
  }
}

export const DEFAULT_PROJECT_ID = PROJECT_CONFIG.projectId;
export const ALT_PROJECT_ID = 'test-db2';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function isIeOrEdge(): boolean {
  const ua = window.navigator.userAgent;
  return (
    ua.indexOf('MSIE ') > 0 ||
    ua.indexOf('Trident/') > 0 ||
    ua.indexOf('Edge/') > 0
  );
}

export function isPersistenceAvailable(): boolean {
  return isBrowser() && !isIeOrEdge();
}

/**
 * A wrapper around Jasmine's describe method that allows for it to be run with
 * persistence both disabled and enabled (if the browser is supported).
 */
export function apiDescribe(
  message: string,
  testSuite: (persistence: boolean) => void
): void {
  const persistenceModes = [false];
  if (isPersistenceAvailable()) {
    persistenceModes.push(true);
  }

  for (const enabled of persistenceModes) {
    describe(`(Persistence=${enabled}) ${message}`, () => testSuite(enabled));
  }
}

/** Converts a DocumentSet to an array with the data of each document */
export function toDataArray(
  docSet: firestore.QuerySnapshot
): firestore.DocumentData[] {
  return docSet.docs.map(d => d.data());
}

/** Converts a DocumentSet to an array with the id of each document */
export function toIds(docSet: firestore.QuerySnapshot): String[] {
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

export function withTestDbsSettings(
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

    const firestore = firebase.firestore(app);
    firestore.settings(settings);

    let ready: Promise<firestore.FirebaseFirestore>;
    if (persistence) {
      ready = firestore.enablePersistence().then(() => firestore);
    } else {
      ready = Promise.resolve(firestore);
    }

    promises.push(ready);
  }

  return Promise.all(promises).then((dbs: firestore.FirebaseFirestore[]) => {
    const cleanup = () => {
      return wipeDb(dbs[0]).then(() =>
        dbs.reduce(
          (chain, db) => chain.then(() => db.INTERNAL.delete()),
          Promise.resolve()
        )
      );
    };

    return fn(dbs).then(
      () => cleanup(),
      err => {
        // Do cleanup but propagate original error.
        return cleanup().then(
          () => Promise.reject(err),
          () => Promise.reject(err)
        );
      }
    );
  });
}

export function withTestDoc(
  persistence: boolean,
  fn: (doc: firestore.DocumentReference) => Promise<void>
): Promise<void> {
  return withTestDb(persistence, db => {
    return fn(db.collection('test-collection').doc());
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
