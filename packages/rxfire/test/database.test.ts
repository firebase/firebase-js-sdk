/**
 * @license
 * Copyright 2018 Google Inc.
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

// tslint:disable:no-floating-promises

import { expect } from 'chai';
// app/database is used as namespaces to access types
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { initializeApp, database, app } from 'firebase';
import { fromRef } from '../database/fromRef';
import {
  list,
  ListenEvent,
  objectVal,
  listVal,
  QueryChange
} from '../database';
import { take, skip, switchMap } from 'rxjs/operators';
import { BehaviorSubject, Observable } from 'rxjs';
import { auditTrail } from '../database/list/audit-trail';

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const TEST_PROJECT = require('../../../config/project.json');

const rando = (): string =>
  Math.random()
    .toString(36)
    .substring(5);

const batch = (
  items: Array<{ name: string; key: string }>
): Readonly<{ [key: string]: unknown }> => {
  const batch: { [key: string]: unknown } = {};
  items.forEach(item => {
    batch[item.key] = item;
  });
  // make batch immutable to preserve integrity
  return Object.freeze(batch);
};

describe('RxFire Database', () => {
  let app: app.App;
  let database: database.Database;
  const ref = (path: string): database.Reference => {
    app!.database().goOffline();
    return app!.database().ref(path);
  };

  function prepareList(
    opts: { events?: ListenEvent[]; skipnumber: number } = { skipnumber: 0 }
  ): {
    snapChanges: Observable<QueryChange[]>;
    ref: database.Reference;
  } {
    const { events, skipnumber } = opts;
    const aref = ref(rando());
    const snapChanges = list(aref, events);
    return {
      snapChanges: snapChanges.pipe(skip(skipnumber)),
      ref: aref
    };
  }

  /**
   * Each test runs inside it's own app instance and the app
   * is deleted after the test runs.
   *
   * Database tests run "offline" to reduce "flakeyness".
   *
   * Each test is responsible for seeding and removing data. Helper
   * functions are useful if the process becomes brittle or tedious.
   * Note that removing is less necessary since the tests are run
   * offline.
   *
   * Note: Database tests do not run exactly the same offline as
   * they do online. Querying can act differently, tests must
   * account for this.
   */
  beforeEach(() => {
    app = initializeApp({
      projectId: TEST_PROJECT.projectId,
      databaseURL: TEST_PROJECT.databaseURL
    });
    database = app.database();
    database.goOffline();
  });

  afterEach((done: MochaDone) => {
    app.delete().then(() => done());
  });

  describe('fromRef', () => {
    const items = [{ name: 'one' }, { name: 'two' }, { name: 'three' }].map(
      item => ({ key: rando(), ...item })
    );
    const itemsObj = batch(items);

    /**
     * This test checks that "non-existent" or null value references are
     * handled.
     */
    it('it should should handle non-existence', done => {
      const itemRef = ref(rando());
      itemRef.set({});
      const obs = fromRef(itemRef, ListenEvent.value);
      obs
        .pipe(take(1))
        .subscribe(change => {
          expect(change.snapshot.exists()).to.equal(false);
          expect(change.snapshot.val()).to.equal(null);
        })
        .add(done);
    });

    /**
     * This test checks that the Observable unsubscribe mechanism works.
     *
     * Calling unsubscribe should trigger the ref.off() method.
     */
    it('it should listen and then unsubscribe', done => {
      const itemRef = ref(rando());
      itemRef.set(itemsObj);
      const obs = fromRef(itemRef, ListenEvent.value);
      let count = 0;
      const sub = obs.subscribe(_ => {
        count = count + 1;
        // hard coding count to one will fail if the unsub
        // doesn't actually unsub
        expect(count).to.equal(1);
        done();
        sub.unsubscribe();
        itemRef.push({ name: 'anotha one' });
      });
    });

    describe('events', () => {
      /**
       * This test provides the `child_added` event and tests that only
       * `child_added` events are received.
       */
      it('should stream back a child_added event', (done: any) => {
        const itemRef = ref(rando());
        const data = itemsObj;
        itemRef.set(data);
        const obs = fromRef(itemRef, ListenEvent.added);
        let count = 0;
        const sub = obs.subscribe(change => {
          count = count + 1;
          const { event, snapshot } = change;
          expect(event).to.equal(ListenEvent.added);
          expect(snapshot.val()).to.eql(data[snapshot.key!]);
          if (count === items.length) {
            done();
            sub.unsubscribe();
            expect(sub.closed).to.equal(true);
          }
        });
      });

      /**
       * This test provides the `child_changed` event and tests that only
       * `child_changed` events are received.
       */
      it('should stream back a child_changed event', (done: any) => {
        const itemRef = ref(rando());
        itemRef.set(itemsObj);
        const obs = fromRef(itemRef, ListenEvent.changed);
        const name = 'look at what you made me do';
        const key = items[0].key;
        const sub = obs.subscribe(change => {
          const { event, snapshot } = change;
          expect(event).to.equal(ListenEvent.changed);
          expect(snapshot.key).to.equal(key);
          expect(snapshot.val()).to.eql({ key, name });
          sub.unsubscribe();
          done();
        });
        itemRef.child(key).update({ name });
      });

      /**
       * This test provides the `child_removed` event and tests that only
       * `child_removed` events are received.
       */
      it('should stream back a child_removed event', (done: any) => {
        const itemRef = ref(rando());
        itemRef.set(itemsObj);
        const obs = fromRef(itemRef, ListenEvent.removed);
        const key = items[0].key;
        const name = items[0].name;
        const sub = obs.subscribe(change => {
          const { event, snapshot } = change;
          expect(event).to.equal(ListenEvent.removed);
          expect(snapshot.key).to.equal(key);
          expect(snapshot.val()).to.eql({ key, name });
          sub.unsubscribe();
          done();
        });
        itemRef.child(key).remove();
      });

      /**
       * This test provides the `child_moved` event and tests that only
       * `child_moved` events are received.
       */
      it('should stream back a child_moved event', (done: any) => {
        const itemRef = ref(rando());
        itemRef.set(itemsObj);
        const obs = fromRef(itemRef, ListenEvent.moved);
        const key = items[2].key;
        const name = items[2].name;
        const sub = obs.subscribe(change => {
          const { event, snapshot } = change;
          expect(event).to.equal(ListenEvent.moved);
          expect(snapshot.key).to.equal(key);
          expect(snapshot.val()).to.eql({ key, name });
          sub.unsubscribe();
          done();
        });
        itemRef.child(key).setPriority(-100, () => {});
      });

      /**
       * This test provides the `value` event and tests that only
       * `value` events are received.
       */
      it('should stream back a value event', (done: any) => {
        const itemRef = ref(rando());
        const data = itemsObj;
        itemRef.set(data);
        const obs = fromRef(itemRef, ListenEvent.value);
        const sub = obs.subscribe(change => {
          const { event, snapshot } = change;
          expect(event).to.equal(ListenEvent.value);
          expect(snapshot.val()).to.eql(data);
          done();
          sub.unsubscribe();
          expect(sub.closed).to.equal(true);
        });
      });

      /**
       * This test provides queries a reference and checks that the queried
       * values are streamed back.
       */
      it('should stream back query results', (done: any) => {
        const itemRef = ref(rando());
        itemRef.set(itemsObj);
        const query = itemRef.orderByChild('name').equalTo(items[0].name);
        const obs = fromRef(query, ListenEvent.value);
        obs.subscribe(change => {
          let child;
          change.snapshot.forEach(snap => {
            child = snap.val();
            return true;
          });
          expect(child).to.eql(items[0]);
          done();
        });
      });
    });
  });

  describe('list', () => {
    const items = [{ name: 'zero' }, { name: 'one' }, { name: 'two' }].map(
      (item, i) => ({ key: `${i}`, ...item })
    );

    const itemsObj = batch(items);

    describe('events', () => {
      /**
       * `value` events are provided first when subscribing to a list. We need
       * to know what the "intial" data list is, so a value event is used.
       */
      it('should stream value at first', done => {
        const someRef = ref(rando());
        const obs = list(someRef, [ListenEvent.added]);
        obs
          .pipe(take(1))
          .subscribe(changes => {
            const data = changes.map(change => change.snapshot.val());
            expect(data).to.eql(items);
          })
          .add(done);

        someRef.set(itemsObj);
      });

      /**
       * This test checks that `child_added` events are only triggered when
       * specified in the events array.
       *
       * The first result is skipped because it is always `value`. A `take(1)`
       * is used to close the stream after the `child_added` event occurs.
       */
      it('should process a new child_added event', done => {
        const aref = ref(rando());
        const obs = list(aref, [ListenEvent.added]);
        obs
          .pipe(
            skip(1),
            take(1)
          )
          .subscribe(changes => {
            const data = changes.map(change => change.snapshot.val());
            expect(data[3]).to.eql({ name: 'anotha one' });
          })
          .add(done);
        aref.set(itemsObj);
        aref.push({ name: 'anotha one' });
      });

      /**
       * This test checks that events are emitted in proper order. The reference
       * is queried and the test ensures that the array is in proper order.
       */
      it('should stream in order events', done => {
        const aref = ref(rando());
        const obs = list(aref.orderByChild('name'), [ListenEvent.added]);
        obs
          .pipe(take(1))
          .subscribe(changes => {
            const names = changes.map(change => change.snapshot.val().name);
            expect(names[0]).to.eql('one');
            expect(names[1]).to.eql('two');
            expect(names[2]).to.eql('zero');
          })
          .add(done);
        aref.set(itemsObj);
      });

      /**
       * This test checks that the array is in order with child_added specified.
       * A new record is added that appears on top of the query and the test
       * skips the first value event and checks that the newly added item is
       * on top.
       */
      it('should stream in order events w/child_added', done => {
        const aref = ref(rando());
        const obs = list(aref.orderByChild('name'), [ListenEvent.added]);
        obs
          .pipe(
            skip(1),
            take(1)
          )
          .subscribe(changes => {
            const names = changes.map(change => change.snapshot.val().name);
            expect(names[0]).to.eql('anotha one');
            expect(names[1]).to.eql('one');
            expect(names[2]).to.eql('two');
            expect(names[3]).to.eql('zero');
          })
          .add(done);
        aref.set(itemsObj);
        aref.push({ name: 'anotha one' });
      });

      /**
       * This test checks that a filtered reference still emits the proper events.
       */
      it('should stream events filtering', done => {
        const aref = ref(rando());
        const obs = list(aref.orderByChild('name').equalTo('zero'), [
          ListenEvent.added
        ]);
        obs
          .pipe(
            skip(1),
            take(1)
          )
          .subscribe(changes => {
            const names = changes.map(change => change.snapshot.val().name);
            expect(names[0]).to.eql('zero');
            expect(names[1]).to.eql('zero');
          })
          .add(done);
        aref.set(itemsObj);
        aref.push({ name: 'zero' });
      });

      /**
       * This test checks that the a `child_removed` event is processed in the
       * array by testing that the new length is shorter than the original
       * length.
       */
      it('should process a new child_removed event', done => {
        const aref = ref(rando());
        const obs = list(aref, [ListenEvent.added, ListenEvent.removed]);
        const _sub = obs
          .pipe(
            skip(1),
            take(1)
          )
          .subscribe(changes => {
            const data = changes.map(change => change.snapshot.val());
            expect(data.length).to.eql(items.length - 1);
          })
          .add(done);
        app.database().goOnline();
        aref.set(itemsObj).then(() => {
          aref.child(items[0].key).remove();
        });
      });

      /**
       * This test checks that the `child_changed` event is processed by
       * checking the new value of the object in the array.
       */
      it('should process a new child_changed event', done => {
        const aref = ref(rando());
        const obs = list(aref, [ListenEvent.added, ListenEvent.changed]);
        const _sub = obs
          .pipe(
            skip(1),
            take(1)
          )
          .subscribe(changes => {
            const data = changes.map(change => change.snapshot.val());
            expect(data[1].name).to.eql('lol');
          })
          .add(done);
        app.database().goOnline();
        aref.set(itemsObj).then(() => {
          aref.child(items[1].key).update({ name: 'lol' });
        });
      });

      /**
       * This test checks the `child_moved` event is processed by checking that
       * the new position is properly updated.
       */
      it('should process a new child_moved event', done => {
        const aref = ref(rando());
        const obs = list(aref, [ListenEvent.added, ListenEvent.moved]);
        const _sub = obs
          .pipe(
            skip(1),
            take(1)
          )
          .subscribe(changes => {
            const data = changes.map(change => change.snapshot.val());
            // We moved the first item to the last item, so we check that
            // the new result is now the last result
            expect(data[data.length - 1]).to.eql(items[0]);
          })
          .add(done);
        app.database().goOnline();
        aref.set(itemsObj).then(() => {
          aref.child(items[0].key).setPriority('a', () => {});
        });
      });

      /**
       * If no events array is provided in `list()` all events are listened to.
       *
       * This test checks that all events are processed without providing the
       * array.
       */
      it('should listen to all events by default', done => {
        const { snapChanges, ref } = prepareList();
        snapChanges
          .pipe(take(1))
          .subscribe(actions => {
            const data = actions.map(a => a.snapshot.val());
            expect(data).to.eql(items);
          })
          .add(done);
        ref.set(itemsObj);
      });

      /**
       * This test checks that multiple subscriptions work properly.
       */
      it('should handle multiple subscriptions (hot)', done => {
        const { snapChanges, ref } = prepareList();
        const sub = snapChanges.subscribe(() => {}).add(done);
        snapChanges
          .pipe(take(1))
          .subscribe(actions => {
            const data = actions.map(a => a.snapshot.val());
            expect(data).to.eql(items);
          })
          .add(sub);
        ref.set(itemsObj);
      });

      /**
       * This test checks that multiple subscriptions work properly.
       */
      it('should handle multiple subscriptions (warm)', done => {
        const { snapChanges, ref } = prepareList();
        snapChanges
          .pipe(take(1))
          .subscribe(() => {})
          .add(() => {
            snapChanges
              .pipe(take(1))
              .subscribe(actions => {
                const data = actions.map(a => a.snapshot.val());
                expect(data).to.eql(items);
              })
              .add(done);
          });
        ref.set(itemsObj);
      });

      /**
       * This test checks that only `child_added` events are processed.
       */
      it('should listen to only child_added events', done => {
        const { snapChanges, ref } = prepareList({
          events: [ListenEvent.added],
          skipnumber: 0
        });
        snapChanges
          .pipe(take(1))
          .subscribe(actions => {
            const data = actions.map(a => a.snapshot.val());
            expect(data).to.eql(items);
          })
          .add(done);
        ref.set(itemsObj);
      });

      /**
       * This test checks that only `child_added` and `child_changed` events are
       * processed.
       */

      it('should listen to only child_added, child_changed events', done => {
        const { snapChanges, ref } = prepareList({
          events: [ListenEvent.added, ListenEvent.changed],
          skipnumber: 1
        });
        const name = 'ligatures';
        snapChanges
          .pipe(take(1))
          .subscribe(actions => {
            const data = actions.map(a => a.snapshot.val());
            const copy = [...items];
            copy[0].name = name;
            expect(data).to.eql(copy);
          })
          .add(done);
        app.database().goOnline();
        ref.set(itemsObj).then(() => {
          ref.child(items[0].key).update({ name });
        });
      });

      /**
       * This test checks that empty sets are processed.
       */
      it('should handle empty sets', done => {
        const aref = ref(rando());
        aref.set({});
        list(aref)
          .pipe(take(1))
          .subscribe(data => {
            expect(data.length).to.eql(0);
          })
          .add(done);
      });

      /**
       * This test checks that dynamic querying works even with results that
       * are empty.
       */
      it('should handle dynamic queries that return empty sets', done => {
        let count = 0;
        const namefilter$ = new BehaviorSubject<number | null>(null);
        const aref = ref(rando());
        aref.set(itemsObj);
        namefilter$
          .pipe(
            switchMap(name => {
              const filteredRef = name
                ? aref.child('name').equalTo(name)
                : aref;
              return list(filteredRef);
            }),
            take(2)
          )
          .subscribe(data => {
            count = count + 1;
            // the first time should all be 'added'
            if (count === 1) {
              expect(Object.keys(data).length).to.eql(3);
              namefilter$.next(-1);
            }
            // on the second round, we should have filtered out everything
            if (count === 2) {
              expect(Object.keys(data).length).to.eql(0);
            }
          })
          .add(done);
      });
    });
  });

  describe('auditTrail', () => {
    const items = [{ name: 'zero' }, { name: 'one' }, { name: 'two' }].map(
      (item, i) => ({ key: `${i}`, ...item })
    );

    const itemsObj = batch(items);

    function prepareAuditTrail(
      opts: { events?: ListenEvent[]; skipnumber: number } = { skipnumber: 0 }
    ): {
      changes: Observable<QueryChange[]>;
      ref: database.Reference;
    } {
      const { events, skipnumber } = opts;
      const aref = ref(rando());
      aref.set(itemsObj);
      const changes = auditTrail(aref, events);
      return {
        changes: changes.pipe(skip(skipnumber)),
        ref: aref
      };
    }

    /**
     * This test checks that auditTrail retuns all events by default.
     */
    it('should listen to all events by default', done => {
      const { changes } = prepareAuditTrail();
      changes.subscribe(actions => {
        const data = actions.map(a => a.snapshot.val());
        expect(data).to.eql(items);
        done();
      });
    });
  });

  describe('Data Mapping Functions', () => {
    const items = [{ name: 'one' }, { name: 'two' }, { name: 'three' }].map(
      item => ({ key: rando(), ...item })
    );
    const itemsObj = batch(items);

    /**
     * The `listVal` function should map a query to an array of objects
     */
    it('listVal should map a query to an array of objects', (done: MochaDone) => {
      const itemRef = ref(rando());
      const data = { testKey: { hello: 'world' } };
      itemRef.set(data);

      const obs = listVal<any>(itemRef, 'KEY').pipe(take(1));

      obs.subscribe(val => {
        expect(val).to.be.instanceOf(Array);
        expect(val[0].KEY).to.equal('testKey');
        expect(val[0].hello).to.equal('world');
        done();
      });
    });

    /**
     * The `objectVal` function should map a query to its object val
     */
    it('objectVal should map a reference or query to its value', (done: MochaDone) => {
      const itemRef = ref(rando());
      itemRef.set(itemsObj);
      const obs = objectVal(itemRef).pipe(take(1));

      obs.subscribe(val => {
        expect(val).to.be.instanceOf(Object);
        expect(val).to.deep.equal(itemsObj);
        done();
      });
    });
  });
});
