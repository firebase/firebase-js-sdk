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
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

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
  getDocFromCache
} from '../util/firebase_export';
import { DEFAULT_SETTINGS } from '../util/settings';

use(chaiAsPromised);

describe('Firestore Provider', () => {
  it('can provide setting', () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-initializeFirestore'
    );
    const fs1 = initializeFirestore(app, { host: 'localhost', ssl: false });
    expect(fs1).to.be.an.instanceOf(Firestore);
  });

  it('returns same default instance from named app', () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-getFirestore'
    );
    const fs1 = getFirestore(app);
    const fs2 = getFirestore(app);
    const fs3 = getFirestore(app, '(default)');
    expect(fs1).to.be.equal(fs2).and.equal(fs3);
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

    expect(fs1._databaseId.database).to.be.equal('init1');
    expect(fs2._databaseId.database).to.be.equal('init2');
    expect(fs3._databaseId.database).to.be.equal('(default)');
    expect(fs4._databaseId.database).to.be.equal('name1');
    expect(fs5._databaseId.database).to.be.equal('name2');

    expect(fs1).to.not.be.equal(fs2);
    expect(fs1).to.not.be.equal(fs3);
    expect(fs1).to.not.be.equal(fs4);
    expect(fs1).to.not.be.equal(fs5);
    expect(fs2).to.not.be.equal(fs3);
    expect(fs2).to.not.be.equal(fs4);
    expect(fs2).to.not.be.equal(fs5);
    expect(fs3).to.not.be.equal(fs4);
    expect(fs3).to.not.be.equal(fs5);
    expect(fs4).to.not.be.equal(fs5);
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
    expect(fs1).to.be.equal(fs2);
    expect(fs1).to.be.equal(fs3);
    expect(fs1).to.be.equal(fs4);
    expect(fs1).to.be.equal(fs5);
    expect(fs1).to.be.equal(fs6);
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
    expect(fs1).to.not.be.equal(fs2);
    expect(fs1).to.not.be.equal(fs3);
    expect(fs2).to.not.be.equal(fs3);
  });

  it('can call initializeFirestore() twice if settings are same', () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-initializeFirestore-twice'
    );
    const fs1 = initializeFirestore(app, DEFAULT_SETTINGS);
    const fs2 = initializeFirestore(app, DEFAULT_SETTINGS);
    expect(fs1).to.be.equal(fs2);
  });

  it('can still use enableIndexedDbPersistence()', async () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-use-enablePersistence'
    );
    const db = initializeFirestore(app, DEFAULT_SETTINGS);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    expect(enableIndexedDbPersistence(db)).to.be.rejected;

    // SDK still functions.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    setDoc(doc(db, 'coll/doc'), { field: 'foo' });
    expect((await getDocFromCache(doc(db, 'coll/doc'))).data()).to.deep.equal({
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
    expect(() => enableIndexedDbPersistence(db)).to.throw(
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
      expect((e as Error)?.message).to.equal(
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
});
