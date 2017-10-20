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

import * as firestore from 'firestore';

import { DatabaseId, DatabaseInfo } from '../../../src/core/database_info';

import firebase from './firebase_export';

// tslint:disable-next-line:no-any __karma__ is an untyped global
declare const __karma__: any;

const PROJECT_CONFIG = require('../../../../../config/project.json');

export const DEFAULT_PROJECT_ID = PROJECT_CONFIG.projectId;
export const ALT_PROJECT_ID = 'test-db2';

const DEFAULT_SETTINGS = getDefaultSettings();

function getDefaultSettings(): firestore.Settings {
  const karma = __karma__; //typeof __karma__ !== 'undefined' ? __karma__ : undefined;
  if (karma && karma.config.firestoreSettings) {
    return karma.config.firestoreSettings;
  } else {
    return {
      host: 'firestore.googleapis.com',
      ssl: true
    };
  }
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
  return !isIeOrEdge();
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

export function getDefaultDatabaseInfo(): DatabaseInfo {
  return new DatabaseInfo(
    new DatabaseId(DEFAULT_PROJECT_ID),
    'persistenceKey',
    DEFAULT_SETTINGS.host,
    DEFAULT_SETTINGS.ssl
  );
}

export function withTestDb(
  persistence: boolean,
  fn: (db: firestore.Firestore) => Promise<void>
): Promise<void> {
  return withTestDbs(persistence, 1, ([db]) => {
    return fn(db);
  });
}

/** Runs provided fn with a db for an alternate project id. */
export function withAlternateTestDb(
  persistence: boolean,
  fn: (db: firestore.Firestore) => Promise<void>
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
  fn: (db: firestore.Firestore[]) => Promise<void>
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
  fn: (db: firestore.Firestore[]) => Promise<void>
): Promise<void> {
  if (numDbs === 0) {
    throw new Error("Can't test with no databases");
  }
  const promises: Array<Promise<firestore.Firestore>> = [];
  for (let i = 0; i < numDbs; i++) {
    // TODO(dimond): Right now we create a new app and Firestore instance for
    // every test and never clean them up. We may need to revisit.
    const app = firebase.initializeApp(
      { apiKey: 'fake-api-key', projectId },
      'test-app-' + appCount++
    );

    // tslint:disable-next-line:no-any Firestore is not exposed in firebase.d.ts
    const firebaseAny = firebase as any;
    const firestore = firebaseAny.firestore(app);
    firestore.settings(settings);

    let ready: Promise<firestore.Firestore>;
    if (persistence) {
      ready = firestore.enablePersistence().then(() => firestore);
    } else {
      ready = Promise.resolve(firestore);
    }

    promises.push(ready);
  }

  return Promise.all(promises).then((dbs: firestore.Firestore[]) => {
    return fn(dbs)
      .then(wipeDb.bind(null, dbs[0]), error => {
        return wipeDb(dbs[0]).then(() => {
          throw error;
        });
      })
      .then(() => {
        return dbs.reduce(
          (chain, db) => chain.then(() => db.INTERNAL.delete()),
          Promise.resolve(undefined)
        );
      });
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

function wipeDb(db: firestore.Firestore): Promise<void> {
  // TODO(dimond): actually wipe DB and assert or listenables have been turned
  // off. We probably need deep queries for this.
  return Promise.resolve(undefined);
}
