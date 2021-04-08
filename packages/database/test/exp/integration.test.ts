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

// eslint-disable-next-line import/no-extraneous-dependencies
import { initializeApp, deleteApp } from '@firebase/app-exp';
import { expect } from 'chai';

import {
  get,
  getDatabase,
  goOffline,
  goOnline,
  ref,
  refFromURL
} from '../../exp/index';
import { onValue, set } from '../../src/exp/Reference_impl';
import { EventAccumulatorFactory } from '../helpers/EventAccumulator';
import { DATABASE_ADDRESS, DATABASE_URL } from '../helpers/util';

export function createTestApp() {
  return initializeApp({ databaseURL: DATABASE_URL });
}

describe('Database@exp Tests', () => {
  let defaultApp;

  beforeEach(() => {
    defaultApp = createTestApp();
  });

  afterEach(async () => {
    if (defaultApp) {
      return deleteApp(defaultApp);
    }
  });

  it('Can get database', () => {
    const db = getDatabase(defaultApp);
    expect(db).to.be.ok;
  });

  it('Can get database with custom URL', () => {
    const db = getDatabase(defaultApp, 'http://foo.bar.com');
    expect(db).to.be.ok;
    // The URL is assumed to be secure if no port is specified.
    expect(ref(db).toString()).to.equal('https://foo.bar.com/');
  });

  it('Can get app', () => {
    const db = getDatabase(defaultApp);
    expect(db.app).to.equal(defaultApp);
  });

  it('Can set and get ref', async () => {
    const db = getDatabase(defaultApp);
    await set(ref(db, 'foo/bar'), 'foobar');
    const snap = await get(ref(db, 'foo/bar'));
    expect(snap.val()).to.equal('foobar');
  });

  it('Can get refFromUrl', async () => {
    const db = getDatabase(defaultApp);
    await get(refFromURL(db, `${DATABASE_ADDRESS}/foo/bar`));
  });

  it('Can get updates', async () => {
    const db = getDatabase(defaultApp);
    const fooRef = ref(db, 'foo');

    const ea = EventAccumulatorFactory.waitsForCount(2);
    onValue(fooRef, snap => {
      ea.addEvent(snap.val());
    });

    await set(fooRef, 'a');
    await set(fooRef, 'b');

    const [snap1, snap2] = await ea.promise;
    expect(snap1).to.equal('a');
    expect(snap2).to.equal('b');
  });

  it('Can use onlyOnce', async () => {
    const db = getDatabase(defaultApp);
    const fooRef = ref(db, 'foo');

    const ea = EventAccumulatorFactory.waitsForCount(1);
    onValue(
      fooRef,
      snap => {
        ea.addEvent(snap.val());
      },
      { onlyOnce: true }
    );

    await set(fooRef, 'a');
    await set(fooRef, 'b');

    const [snap1] = await ea.promise;
    expect(snap1).to.equal('a');
  });

  it('Can unsubscribe', async () => {
    const db = getDatabase(defaultApp);
    const fooRef = ref(db, 'foo');

    const ea = EventAccumulatorFactory.waitsForCount(1);
    const unsubscribe = onValue(fooRef, snap => {
      ea.addEvent(snap.val());
    });

    await set(fooRef, 'a');
    unsubscribe();
    await set(fooRef, 'b');

    const [snap1] = await ea.promise;
    expect(snap1).to.equal('a');
  });

  it('Can goOffline/goOnline', async () => {
    const db = getDatabase(defaultApp);
    goOffline(db);
    try {
      await get(ref(db, 'foo/bar'));
      expect.fail('Should have failed since we are offline');
    } catch (e) {
      expect(e.message).to.equal('Error: Client is offline.');
    }
    goOnline(db);
    await get(ref(db, 'foo/bar'));
  });

  it('Can delete app', async () => {
    const db = getDatabase(defaultApp);
    await deleteApp(defaultApp);
    expect(() => ref(db)).to.throw('Cannot call ref on a deleted database.');
    defaultApp = undefined;
  });
});
