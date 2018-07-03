import { expect } from 'chai';
import { initializeApp, database, app } from 'firebase';
import { fromRef } from '../database/fromRef';
import { list, ChildEvent } from '../database';
import { take, skip, switchMap } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';

const rando = () =>
  Math.random()
    .toString(36)
    .substring(5);
    

let batch = (items: any[]) => {
  let batch = {};
  Object.keys(items).forEach(function (key) {
    const itemValue = items[key];
    batch[itemValue.key] = itemValue;
  });
  // make batch immutable to preserve integrity
  return Object.freeze(batch);
}

describe('RxFire Database', () => {
  let app: app.App = null;
  let database: database.Database = null;
  let ref = (path: string) => { 
    app.database().goOffline(); 
    return app.database().ref(path); 
  };

  function prepareList(opts: { events?: ChildEvent[], skipnumber: number } = { skipnumber: 0 }) {
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
      projectId: 'rxfire-test-db',
      databaseURL: "https://rxfire-test.firebaseio.com",
    });
    database = app.database();
    database.goOffline();
  });

  afterEach((done: MochaDone) => {
    app.delete().then(() => done());
  });

  xdescribe('fromRef', () => {
    const items = [{ name: 'one' }, { name: 'two' }, { name: 'three' }]
      .map(item => ( { key: rando(), ...item } ));
    const itemsObj = batch(items);

    it('should complete using a once', (done) => {
      const itemRef = ref(rando());
      itemRef.set(itemsObj);
      const obs = fromRef(itemRef, 'value', 'once');
      obs.subscribe(_ => {}, () => {}, done);
    });

    it('it should should handle non-existence', (done) => {
      const itemRef = ref(rando());
      itemRef.set({});
      const obs = fromRef(itemRef, 'value');
      obs.pipe(take(1)).subscribe(change => {
        expect(change.snapshot.exists()).to.equal(false);
        expect(change.snapshot.val()).to.equal(null);
      }).add(done);
    });

    it('it should listen and then unsubscribe', (done) => {
      const itemRef = ref(rando());
      itemRef.set(itemsObj);
      const obs = fromRef(itemRef, 'value');
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
      it('should stream back a child_added event', (done: any) => {
        const itemRef = ref(rando());
        const data = itemsObj;
        itemRef.set(data);
        const obs = fromRef(itemRef, 'child_added');
        let count = 0;
        const sub = obs.subscribe(change => {
          count = count + 1;
          const { event, snapshot } = change;
          expect(event).to.equal('child_added');
          expect(snapshot.val()).to.eql(data[snapshot.key]);
          if (count === items.length) {
            done();
            sub.unsubscribe();
            expect(sub.closed).to.equal(true);
          }
        });
      });
  
      it('should stream back a child_changed event', (done: any) => {
        const itemRef = ref(rando());
        itemRef.set(itemsObj);
        const obs = fromRef(itemRef, 'child_changed');
        const name = 'look at what you made me do';
        const key = items[0].key;
        const sub = obs.subscribe(change => {
          const { event, snapshot } = change;
          expect(event).to.equal('child_changed');
          expect(snapshot.key).to.equal(key);
          expect(snapshot.val()).to.eql({ key, name });
          sub.unsubscribe();
          done();
        });
        itemRef.child(key).update({ name });
      });
  
      it('should stream back a child_removed event', (done: any) => {
        const itemRef = ref(rando());
        itemRef.set(itemsObj);
        const obs = fromRef(itemRef, 'child_removed');
        const key = items[0].key;
        const name = items[0].name;
        const sub = obs.subscribe(change => {
          const { event, snapshot } = change;
          expect(event).to.equal('child_removed');
          expect(snapshot.key).to.equal(key);
          expect(snapshot.val()).to.eql({ key, name });
          sub.unsubscribe();
          done();
        });
        itemRef.child(key).remove();
      });
  
      it('should stream back a child_moved event', (done: any) => {
        const itemRef = ref(rando());
        itemRef.set(itemsObj);
        const obs = fromRef(itemRef, 'child_moved');
        const key = items[2].key;
        const name = items[2].name;
        const sub = obs.subscribe(change => {
          const { event, snapshot } = change;
          expect(event).to.equal('child_moved');
          expect(snapshot.key).to.equal(key);
          expect(snapshot.val()).to.eql({ key, name });
          sub.unsubscribe();
          done();
        });
        itemRef.child(key).setPriority(-100, () => {});
      });
  
      it('should stream back a value event', (done: any) => {
        const itemRef = ref(rando());
        const data = itemsObj;
        itemRef.set(data);
        const obs = fromRef(itemRef, 'value');
        const sub = obs.subscribe(change => {
          const { event, snapshot } = change;
          expect(event).to.equal('value');
          expect(snapshot.val()).to.eql(data);
          done();
          sub.unsubscribe();
          expect(sub.closed).to.equal(true);
        });
      });
  
      it('should stream back query results', (done: any) => {
        const itemRef = ref(rando());
        itemRef.set(itemsObj);
        const query = itemRef.orderByChild('name').equalTo(items[0].name);
        const obs = fromRef(query, 'value');
        obs.subscribe(change => {
          let child;
          change.snapshot.forEach(snap => { child = snap.val(); return true; });
          expect(child).to.eql(items[0]);
          done();
        });
      });
  
    });

  });
  
  describe('list', () => {

    const items = [{ name: 'zero' }, { name: 'one' }, { name: 'two' }]
      .map((item, i) => ( { key: `${i}`, ...item } ));

    const itemsObj = batch(items);

    describe('events', () => {

      it('should stream value at first', (done) => {
        const someRef = ref(rando());
        const obs = list(someRef, ['child_added']);
        obs
          .pipe(take(1))
          .subscribe(changes => {
            const data = changes.map(change => change.snapshot.val());
            expect(data).to.eql(items);
          })
          .add(done);

        someRef.set(itemsObj);
      });

      it('should process a new child_added event', done => {
        const aref = ref(rando());
        const obs = list(aref, ['child_added']);
        obs
          .pipe(skip(1),take(1))
          .subscribe(changes => {
            const data = changes.map(change => change.snapshot.val());
            expect(data[3]).to.eql({ name: 'anotha one' });
          })
          .add(done);
        aref.set(itemsObj);
        aref.push({ name: 'anotha one' });
      });

      it('should stream in order events', (done) => {
        const aref = ref(rando());
        const obs = list(aref.orderByChild('name'), ['child_added']);
        const sub = obs.pipe(take(1)).subscribe(changes => {
          const names = changes.map(change => change.snapshot.val().name);
          expect(names[0]).to.eql('one');
          expect(names[1]).to.eql('two');
          expect(names[2]).to.eql('zero');
        }).add(done);
        aref.set(itemsObj);
      });
  
      it('should stream in order events w/child_added', (done) => {
        const aref = ref(rando());
        const obs = list(aref.orderByChild('name'), ['child_added']);
        const sub = obs.pipe(skip(1),take(1)).subscribe(changes => {
          const names = changes.map(change => change.snapshot.val().name);
          expect(names[0]).to.eql('anotha one');
          expect(names[1]).to.eql('one');
          expect(names[2]).to.eql('two');
          expect(names[3]).to.eql('zero');
        }).add(done);
        aref.set(itemsObj);
        aref.push({ name: 'anotha one' });
      });
  
      it('should stream events filtering', (done) => {
        const aref = ref(rando());
        const obs = list(aref.orderByChild('name').equalTo('zero'), ['child_added']);
        obs.pipe(skip(1),take(1)).subscribe(changes => {
          const names = changes.map(change => change.snapshot.val().name);
          expect(names[0]).to.eql('zero');
          expect(names[1]).to.eql('zero');
        }).add(done);
        aref.set(itemsObj);
        aref.push({ name: 'zero' });
      });
  
      it('should process a new child_removed event', done => {
        const aref = ref(rando());
        const obs = list(aref, ['child_added','child_removed']);
        const sub = obs.pipe(skip(1),take(1)).subscribe(changes => {
          const data = changes.map(change => change.snapshot.val());
          expect(data.length).to.eql(items.length - 1);
        }).add(done);
        app.database().goOnline();
        aref.set(itemsObj).then(() => {
          aref.child(items[0].key).remove();
        });
      });
  
      it('should process a new child_changed event', (done) => {
        const aref = ref(rando());
        const obs = list(aref, ['child_added','child_changed'])
        const sub = obs.pipe(skip(1),take(1)).subscribe(changes => {
          const data = changes.map(change => change.snapshot.val());
          expect(data[1].name).to.eql('lol');
        }).add(done);
        app.database().goOnline();
        aref.set(itemsObj).then(() => {
          aref.child(items[1].key).update({ name: 'lol'});
        });
      });
  
      it('should process a new child_moved event', (done) => {
        const aref = ref(rando());
        const obs = list(aref, ['child_added','child_moved'])
        const sub = obs.pipe(skip(1),take(1)).subscribe(changes => {
          const data = changes.map(change => change.snapshot.val());
          // We moved the first item to the last item, so we check that
          // the new result is now the last result
          expect(data[data.length - 1]).to.eql(items[0]);
        }).add(done);
        app.database().goOnline();
        aref.set(itemsObj).then(() => {
          aref.child(items[0].key).setPriority('a', () => {});
        });
      });

      it('should listen to all events by default', (done) => {
        const { snapChanges, ref } = prepareList();
        snapChanges.pipe(take(1)).subscribe(actions => {
          const data = actions.map(a => a.snapshot.val());
          expect(data).to.eql(items);
        }).add(done);
        ref.set(itemsObj);
      });
    
      it('should handle multiple subscriptions (hot)', (done) => {
        const { snapChanges, ref } = prepareList();
        const sub = snapChanges.subscribe(() => {}).add(done);
        snapChanges.pipe(take(1)).subscribe(actions => {
          const data = actions.map(a => a.snapshot.val());
          expect(data).to.eql(items);
        }).add(sub);
        ref.set(itemsObj);
      });
    
      it('should handle multiple subscriptions (warm)', done => {
        const { snapChanges, ref } = prepareList();
        snapChanges.pipe(take(1)).subscribe(() => {}).add(() => {
          snapChanges.pipe(take(1)).subscribe(actions => {
            const data = actions.map(a => a.snapshot.val());
            expect(data).to.eql(items);
          }).add(done);
        });
        ref.set(itemsObj);
      });
    
     it('should listen to only child_added events', (done) => {
        const { snapChanges, ref } = prepareList({ events: ['child_added'], skipnumber: 0 });
        snapChanges.pipe(take(1)).subscribe(actions => {
          const data = actions.map(a => a.snapshot.val());
          expect(data).to.eql(items);
        }).add(done);
        ref.set(itemsObj);
      });
    
      it('should listen to only child_added, child_changed events', (done) => {
        const { snapChanges, ref } = prepareList({
          events: ['child_added', 'child_changed'],
          skipnumber: 1
        });
        const name = 'ligatures';
        snapChanges.pipe(take(1)).subscribe(actions => {
          const data = actions.map(a => a.snapshot.val());;
          const copy = [...items];
          copy[0].name = name;
          expect(data).to.eql(copy);
        }).add(done);
        app.database().goOnline();
        ref.set(itemsObj).then(() => {
          ref.child(items[0].key).update({ name })
        });
      });
    
      it('should handle empty sets', done => {
        const aref = ref(rando());
        aref.set({});
        list(aref).pipe(take(1)).subscribe(data => {
          expect(data.length).to.eql(0);
        }).add(done);
      });
    
      it('should handle dynamic queries that return empty sets', done => {
        const ITEMS = 10;
        let count = 0;
        let firstIndex = 0;
        let namefilter$ = new BehaviorSubject<number|null>(null);
        const aref = ref(rando());
        aref.set(itemsObj);
        namefilter$.pipe(switchMap(name => {
          const filteredRef = name ? aref.child('name').equalTo(name) : aref
          return list(filteredRef);
        }),take(2)).subscribe(data => {
          count = count + 1;
          // the first time should all be 'added'
          if(count === 1) {
            expect(Object.keys(data).length).to.eql(3);
            namefilter$.next(-1);
          }
          // on the second round, we should have filtered out everything
          if(count === 2) {
            expect(Object.keys(data).length).to.eql(0);
          }
        }).add(done);
      });

    });
    
  });

});
