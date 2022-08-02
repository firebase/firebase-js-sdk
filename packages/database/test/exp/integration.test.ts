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
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
  get,
  limitToFirst,
  onValue,
  query,
  refFromURL,
  set,
  startAt
} from '../../src/api/Reference_impl';
import {
  getDatabase,
  goOffline,
  goOnline,
  push,
  ref,
  runTransaction
} from '../../src/index';
import { EventAccumulatorFactory } from '../helpers/EventAccumulator';
import {
  DATABASE_ADDRESS,
  DATABASE_URL,
  getUniqueRef,
  waitFor
} from '../helpers/util';

use(chaiAsPromised);

export function createTestApp() {
  return initializeApp({ databaseURL: DATABASE_URL });
}

// Note: these run in parallel with the node environment. If you use the same paths in parallel, you may experience race conditions.
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

    const ea = EventAccumulatorFactory.waitsForExactCount(2);
    const unsubscribe = onValue(fooRef, snap => {
      ea.addEvent(snap.val());
    });

    await set(fooRef, 'a');
    await set(fooRef, 'b');

    const [snap1, snap2] = await ea.promise;
    expect(snap1).to.equal('a');
    expect(snap2).to.equal('b');
    unsubscribe();
  });

  // Tests to make sure onValue's data does not get mutated after calling get
  it('calls onValue only once after get request with a non-default query', async () => {
    const db = getDatabase(defaultApp);
    const { ref: testRef } = getUniqueRef(db);
    const queries = [
      query(testRef, limitToFirst(1)),
      query(testRef, startAt('child1')),
      query(testRef, startAt('child2')),
      query(testRef, limitToFirst(2))
    ];
    await Promise.all(
      queries.map(async q => {
        const initial = [{ name: 'child1' }, { name: 'child2' }];
        const ec = EventAccumulatorFactory.waitsForExactCount(1);

        await set(testRef, initial);
        const unsubscribe = onValue(testRef, snapshot => {
          ec.addEvent(snapshot.val());
        });
        await get(q);
        await waitFor(2000);
        const [snap] = await ec.promise;
        expect(snap).to.deep.equal(initial);
        unsubscribe();
      })
    );
  });

  it('calls onValue and expects no issues with removing the listener', async () => {
    const db = getDatabase(defaultApp);
    const { ref: testRef } = getUniqueRef(db);
    const initial = [{ name: 'child1' }, { name: 'child2' }];
    const ea = EventAccumulatorFactory.waitsForExactCount(1);
    await set(testRef, initial);
    const unsubscribe = onValue(testRef, snapshot => {
      ea.addEvent(snapshot.val());
    });
    await get(query(testRef));
    await waitFor(2000);
    const update = [{ name: 'child1' }, { name: 'child20' }];
    unsubscribe();
    await set(testRef, update);
    const [snap1] = await ea.promise;
    expect(snap1).to.deep.eq(initial);
  });

  it('calls onValue only once after get request with a default query', async () => {
    const db = getDatabase(defaultApp);
    const { ref: testRef } = getUniqueRef(db);
    const initial = [{ name: 'child1' }, { name: 'child2' }];
    const ea = EventAccumulatorFactory.waitsForExactCount(1);

    await set(testRef, initial);
    const unsubscribe = onValue(testRef, snapshot => {
      ea.addEvent(snapshot.val());
      expect(snapshot.val()).to.deep.eq(initial);
    });
    await get(query(testRef));
    await waitFor(2000);
    const [snap] = await ea.promise;
    expect(snap).to.deep.equal(initial);
    unsubscribe();
  });
  it('calls onValue only once after get request with a nested query', async () => {
    const db = getDatabase(defaultApp);
    const ea = EventAccumulatorFactory.waitsForExactCount(1);
    const { ref: testRef, path } = getUniqueRef(db);
    const initial = {
      test: {
        abc: 123
      }
    };

    await set(testRef, initial);
    const unsubscribe = onValue(testRef, snapshot => {
      ea.addEvent(snapshot.val());
    });
    const nestedRef = ref(db, path + '/test');
    const result = await get(query(nestedRef));
    await waitFor(2000);
    const [snap] = await ea.promise;
    expect(snap).to.deep.equal(initial);
    expect(result.val()).to.deep.eq(initial.test);
    unsubscribe();
  });
  it('calls onValue only once after parent get request', async () => {
    const db = getDatabase(defaultApp);
    const { ref: testRef, path } = getUniqueRef(db);
    const ea = EventAccumulatorFactory.waitsForExactCount(1);
    const initial = {
      test: {
        abc: 123
      }
    };

    await set(testRef, initial);
    const nestedRef = ref(db, path + '/test');
    const unsubscribe = onValue(nestedRef, snapshot => {
      ea.addEvent(snapshot.val());
    });
    const result = await get(query(testRef));
    const events = await ea.promise;
    await waitFor(2000);
    expect(events.length).to.equal(1);
    expect(events[0]).to.deep.eq(initial.test);
    expect(result.val()).to.deep.equal(initial);
    unsubscribe();
  });

  it('Can use onlyOnce', async () => {
    const db = getDatabase(defaultApp);
    const fooRef = ref(db, 'foo');

    const ea = EventAccumulatorFactory.waitsForExactCount(1);
    const unsubscribe = onValue(
      fooRef,
      snap => {
        ea.addEvent(snap.val());
      },
      { onlyOnce: true }
    );

    await set(fooRef, 'a');
    await set(fooRef, 'b');

    const [snap1] = await ea.promise;
    expect(snap1).to.equal('a'); // This doesn't test that onValue was only triggered once
    unsubscribe();
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

  it('Can delete app', async () => {
    const db = getDatabase(defaultApp);
    await deleteApp(defaultApp);
    expect(() => ref(db)).to.throw('Cannot call ref on a deleted database.');
    defaultApp = undefined;
  });

  it('blocks get requests until the database is online', async () => {
    const db = getDatabase(defaultApp);
    const r = ref(db, 'foo3');
    const initial = {
      test: 1
    };
    await set(r, initial);
    goOffline(db);
    const pendingGet = get(r);
    let resolvedData: any = null;
    pendingGet.then(
      data => {
        resolvedData = data;
      },
      () => {
        resolvedData = new Error('rejected');
      }
    );
    await waitFor(2000);
    expect(resolvedData).to.equal(null);
    goOnline(db);
    await waitFor(2000);
    expect(resolvedData.val()).to.deep.equal(initial);
  });

  it('Can listen to transaction changes', async () => {
    // Repro for https://github.com/firebase/firebase-js-sdk/issues/5195
    let latestValue = 0;

    let deferred = new Deferred<void>();

    const database = getDatabase(defaultApp);
    const counterRef = push(ref(database, 'counter'));

    const unsubscribe = onValue(counterRef, snap => {
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
    unsubscribe();
  });
});
