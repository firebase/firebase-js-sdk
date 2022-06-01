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

import { initializeApp, deleteApp } from '@firebase/app';
import { Deferred } from '@firebase/util';
import { expect } from 'chai';
import Sinon, { createSandbox } from 'sinon';

import {
  limitToFirst,
  onValue,
  query,
  set
} from '../../src/api/Reference_impl';
import {
  get,
  getDatabase,
  goOffline,
  goOnline,
  push,
  ref,
  refFromURL,
  runTransaction
} from '../../src/index';
import { EventAccumulatorFactory } from '../helpers/EventAccumulator';
import { DATABASE_ADDRESS, DATABASE_URL, waitFor } from '../helpers/util';

export function createTestApp() {
  return initializeApp({ databaseURL: DATABASE_URL });
}

describe.only('Database@exp Tests', () => {
  let defaultApp;
  let mySandbox: Sinon.SinonSandbox;

  beforeEach(() => {
    defaultApp = createTestApp();
    mySandbox = createSandbox();
  });

  afterEach(async () => {
    mySandbox.restore();
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

    const ea = EventAccumulatorFactory.waitsForExactCount(2);
    onValue(fooRef, snap => {
      ea.addEvent(snap.val());
    });

    await set(fooRef, 'a');
    await set(fooRef, 'b');

    const [snap1, snap2] = await ea.promise;
    expect(snap1).to.equal('a');
    expect(snap2).to.equal('b');
  });

  // Tests to make sure onValue's data does not get mutated after calling get
  it('calls onValue only once after get request with a non-default query', async () => {
    const db = getDatabase(defaultApp);
    const testRef = ref(db, 'foo');
    const initial = [{ name: 'child1' }, { name: 'child2' }];
    const ec = EventAccumulatorFactory.waitsForExactCount(1);

    await set(testRef, initial);
    const unsubscribe = onValue(testRef, snapshot => {
      ec.addEvent(snapshot.val());
    });
    await get(query(testRef, limitToFirst(1)));
    await waitFor(2000);
    const events = await ec.promise;
    expect(events.length).to.equal(1);
    expect(events[0]).to.deep.equal(initial);
    unsubscribe();
  });

  it('calls onValue and expects no issues with removing the listener', async () => {
    const db = getDatabase(defaultApp);
    const testRef = ref(db, 'foo');
    const initial = [{ name: 'child1' }, { name: 'child2' }];
    const eventFactory = EventAccumulatorFactory.waitsForExactCount(1);
    await set(testRef, initial);
    const unsubscribe = onValue(testRef, snapshot => {
      eventFactory.addEvent(snapshot.val());
    });
    await get(query(testRef));
    const update = [{name: 'child1'}, { name: 'child20'}];
    unsubscribe();
    await set(testRef, update);
    const [snap1] = await eventFactory.promise;
    expect(snap1).to.deep.eq(initial);
  });
  it('calls onValue only once after get request with a default query', async () => {
    const db = getDatabase(defaultApp);
    const testRef = ref(db, 'foo');
    const initial = [{ name: 'child1' }, { name: 'child2' }];

    let count = 0;
    await set(testRef, initial);
    const unsubscribe = onValue(testRef, snapshot => {
      expect(snapshot.val()).to.deep.eq(initial);
      count++;
    });
    await get(query(testRef));
    await waitFor(2000);
    expect(count).to.equal(1);
    unsubscribe();
  });
  it('calls onValue only once after get request with a nested query', async () => {
    const db = getDatabase(defaultApp);
    const uniqueID = 'foo';
    const testRef = ref(db, uniqueID);
    const initial = {
      test: {
        abc: 123
      }
    };

    let count = 0;
    await set(testRef, initial);
    const unsubscribe = onValue(testRef, snapshot => {
      expect(snapshot.val()).to.deep.eq(initial);
      count++;
    });
    const nestedRef = ref(db, uniqueID + '/test');
    const result = await get(query(nestedRef));
    await waitFor(2000);
    expect(count).to.deep.equal(1);
    expect(result.val()).to.deep.eq(initial.test);
    unsubscribe();
  });
  it('calls onValue only once after parent get request', async () => {
    const db = getDatabase(defaultApp);
    const uniqueID = 'foo';
    const testRef = ref(db, uniqueID);
    const initial = {
      test: {
        abc: 123
      }
    };

    let count = 0;
    await set(testRef, initial);
    const nestedRef = ref(db, uniqueID + '/test');
    const unsubscribe = onValue(nestedRef, snapshot => {
      // expect(snapshot.val()).to.deep.eq(initial.test);
      count++;
    });
    const result = await get(query(testRef));
    await waitFor(2000);
    expect(count).to.equal(1);
    expect(result.val()).to.deep.eq(initial);
    unsubscribe();
  });

  it('Can use onlyOnce', async () => {
    const db = getDatabase(defaultApp);
    const fooRef = ref(db, 'foo');

    const ea = EventAccumulatorFactory.waitsForExactCount(1);
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
    expect(snap1).to.equal('a'); // This doesn't necessarily test that onValue was only triggered once
  });

  it('Can unsubscribe', async () => {
    const db = getDatabase(defaultApp);
    const fooRef = ref(db, 'foo');

    const ea = EventAccumulatorFactory.waitsForExactCount(1);
    const unsubscribe = onValue(fooRef, snap => {
      ea.addEvent(snap.val());
    });

    await set(fooRef, 'a');
    unsubscribe();
    await set(fooRef, 'b');

    const events = await ea.promise;
    expect(events.length).to.equal(1);
    expect(events[0]).to.equal('a');
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

  it('Can listen to transaction changes', async () => {
    // Repro for https://github.com/firebase/firebase-js-sdk/issues/5195
    let latestValue = 0;

    let deferred = new Deferred<void>();

    const database = getDatabase(defaultApp);
    const counterRef = push(ref(database, 'counter'));

    onValue(counterRef, snap => {
      latestValue = snap.val();
      deferred.resolve();
    });

    async function incrementViaTransaction() {
      deferred = new Deferred<void>();
      await runTransaction(counterRef, currentData => {
        return currentData + 1;
      });
      // Wait for the snapshot listener to fire. They are not invoked inline
      // for transactions.
      await deferred.promise;
    }

    expect(latestValue).to.equal(0);

    await incrementViaTransaction();
    expect(latestValue).to.equal(1);
    await incrementViaTransaction();
    expect(latestValue).to.equal(2);
  });
});
