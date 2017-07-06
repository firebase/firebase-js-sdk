import { expect } from "chai";
import { getRandomNode } from "./helpers/util";
import { EventAccumulatorFactory } from "./helpers/EventAccumulator";
import { Reference } from "../../src/database/api/Reference";

describe('.orderBy tests', function() {

  // TODO: setup spy on console.warn

  var clearRef = (getRandomNode() as Reference);

  it('Snapshots are iterated in order', function() {
    var ref = (getRandomNode() as Reference);

    var initial = {
      alex: {nuggets: 60},
      rob: {nuggets: 56},
      vassili: {nuggets: 55.5},
      tony: {nuggets: 52},
      greg: {nuggets: 52}
    };

    var expectedOrder = ['greg', 'tony', 'vassili', 'rob', 'alex'];
    var expectedPrevNames = [null, 'greg', 'tony', 'vassili', 'rob'];

    var valueOrder = [];
    var addedOrder = [];
    var addedPrevNames = [];

    var orderedRef = ref.orderByChild('nuggets');

    orderedRef.on('value', function(snap) {
      snap.forEach(function(childSnap) {
        valueOrder.push(childSnap.key);
      });
    });

    orderedRef.on('child_added', function(snap, prevName) {
      addedOrder.push(snap.key);
      addedPrevNames.push(prevName);
    });

    ref.set(initial);

    expect(addedOrder).to.deep.equal(expectedOrder);
    expect(valueOrder).to.deep.equal(expectedOrder);
    expect(addedPrevNames).to.deep.equal(expectedPrevNames);
  });

  it('Snapshots are iterated in order for value', function() {
    var ref = (getRandomNode() as Reference);

    var initial = {
      alex: 60,
      rob: 56,
      vassili: 55.5,
      tony: 52,
      greg: 52
    };

    var expectedOrder = ['greg', 'tony', 'vassili', 'rob', 'alex'];
    var expectedPrevNames = [null, 'greg', 'tony', 'vassili', 'rob'];

    var valueOrder = [];
    var addedOrder = [];
    var addedPrevNames = [];

    var orderedRef = ref.orderByValue();

    orderedRef.on('value', function(snap) {
      snap.forEach(function(childSnap) {
        valueOrder.push(childSnap.key);
      });
    });

    orderedRef.on('child_added', function(snap, prevName) {
      addedOrder.push(snap.key);
      addedPrevNames.push(prevName);
    });

    ref.set(initial);

    expect(addedOrder).to.deep.equal(expectedOrder);
    expect(valueOrder).to.deep.equal(expectedOrder);
    expect(addedPrevNames).to.deep.equal(expectedPrevNames);
  });

  it('Fires child_moved events', function() {
    var ref = (getRandomNode() as Reference);

    var initial = {
      alex: {nuggets: 60},
      rob: {nuggets: 56},
      vassili: {nuggets: 55.5},
      tony: {nuggets: 52},
      greg: {nuggets: 52}
    };

    var orderedRef = ref.orderByChild('nuggets');

    var moved = false;
    orderedRef.on('child_moved', function(snap, prevName) {
      moved = true;
      expect(snap.key).to.equal('greg');
      expect(prevName).to.equal('rob');
      expect(snap.val()).to.deep.equal({nuggets: 57});
    });

    ref.set(initial);
    ref.child('greg/nuggets').set(57);
    expect(moved).to.equal(true);
  });

  it('Callback removal works', async function() {
    var ref = (getRandomNode() as Reference);

    var reads = 0;
    var fooCb;
    var barCb;
    var bazCb;
    const ea = EventAccumulatorFactory.waitsForCount(4);

    fooCb = ref.orderByChild('foo').on('value', function() {
      reads++;
      ea.addEvent();
    });
    barCb = ref.orderByChild('bar').on('value', function() {
      reads++;
      ea.addEvent();
    });
    bazCb = ref.orderByChild('baz').on('value', function() {
      reads++;
      ea.addEvent();
    });
    ref.on('value', function() {
      reads++;
      ea.addEvent();
    });

    ref.set(1);

    await ea.promise;

    ref.off('value', fooCb);
    ref.set(2);
    expect(reads).to.equal(7);

    // Should be a no-op, resulting in 3 more reads
    ref.orderByChild('foo').off('value', bazCb);
    ref.set(3);
    expect(reads).to.equal(10);

    ref.orderByChild('bar').off('value');
    ref.set(4);
    expect(reads).to.equal(12);

    // Now, remove everything
    ref.off();
    ref.set(5);
    expect(reads).to.equal(12);
  });

  it('child_added events are in the correct order', function() {
    var ref = (getRandomNode() as Reference);

    var initial = {
      a: {value: 5},
      c: {value: 3}
    };

    var added = [];
    ref.orderByChild('value').on('child_added', function(snap) {
      added.push(snap.key);
    });
    ref.set(initial);

    expect(added).to.deep.equal(['c', 'a']);

    ref.update({
      b: {value: 4},
      d: {value: 2}
    });

    expect(added).to.deep.equal(['c', 'a', 'd', 'b']);
  });

  it('Can use key index', async function() {
    var ref = (getRandomNode() as Reference);

    var data = {
      a: { '.priority': 10, '.value': 'a' },
      b: { '.priority': 5, '.value': 'b' },
      c: { '.priority': 20, '.value': 'c' },
      d: { '.priority': 7, '.value': 'd' },
      e: { '.priority': 30, '.value': 'e' },
      f: { '.priority': 8, '.value': 'f' }
    };

    await ref.set(data);

    const snap = await ref.orderByKey().startAt('c').once('value');
    
    var keys = [];
    snap.forEach(function(child) {
      keys.push(child.key);
    });
    expect(keys).to.deep.equal(['c', 'd', 'e', 'f']);

    const ea = EventAccumulatorFactory.waitsForCount(5);
    var keys = [];
    
    ref.orderByKey().limitToLast(5).on('child_added', function(child) {
      keys.push(child.key);
      ea.addEvent();
    });

    await ea.promise;

    ref.orderByKey().off();
    expect(keys).to.deep.equal(['b', 'c', 'd', 'e', 'f']);
  });

  it('Queries work on leaf nodes', function(done) {
    var ref = (getRandomNode() as Reference);

    ref.set('leaf-node', function() {
      ref.orderByChild('foo').limitToLast(1).on('value', function(snap) {
        expect(snap.val()).to.be.null;
        done();
      });
    });
  });

  it('Updates for unindexed queries work', function(done) {
    var refs = (getRandomNode(2) as Reference[]);
    var reader = refs[0];
    var writer = refs[1];

    var value = {
      'one': { 'index': 1, 'value': 'one' },
      'two': { 'index': 2, 'value': 'two' },
      'three': { 'index': 3, 'value': 'three' }
    };

    var count = 0;

    writer.set(value, function() {
      reader.orderByChild('index').limitToLast(2).on('value', function(snap) {
        if (count === 0) {
          expect(snap.val()).to.deep.equal({
            'two': { 'index': 2, 'value': 'two' },
            'three': { 'index': 3, 'value': 'three' }
          });
          // update child which should trigger value event
          writer.child('one/index').set(4);
        } else if (count === 1) {
          expect(snap.val()).to.deep.equal({
            'three': { 'index': 3, 'value': 'three' },
            'one': { 'index': 4, 'value': 'one' }
          });
          done();
        }
        count++;
      });
    });
  });

  it('Server respects KeyIndex', function(done) {
    var refs = (getRandomNode(2) as Reference[]);
    var reader = refs[0];
    var writer = refs[1];

    var initial = {
      a: 1,
      b: 2,
      c: 3
    };

    var expected = ['b', 'c'];

    var actual = [];

    var orderedRef = reader.orderByKey().startAt('b').limitToFirst(2);
    writer.set(initial, function() {
      orderedRef.on('value', function(snap) {
        snap.forEach(function(childSnap) {
          actual.push(childSnap.key);
        });
        expect(actual).to.deep.equal(expected);
        done();
      });
    });
  });

  it('startAt/endAt works on value index', function() {
    var ref = (getRandomNode() as Reference);

    var initial = {
      alex: 60,
      rob: 56,
      vassili: 55.5,
      tony: 52,
      greg: 52
    };

    var expectedOrder = ['tony', 'vassili', 'rob'];
    var expectedPrevNames = [null, 'tony', 'vassili'];

    var valueOrder = [];
    var addedOrder = [];
    var addedPrevNames = [];

    var orderedRef = ref.orderByValue().startAt(52, 'tony').endAt(59);

    orderedRef.on('value', function(snap) {
      snap.forEach(function(childSnap) {
        valueOrder.push(childSnap.key);
      });
    });

    orderedRef.on('child_added', function(snap, prevName) {
      addedOrder.push(snap.key);
      addedPrevNames.push(prevName);
    });

    ref.set(initial);

    expect(addedOrder).to.deep.equal(expectedOrder);
    expect(valueOrder).to.deep.equal(expectedOrder);
    expect(addedPrevNames).to.deep.equal(expectedPrevNames);
  });

  it('Removing default listener removes non-default listener that loads all data', function(done) {
    var ref = (getRandomNode() as Reference);

    var initial = { key: 'value' };
    ref.set(initial, function(err) {
      expect(err).to.be.null;
      ref.orderByKey().on('value', function() {});
      ref.on('value', function() {});
      // Should remove both listener and should remove the listen sent to the server
      ref.off();

      // This used to crash because a listener for ref.orderByKey() existed already
      ref.orderByKey().once('value', function(snap) {
        expect(snap.val()).to.deep.equal(initial);
        done();
      });
    });
  });

  it('Can define and use an deep index', function(done) {
    var ref = (getRandomNode() as Reference);

    var initial = {
      alex: {deep: {nuggets: 60}},
      rob: {deep: {nuggets: 56}},
      vassili: {deep: {nuggets: 55.5}},
      tony: {deep: {nuggets: 52}},
      greg: {deep: {nuggets: 52}}
    };

    var expectedOrder = ['greg', 'tony', 'vassili'];
    var expectedPrevNames = [null, 'greg', 'tony'];

    var valueOrder = [];
    var addedOrder = [];
    var addedPrevNames = [];

    var orderedRef = ref.orderByChild('deep/nuggets').limitToFirst(3);

    // come before value event
    orderedRef.on('child_added', function(snap, prevName) {
      addedOrder.push(snap.key);
      addedPrevNames.push(prevName);
    });

    orderedRef.once('value', function(snap) {
      snap.forEach(function(childSnap) {
        valueOrder.push(childSnap.key);
      });
    });

    ref.set(initial, function(err) {
      expect(err).to.be.null;
      expect(addedOrder).to.deep.equal(expectedOrder);
      expect(valueOrder).to.deep.equal(expectedOrder);
      expect(addedPrevNames).to.deep.equal(expectedPrevNames);
      done();
    });
  });
});
