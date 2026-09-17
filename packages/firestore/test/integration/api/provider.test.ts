/**
 * @license
 * Copyright 2022 Google LLC
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

import { initializeApp } from '@firebase/app';

import {
  doc,
  getFirestore,
  initializeFirestore,
  Firestore,
  terminate,
  getDoc,
  enableIndexedDbPersistence,
  setDoc,
  memoryLocalCache,
  getDocFromCache,
  // @ts-ignore internal API usage
  ensureFirestoreConfigured
} from '../util/firebase_export';
import { DEFAULT_SETTINGS } from '../util/settings';
describe('Firestore Provider', () => {
  it('can provide setting', () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-initializeFirestore'
    );
    const fs1 = initializeFirestore(app, { host: 'localhost', ssl: false });
    expect(fs1).toBeInstanceOf(Firestore);
  });

  it('returns same default instance from named app', () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-getFirestore'
    );
    const fs1 = getFirestore(app);
    const fs2 = getFirestore(app);
    const fs3 = getFirestore(app, '(default)');
    expect(fs1).toBe(fs2);
    expect(fs1).toBe(fs3);
  });

  it('returns different instance from named app', () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-getFirestore'
    );
    const fs1 = initializeFirestore(app, DEFAULT_SETTINGS, 'init1');
    const fs2 = initializeFirestore(app, DEFAULT_SETTINGS, 'init2');
    const fs3 = getFirestore(app);
    const fs4 = getFirestore(app, 'name1');
    const fs5 = getFirestore(app, 'name2');

    // @ts-ignore internal API usage
    expect(fs1._databaseId.database).toBe('init1');
    // @ts-ignore internal API usage
    expect(fs2._databaseId.database).toBe('init2');
    // @ts-ignore internal API usage
    expect(fs3._databaseId.database).toBe('(default)');
    // @ts-ignore internal API usage
    expect(fs4._databaseId.database).toBe('name1');
    // @ts-ignore internal API usage
    expect(fs5._databaseId.database).toBe('name2');

    expect(fs1).not.toBe(fs2);
    expect(fs1).not.toBe(fs3);
    expect(fs1).not.toBe(fs4);
    expect(fs1).not.toBe(fs5);
    expect(fs2).not.toBe(fs3);
    expect(fs2).not.toBe(fs4);
    expect(fs2).not.toBe(fs5);
    expect(fs3).not.toBe(fs4);
    expect(fs3).not.toBe(fs5);
    expect(fs4).not.toBe(fs5);
  });

  it('returns same default instance from default app', () => {
    const app = initializeApp({
      apiKey: 'fake-api-key',
      projectId: 'test-project'
    });
    const fs1 = initializeFirestore(app, DEFAULT_SETTINGS);
    const fs2 = initializeFirestore(app, DEFAULT_SETTINGS);
    const fs3 = getFirestore();
    const fs4 = getFirestore(app);
    const fs5 = getFirestore('(default)');
    const fs6 = getFirestore(app, '(default)');
    expect(fs1).toBe(fs2);
    expect(fs1).toBe(fs3);
    expect(fs1).toBe(fs4);
    expect(fs1).toBe(fs5);
    expect(fs1).toBe(fs6);
  });

  it('returns different instance from different named app', () => {
    initializeApp({ apiKey: 'fake-api-key', projectId: 'test-project' });
    const app1 = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-getFirestore-1'
    );
    const app2 = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-getFirestore-2'
    );
    const fs1 = getFirestore();
    const fs2 = getFirestore(app1);
    const fs3 = getFirestore(app2);
    expect(fs1).not.toBe(fs2);
    expect(fs1).not.toBe(fs3);
    expect(fs2).not.toBe(fs3);
  });

  it('can call initializeFirestore() twice if settings are same', () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-initializeFirestore-twice'
    );
    const fs1 = initializeFirestore(app, DEFAULT_SETTINGS);
    const fs2 = initializeFirestore(app, DEFAULT_SETTINGS);
    expect(fs1).toBe(fs2);
  });

  it('can still use enableIndexedDbPersistence()', async () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-use-enablePersistence'
    );
    const db = initializeFirestore(app, DEFAULT_SETTINGS);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    expect(enableIndexedDbPersistence(db)).rejects.toThrow();

    // SDK still functions.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    setDoc(doc(db, 'coll/doc'), { field: 'foo' });
    expect((await getDocFromCache(doc(db, 'coll/doc'))).data()).toEqual({
      field: 'foo'
    });
  });

  it('cannot mix enableIndexedDbPersistence() and settings.cache', async () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-cannot-mix'
    );
    const db = initializeFirestore(app, {
      ...DEFAULT_SETTINGS,
      localCache: memoryLocalCache()
    });
    expect(() => enableIndexedDbPersistence(db)).toThrow(
      'SDK cache is already specified.'
    );
  });

  it('cannot use once terminated', () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-terminated'
    );
    const firestore = initializeFirestore(app, {
      host: 'localhost',
      ssl: false
    });

    // We don't await the Promise. Any operation enqueued after should be
    // rejected.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    terminate(firestore);

    try {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      getDoc(doc(firestore, 'coll/doc'));
      expect.fail();
    } catch (e) {
      expect((e as Error)?.message).toBe(
        'The client has already been terminated.'
      );
    }
  });

  it('can call terminate() multiple times', () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-multi-terminate'
    );
    const firestore = initializeFirestore(app, {
      host: 'localhost',
      ssl: false
    });

    return terminate(firestore).then(() => terminate(firestore));
  });

  it('passes API key to database info', () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key-x', projectId: 'test-project' },
      'test-app-getFirestore-x'
    );
    const fs = getFirestore(app);
    ensureFirestoreConfigured(fs);

    // @ts-ignore internal API usage
    expect(fs._firestoreClient?._databaseInfo.apiKey).toBe('fake-api-key-x');
  });
});
