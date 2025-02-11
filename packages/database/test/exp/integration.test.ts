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
  child,
  get,
  limitToFirst,
  onChildAdded,
  onValue,
  orderByChild,
  query,
  refFromURL,
  set,
  startAt,
  update,
  orderByKey
} from '../../src/api/Reference_impl';
import {
  connectDatabaseEmulator,
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
  EMULATOR_PORT,
  getFreshRepo,
  getRWRefs,
  USE_EMULATOR,
  waitFor,
  waitUntil,
  writeAndValidate
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
  it("doesn't try to connect to emulator after database has already started", async () => {
    const db = getDatabase(defaultApp);
    const r = ref(db, '.info/connected');
    const deferred = new Deferred();
    onValue(r, snapshot => {
      if (snapshot.val()) {
        deferred.resolve();
      }
    });
    await deferred.promise;
    process.env.__FIREBASE_DEFAULTS__ = JSON.stringify({
      emulatorHosts: {
        database: 'localhost:9000'
      }
    });
    expect(() => getDatabase(defaultApp)).to.not.throw();
    delete process.env.__FIREBASE_DEFAULTS__;
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

  if (USE_EMULATOR) {
    it('can connect to emulator', async () => {
      const db = getDatabase(defaultApp);
      connectDatabaseEmulator(db, 'localhost', parseInt(EMULATOR_PORT, 10));
      await get(refFromURL(db, `${DATABASE_ADDRESS}/foo/bar`));
    });
    it('can change emulator config before network operations', async () => {
      const db = getDatabase(defaultApp);
      const port = parseInt(EMULATOR_PORT, 10);
      connectDatabaseEmulator(db, 'localhost', port + 1);
      connectDatabaseEmulator(db, 'localhost', port);
      await get(refFromURL(db, `${DATABASE_ADDRESS}/foo/bar`));
    });
    it('can connect to emulator after network operations with same parameters', async () => {
      const db = getDatabase(defaultApp);
      const port = parseInt(EMULATOR_PORT, 10);
      connectDatabaseEmulator(db, 'localhost', port);
      await get(refFromURL(db, `${DATABASE_ADDRESS}/foo/bar`));
      connectDatabaseEmulator(db, 'localhost', port);
    });
    it('cannot connect to emulator after network operations with different parameters', async () => {
      const db = getDatabase(defaultApp);
      const port = parseInt(EMULATOR_PORT, 10);
      connectDatabaseEmulator(db, 'localhost', port);
      await get(refFromURL(db, `${DATABASE_ADDRESS}/foo/bar`));
      expect(() => {
        connectDatabaseEmulator(db, 'localhost', 9001);
      }).to.throw();
    });
  }

  it('can properly handle unknown deep merges', async () => {
    // Note: This test requires `testIndex` to be added as an index.
    // Please run `yarn test:setup` to ensure that this gets added.
    const database = getDatabase(defaultApp);
    const root = ref(database, 'testing');
    await set(root, {});

    const q = query(root, orderByChild('testIndex'), limitToFirst(2));

    const i1 = child(root, 'i1');
    await set(root, {
      i1: {
        testIndex: 3,
        timestamp: Date.now(),
        action: 'test'
      },
      i2: {
        testIndex: 1,
        timestamp: Date.now(),
        action: 'test'
      },
      i3: {
        testIndex: 2,
        timestamp: Date.now(),
        action: 'test'
      }
    });
    const ec = EventAccumulatorFactory.waitsForExactCount(2);
    const onChildAddedCb = onChildAdded(q, snap => {
      ec.addEvent(snap);
    });
    const onValueCb = onValue(i1, () => {
      //no-op
    });
    await update(i1, {
      timestamp: `${Date.now()}|1`
    });
    const results = await ec.promise;
    results.forEach(result => {
      const value = result.val();
      expect(value).to.haveOwnProperty('timestamp');
      expect(value).to.haveOwnProperty('action');
      expect(value).to.haveOwnProperty('testIndex');
    });
    onChildAddedCb();
    onValueCb();
  });

  // Tests to make sure onValue's data does not get mutated after calling get
  it('calls onValue only once after get request with a non-default query', async () => {
    const { readerRef } = getRWRefs(getDatabase(defaultApp));
    const queries = [
      query(readerRef, limitToFirst(1)),
      query(readerRef, startAt('child1')),
      query(readerRef, startAt('child2')),
      query(readerRef, limitToFirst(2))
    ];
    await Promise.all(
      queries.map(async q => {
        const initial = [{ name: 'child1' }, { name: 'child2' }];
        const ec = EventAccumulatorFactory.waitsForExactCount(1);
        const writerPath = getFreshRepo(readerRef._path);
        await set(writerPath, initial);
        const unsubscribe = onValue(readerRef, snapshot => {
          ec.addEvent(snapshot);
        });
        await get(q);
        await waitFor(2000);
        const [snap] = await ec.promise;
        expect(snap.val()).to.deep.equal(initial);
        unsubscribe();
      })
    );
  });

  it('[smoketest] - calls onValue() listener when get() is called on a parent node', async () => {
    // Test that when get() is pending on a parent node, and then onValue is called on a child node, that after the get() comes back, the onValue() listener fires.
    const db = getDatabase(defaultApp);
    const { readerRef, writerRef } = getRWRefs(db);
    await set(writerRef, {
      foo1: {
        a: 1
      },
      foo2: {
        b: 1
      }
    });
    await waitUntil(() => {
      // Because this is a test reliant on network latency, it can be difficult to reproduce. There are situations when get() resolves immediately, and the above behavior is not observed.
      let pending = false;
      get(readerRef).then(() => (pending = true));
      return !pending;
    });
    const childPath = child(readerRef, 'foo1');
    const ec = EventAccumulatorFactory.waitsForExactCount(1);
    onValue(childPath, snapshot => {
      ec.addEvent(snapshot.val());
    });
    const events = await ec.promise;
    expect(events.length).to.eq(1);
    const snapshot = events[0];
    expect(snapshot).to.deep.eq({ a: 1 });
  });

  it('calls onValue and expects no issues with removing the listener', async () => {
    const db = getDatabase(defaultApp);
    const { readerRef, writerRef } = getRWRefs(db);
    const initial = [{ name: 'child1' }, { name: 'child2' }];
    const ea = EventAccumulatorFactory.waitsForExactCount(1);
    await set(writerRef, initial);
    const unsubscribe = onValue(readerRef, snapshot => {
      ea.addEvent(snapshot.val());
    });
    await get(query(readerRef));
    await waitFor(2000);
    const update = [{ name: 'child1' }, { name: 'child20' }];
    unsubscribe();
    await set(writerRef, update);
    const [snap1] = await ea.promise;
    expect(snap1).to.deep.eq(initial);
  });

  it('calls onValue only once after get request with a default query', async () => {
    const db = getDatabase(defaultApp);
    const { readerRef, writerRef } = getRWRefs(db);
    const initial = [{ name: 'child1' }, { name: 'child2' }];
    const ea = EventAccumulatorFactory.waitsForExactCount(1);

    await set(writerRef, initial);
    const unsubscribe = onValue(readerRef, snapshot => {
      ea.addEvent(snapshot);
      expect(snapshot.val()).to.deep.eq(initial);
    });
    await get(query(readerRef));
    await waitFor(2000);
    const [snap] = await ea.promise;
    expect(snap.val()).to.deep.equal(initial);
    unsubscribe();
  });

  it('calls onValue only once after get request with a nested query', async () => {
    const db = getDatabase(defaultApp);
    const ea = EventAccumulatorFactory.waitsForExactCount(1);
    const { readerRef, writerRef } = getRWRefs(db);
    const initial = {
      test: {
        abc: 123
      }
    };
    await set(writerRef, initial);
    const unsubscribe = onValue(readerRef, snapshot => {
      ea.addEvent(snapshot);
    });
    const nestedRef = child(readerRef, 'test');
    const result = await get(query(nestedRef));
    await waitFor(2000);
    const [snap] = await ea.promise;
    expect(snap.val()).to.deep.equal(initial);
    expect(result.val()).to.deep.eq(initial.test);
    unsubscribe();
  });
  it('calls onValue only once after parent get request', async () => {
    const db = getDatabase(defaultApp);
    const { readerRef, writerRef } = getRWRefs(db);
    const ea = EventAccumulatorFactory.waitsForExactCount(1);
    const initial = {
      test: {
        abc: 123
      }
    };

    await set(writerRef, initial);
    const nestedRef = child(readerRef, 'test');
    const unsubscribe = onValue(nestedRef, snapshot => {
      ea.addEvent(snapshot);
    });
    const result = await get(query(readerRef));
    const events = await ea.promise;
    await waitFor(2000);
    expect(events.length).to.equal(1);
    expect(events[0].val()).to.deep.eq(initial.test);
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

  it('resolves get to serverCache when the database is offline', async () => {
    const db = getDatabase(defaultApp);
    const { writerRef } = getRWRefs(db);
    const expected = {
      test: 'abc'
    };
    await set(writerRef, expected);
    goOffline(db);
    const result = await get(writerRef);
    expect(result.val()).to.deep.eq(expected);
    goOnline(db);
  });

  it('resolves get to serverCache when the database is offline and using a parent-level listener', async () => {
    const db = getDatabase(defaultApp);
    const { readerRef, writerRef } = getRWRefs(db);
    const toWrite = {
      test: 'def'
    };
    const ec = EventAccumulatorFactory.waitsForExactCount(1);
    await set(writerRef, toWrite);
    onValue(readerRef, snapshot => {
      ec.addEvent(snapshot);
    });
    await ec.promise;
    goOffline(db);
    const result = await get(child(readerRef, 'test'));
    expect(result.val()).to.deep.eq(toWrite.test);
    goOnline(db);
  });

  it('only fires listener once when calling get with limitTo', async () => {
    const db = getDatabase(defaultApp);
    const { readerRef, writerRef } = getRWRefs(db);
    const ec = EventAccumulatorFactory.waitsForExactCount(1);
    const toWrite = {
      child1: 'test1',
      child2: 'test2'
    };
    await writeAndValidate(writerRef, readerRef, toWrite, ec);
    const q = query(readerRef, limitToFirst(1));
    const snapshot = await get(q);
    const expected = {
      child1: 'test1'
    };
    expect(snapshot.val()).to.deep.eq(expected);
  });

  it('should listen to a disjointed path and get should return the corresponding value', async () => {
    const db = getDatabase(defaultApp);
    const { readerRef, writerRef } = getRWRefs(db);
    const toWrite = {
      child1: 'test1',
      child2: 'test2',
      child3: 'test3'
    };
    let ec = EventAccumulatorFactory.waitsForExactCount(1);
    await writeAndValidate(writerRef, readerRef, toWrite, ec);
    ec = EventAccumulatorFactory.waitsForExactCount(1);
    const child1Ref = child(readerRef, 'child1');
    onValue(child1Ref, snapshot => {
      ec.addEvent(snapshot);
    });
    const otherChildrenQuery = query(
      readerRef,
      orderByKey(),
      startAt('child2')
    );
    const expected = {
      child2: 'test2',
      child3: 'test3'
    };
    const [child1Snapshot] = await ec.promise;
    expect(child1Snapshot.val()).to.eq('test1');
    const snapshot = await get(otherChildrenQuery);
    expect(snapshot.val()).to.deep.eq(expected);
  });

  it('should test startAt get with listener only fires once', async () => {
    const db = getDatabase(defaultApp);
    const { readerRef, writerRef } = getRWRefs(db);
    const expected = {
      child1: 'test1',
      child2: 'test2',
      child3: 'test3'
    };
    const ec = EventAccumulatorFactory.waitsForExactCount(1);
    await writeAndValidate(writerRef, readerRef, expected, ec);
    const q = query(readerRef, orderByKey(), startAt('child2'));
    const snapshot = await get(q);
    const expectedQRes = {
      child2: 'test2',
      child3: 'test3'
    };
    expect(snapshot.val()).to.deep.eq(expectedQRes);
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
