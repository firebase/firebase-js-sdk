import { expect } from "chai";
import firebase from '../../src/app';
import { Reference } from "../../src/database/api/Reference";
import { Query } from "../../src/database/api/Query";
import "../../src/database/core/snap/ChildrenNode";
import { 
  getQueryValue,
  getRandomNode,
  getPath,
  runs,
  waitsFor
} from "./helpers";

const _ = require('lodash');

type TaskList = [Query, any][];

describe.only('Query Tests', function() {

  // Little helper class for testing event callbacks w/ contexts.
  var EventReceiver = function() {
    this.gotValue = false;
    this.gotChildAdded = false;
  };
  EventReceiver.prototype.onValue = function() {
    this.gotValue = true;
  };
  EventReceiver.prototype.onChildAdded = function() {
    this.gotChildAdded = true;
  };

  it('Can create basic queries.', function() {
    var path = <Reference>getRandomNode();

    path.limitToLast(10);
    path.startAt('199').limitToFirst(10);
    path.startAt('199', 'test').limitToFirst(10);
    path.endAt('199').limitToLast(1);
    path.startAt('50', 'test').endAt('100', 'tree');
    path.startAt('4').endAt('10');
    path.startAt().limitToFirst(10);
    path.endAt().limitToLast(10);
    path.orderByKey().startAt('foo');
    path.orderByKey().endAt('foo');
    path.orderByKey().equalTo('foo');
    path.orderByChild("child");
    path.orderByChild("child/deep/path");
    path.orderByValue();
    path.orderByPriority();
  });

  it('Exposes database as read-only property', function() {
    var path = <Reference>getRandomNode();
    var child = path.child('child');

    var db = path.database;
    var dbChild = child.database;

    expect(db).to.equal(dbChild);
    /**
     * TS throws an error here (as is expected)
     * casting to any to allow the code to run
     */
    expect(() => (path as any).database = "can't overwrite").to.throw();
    expect(path.database).to.equal(db);
  });

  it('Invalid queries throw', function() {
    var path = <Reference>getRandomNode();

    expect(function() {path.limitToLast();}).to.throw();
    expect(function() {path.limitToLast('100'); }).to.throw();
    expect(function() {path.limitToLast({ x: 5 }); }).to.throw();
    expect(function() {path.limitToLast(100).limitToLast(100); }).to.throw();
    expect(function() {path.limitToLast(100).limitToFirst(100); }).to.throw();
    expect(function() {path.limitToLast(100).limitToLast(100); }).to.throw();
    expect(function() {path.limitToFirst(100).limitToLast(100); }).to.throw();
    expect(function() {path.limitToFirst(100).limitToFirst(100); }).to.throw();
    expect(function() {path.limitToFirst(100).limitToLast(100); }).to.throw();
    expect(function() {path.limitToLast(100).limitToLast(100); }).to.throw();
    expect(function() {path.limitToLast(100).limitToFirst(100); }).to.throw();
    expect(function() {path.limitToLast(100).limitToLast(100); }).to.throw();
    expect(function() {path.orderByPriority().orderByPriority(); }).to.throw();
    expect(function() {path.orderByPriority().orderByKey(); }).to.throw();
    expect(function() {path.orderByPriority().orderByChild('foo'); }).to.throw();
    expect(function() {path.orderByPriority().startAt(true); }).to.throw();
    expect(function() {path.orderByPriority().endAt(false); }).to.throw();
    expect(function() {path.orderByPriority().equalTo(true); }).to.throw();
    expect(function() {path.orderByKey().orderByPriority(); }).to.throw();
    expect(function() {path.orderByKey().orderByKey(); }).to.throw();
    expect(function() {path.orderByKey().orderByChild('foo'); }).to.throw();
    expect(function() {path.orderByChild('foo').orderByPriority(); }).to.throw();
    expect(function() {path.orderByChild('foo').orderByKey(); }).to.throw();
    expect(function() {path.orderByChild('foo').orderByChild('foo'); }).to.throw();
    expect(function() {path.orderByChild('foo').startAt({a: 1}); }).to.throw();
    expect(function() {path.orderByChild('foo').endAt({a: 1}); }).to.throw();
    expect(function() {path.orderByChild('foo').equalTo({a: 1}); }).to.throw();
    expect(function() {path.startAt('foo').startAt('foo')}).to.throw();
    expect(function() {path.startAt('foo').equalTo('foo')}).to.throw();
    expect(function() {path.endAt('foo').endAt('foo')}).to.throw();
    expect(function() {path.endAt('foo').equalTo('foo')}).to.throw();
    expect(function() {path.equalTo('foo').startAt('foo')}).to.throw();
    expect(function() {path.equalTo('foo').endAt('foo')}).to.throw();
    expect(function() {path.equalTo('foo').equalTo('foo')}).to.throw();
    expect(function() {path.orderByKey().startAt('foo', 'foo')}).to.throw();
    expect(function() {path.orderByKey().endAt('foo', 'foo')}).to.throw();
    expect(function() {path.orderByKey().equalTo('foo', 'foo')}).to.throw();
    expect(function() {path.orderByKey().startAt(1)}).to.throw();
    expect(function() {path.orderByKey().startAt(true)}).to.throw();
    expect(function() {path.orderByKey().startAt(null)}).to.throw();
    expect(function() {path.orderByKey().endAt(1)}).to.throw();
    expect(function() {path.orderByKey().endAt(true)}).to.throw();
    expect(function() {path.orderByKey().endAt(null)}).to.throw();
    expect(function() {path.orderByKey().equalTo(1)}).to.throw();
    expect(function() {path.orderByKey().equalTo(true)}).to.throw();
    expect(function() {path.orderByKey().equalTo(null)}).to.throw();
    expect(function() {path.startAt('foo', 'foo').orderByKey()}).to.throw();
    expect(function() {path.endAt('foo', 'foo').orderByKey()}).to.throw();
    expect(function() {path.equalTo('foo', 'foo').orderByKey()}).to.throw();
    expect(function() {path.startAt(1).orderByKey()}).to.throw();
    expect(function() {path.startAt(true).orderByKey()}).to.throw();
    expect(function() {path.endAt(1).orderByKey()}).to.throw();
    expect(function() {path.endAt(true).orderByKey()}).to.throw();
  });

  it('can produce a valid ref', function() {
    var path = <Reference>getRandomNode();

    var query = path.limitToLast(1);
    var ref = query.ref;

    expect(ref.toString()).to.equal(path.toString());
  });

  it('Passing invalidKeys to startAt / endAt throws.', function() {
    var f = <Reference>getRandomNode();
    var badKeys = ['.test', 'test.', 'fo$o', '[what', 'ever]', 'ha#sh', '/thing', 'th/ing', 'thing/'];
    // Changed from basic array iteration to avoid closure issues accessing mutable state
    _.each(badKeys, function(badKey) {
      expect(function() { f.startAt(null, badKey); }).to.throw();
      expect(function() { f.endAt(null, badKey); }).to.throw();
    });
  });

  it('Passing invalid paths to orderBy throws', function() {
    var ref = <Reference>getRandomNode();
    expect(function() { ref.orderByChild('$child/foo'); }).to.throw();
    expect(function() { ref.orderByChild('$key'); }).to.throw();
    expect(function() { ref.orderByChild('$priority'); }).to.throw();
  });

  it('Query.queryIdentifier works.', function() {
    var path = <Reference>getRandomNode();
    var queryId = function(query) {
      return query.queryIdentifier(query);
    };

    expect(queryId(path)).to.equal('default');

    expect(queryId(path.startAt('pri', 'name')))
      .to.equal('{"sn":"name","sp":"pri"}');
    expect(queryId(path.startAt('spri').endAt('epri')))
      .to.equal('{"ep":"epri","sp":"spri"}');
    expect(queryId(path.startAt('spri', 'sname').endAt('epri', 'ename')))
      .to.equal('{"en":"ename","ep":"epri","sn":"sname","sp":"spri"}');
    expect(queryId(path.startAt('pri').limitToFirst(100)))
      .to.equal('{"l":100,"sp":"pri","vf":"l"}');
    expect(queryId(path.startAt('bar').orderByChild('foo')))
      .to.equal('{"i":"foo","sp":"bar"}');
  });

  it('Passing invalid queries to isEqual throws', function() {
    var ref = <Reference>getRandomNode();
    expect(function() { ref.isEqual(); }).to.throw();
    expect(function() { ref.isEqual(''); }).to.throw();
    expect(function() { ref.isEqual('foo'); }).to.throw();
    expect(function() { ref.isEqual({}); }).to.throw();
    expect(function() { ref.isEqual([]); }).to.throw();
    expect(function() { ref.isEqual(0); }).to.throw();
    expect(function() { ref.isEqual(1); }).to.throw();
    expect(function() { ref.isEqual(NaN); }).to.throw();
    expect(function() { ref.isEqual(null); }).to.throw();
    expect(function() { ref.isEqual({a:1}); }).to.throw();
    expect(function() { (ref as any).isEqual(ref, 'extra'); }).to.throw();
  });

  it('Query.isEqual works.', function() {
    var path = <Reference>getRandomNode();
    var rootRef = path.root;
    var childRef = rootRef.child('child');

    // Equivalent refs
    expect(path.isEqual(path), 'Query.isEqual - 1').to.be.true;
    expect(rootRef.isEqual(rootRef), 'Query.isEqual - 2').to.be.true;
    expect(rootRef.isEqual(childRef.parent), 'Query.isEqual - 3').to.be.true;
    expect(rootRef.child('child').isEqual(childRef), 'Query.isEqual - 4').to.be.true;

    // Refs with different repos
    // var rootRefDifferentRepo = TESTS.getFreshRepo(TEST_ALT_NAMESPACE);
    // rootRefDifferentRepo.database.goOffline();

    // expect(rootRef.isEqual(rootRefDifferentRepo), 'Query.isEqual - 5').to.be.false;
    // expect(childRef.isEqual(rootRefDifferentRepo.child('child')), 'Query.isEqual - 6').to.be.false;

    // Refs with different paths
    expect(rootRef.isEqual(childRef), 'Query.isEqual - 7').to.be.false;
    expect(childRef.isEqual(rootRef.child('otherChild')), 'Query.isEqual - 8').to.be.false;

    var childQueryLast25 = childRef.limitToLast(25);
    var childQueryOrderedByKey = childRef.orderByKey();
    var childQueryOrderedByPriority = childRef.orderByPriority();
    var childQueryOrderedByTimestamp = childRef.orderByChild("timestamp");
    var childQueryStartAt1 = childQueryOrderedByTimestamp.startAt(1);
    var childQueryStartAt2 = childQueryOrderedByTimestamp.startAt(2);
    var childQueryEndAt2 = childQueryOrderedByTimestamp.endAt(2);
    var childQueryStartAt1EndAt2 = childQueryOrderedByTimestamp.startAt(1).endAt(2);

    // Equivalent queries
    expect(childRef.isEqual(childQueryLast25.ref), 'Query.isEqual - 9').to.be.true;
    expect(childQueryLast25.isEqual(childRef.limitToLast(25)), 'Query.isEqual - 10').to.be.true;
    expect(childQueryStartAt1EndAt2.isEqual(childQueryOrderedByTimestamp.startAt(1).endAt(2)), 'Query.isEqual - 11').to.be.true;

    // Non-equivalent queries
    expect(childQueryLast25.isEqual(childRef), 'Query.isEqual - 12').to.be.false;
    expect(childQueryLast25.isEqual(childQueryOrderedByKey), 'Query.isEqual - 13').to.be.false;
    expect(childQueryLast25.isEqual(childQueryOrderedByPriority), 'Query.isEqual - 14').to.be.false;
    expect(childQueryLast25.isEqual(childQueryOrderedByTimestamp), 'Query.isEqual - 15').to.be.false;
    expect(childQueryOrderedByKey.isEqual(childQueryOrderedByPriority), 'Query.isEqual - 16').to.be.false;
    expect(childQueryOrderedByKey.isEqual(childQueryOrderedByTimestamp), 'Query.isEqual - 17').to.be.false;
    expect(childQueryStartAt1.isEqual(childQueryStartAt2), 'Query.isEqual - 18').to.be.false;
    expect(childQueryStartAt1.isEqual(childQueryStartAt1EndAt2), 'Query.isEqual - 19').to.be.false;
    expect(childQueryEndAt2.isEqual(childQueryStartAt2), 'Query.isEqual - 20').to.be.false;
    expect(childQueryEndAt2.isEqual(childQueryStartAt1EndAt2), 'Query.isEqual - 21').to.be.false;
  });

  it('Query.off can be called on the default query.', function() {
    var path = <Reference>getRandomNode();
    var eventFired = false;

    var callback = function() { eventFired = true; };
    path.limitToLast(5).on('value', callback);

    path.set({a: 5, b: 6});
    expect(eventFired).to.be.true;
    eventFired = false;

    path.off('value', callback);
    path.set({a: 6, b: 5});
    expect(eventFired).to.be.false;
  });

  it('Query.off can be called on the specific query.', function() {
    var path = <Reference>getRandomNode();
    var eventFired = false;

    var callback = function() { eventFired = true; };
    path.limitToLast(5).on('value', callback);

    path.set({a: 5, b: 6});
    expect(eventFired).to.be.true;
    eventFired = false;

    path.limitToLast(5).off('value', callback);
    path.set({a: 6, b: 5});
    expect(eventFired).to.be.false;
  });

  it('Query.off can be called without a callback specified.', function() {
    var path = <Reference>getRandomNode();
    var eventFired = false;

    var callback1 = function() { eventFired = true; };
    var callback2 = function() { eventFired = true; };
    path.on('value', callback1);
    path.limitToLast(5).on('value', callback2);

    path.set({a: 5, b: 6});
    expect(eventFired).to.be.true;
    eventFired = false;

    path.off('value');
    path.set({a: 6, b: 5});
    expect(eventFired).to.be.false;
  });

  it('Query.off can be called without an event type or callback specified.', function() {
    var path = <Reference>getRandomNode();
    var eventFired = false;

    var callback1 = function() { eventFired = true; };
    var callback2 = function() { eventFired = true; };
    path.on('value', callback1);
    path.limitToLast(5).on('value', callback2);

    path.set({a: 5, b: 6});
    expect(eventFired).to.be.true;
    eventFired = false;

    path.off();
    path.set({a: 6, b: 5});
    expect(eventFired).to.be.false;
  });

  it('Query.off respects provided context (for value events).', function() {
    var ref = <Reference>getRandomNode();

    var a = new EventReceiver(),
        b = new EventReceiver();

    ref.on('value', a.onValue, a);
    ref.on('value', b.onValue, b);

    ref.set('hello!');
    expect(a.gotValue).to.be.true;
    expect(b.gotValue).to.be.true;
    a.gotValue = b.gotValue = false;

    // unsubscribe b
    ref.off('value', b.onValue, b);

    // Only a should get this event.
    ref.set(42);
    expect(a.gotValue).to.be.true;
    expect(b.gotValue).to.be.false;

    ref.off('value', a.onValue, a);
  });

  it('Query.off respects provided context (for child events).', function() {
    var ref = <Reference>getRandomNode();

    var a = new EventReceiver(),
        b = new EventReceiver();

    ref.on('child_added', a.onChildAdded, a);
    ref.on('child_added', b.onChildAdded, b);

    ref.push('hello!');
    expect(a.gotChildAdded).to.be.true;
    expect(b.gotChildAdded).to.be.true;
    a.gotChildAdded = b.gotChildAdded = false;

    // unsubscribe b.
    ref.off('child_added', b.onChildAdded, b);

    // Only a should get this event.
    ref.push(42);
    expect(a.gotChildAdded).to.be.true;
    expect(b.gotChildAdded).to.be.false;

    ref.off('child_added', a.onChildAdded, a);
  });

  it('Query.off with no callback/context removes all callbacks, even with contexts (for value events).', function() {
    var ref = <Reference>getRandomNode();

    var a = new EventReceiver(),
        b = new EventReceiver();

    ref.on('value', a.onValue, a);
    ref.on('value', b.onValue, b);

    ref.set('hello!');
    expect(a.gotValue).to.be.true;
    expect(b.gotValue).to.be.true;
    a.gotValue = b.gotValue = false;

    // unsubscribe value events.
    ref.off('value');

    // Should get no events.
    ref.set(42);
    expect(a.gotValue).to.be.false;
    expect(b.gotValue).to.be.false;
  });

  it('Query.off with no callback/context removes all callbacks, even with contexts (for child events).', function() {
    var ref = <Reference>getRandomNode();

    var a = new EventReceiver(),
        b = new EventReceiver();

    ref.on('child_added', a.onChildAdded, a);
    ref.on('child_added', b.onChildAdded, b);

    ref.push('hello!');
    expect(a.gotChildAdded).to.be.true;
    expect(b.gotChildAdded).to.be.true;
    a.gotChildAdded = b.gotChildAdded = false;

    // unsubscribe child_added.
    ref.off('child_added');

    // Should get no events.
    ref.push(42);
    expect(a.gotChildAdded).to.be.false;
    expect(b.gotChildAdded).to.be.false;
  });

  it('Query.off with no event type / callback removes all callbacks (even those with contexts).', function() {
    var ref = <Reference>getRandomNode();

    var a = new EventReceiver(),
        b = new EventReceiver();

    ref.on('value', a.onValue, a);
    ref.on('value', b.onValue, b);
    ref.on('child_added', a.onChildAdded, a);
    ref.on('child_added', b.onChildAdded, b);

    ref.set(null);
    ref.push('hello!');
    expect(a.gotChildAdded).to.be.true;
    expect(a.gotValue).to.be.true;
    expect(b.gotChildAdded).to.be.true;
    expect(b.gotValue).to.be.true;
    a.gotValue = b.gotValue = a.gotChildAdded = b.gotChildAdded = false;

    // unsubscribe all events.
    ref.off();

    // We should get no events.
    ref.push(42);
    expect(a.gotChildAdded).to.be.false;
    expect(b.gotChildAdded).to.be.false;
    expect(a.gotValue).to.be.false;
    expect(b.gotValue).to.be.false;
  });

  it('Set a limit of 5, add a bunch of nodes, ensure only last 5 items are kept.', function() {
    var node = <Reference>getRandomNode();
    var snap = null;
    node.limitToLast(5).on('value', function(s) { snap = s; });

    node.set({});
    for (var i = 0; i < 10; i++) {
      node.push().set(i);
    }

    var expected = 5;
    snap.forEach(function(child) {
      expect(child.val()).to.equal(expected);
      expected++;
    });

    expect(expected).to.equal(10);
  });

  it('Set a limit of 5, add a bunch of nodes, ensure only last 5 items are sent from server.', async function() {
    var node = <Reference>getRandomNode();
    await node.set({});

    const pushPromises = [];

    for (var i = 0; i < 10; i++) {
      pushPromises.push(node.push().set(i));
    }

    await Promise.all(pushPromises);
    
    const snap = await node.limitToLast(5).once('value');
    let expected = 5;
    
    snap.forEach(function(child) {
      expect(child.val()).to.equal(expected);
      expected++;
    });

    expect(expected).to.equal(10);
  });

  it('Set various limits, ensure resulting data is correct.', async function() {
    var node = <Reference>getRandomNode();

    await node.set({a: 1, b: 2, c: 3});    

    const tasks: TaskList = [
      [node.limitToLast(1), {c: 3}],,
      [node.endAt().limitToLast(1), {c: 3}],
      [node.limitToLast(2), {b: 2, c: 3}],
      [node.limitToLast(3), {a: 1, b: 2, c: 3}],
      [node.limitToLast(4), {a: 1, b: 2, c: 3}]
    ];

    return Promise.all(tasks.map(async task => {
      const [query, val] = task;
      expect(await getQueryValue(query)).to.deep.equal(val);
    }));
  });

  it('Set various limits with a startAt name, ensure resulting data is correct.', async function() {
    var node = <Reference>getRandomNode();

    await node.set({a: 1, b: 2, c: 3});

    const tasks: TaskList = [
      [node.startAt().limitToFirst(1), {a: 1}],
      [node.startAt(null, 'c').limitToFirst(1), {c: 3}],
      [node.startAt(null, 'b').limitToFirst(1), {b: 2}],
      [node.startAt(null, 'b').limitToFirst(2), {b: 2, c: 3}],
      [node.startAt(null, 'b').limitToFirst(3), {b: 2, c: 3}],
      [node.startAt(null, 'b').limitToLast(1), {c: 3}],
      [node.startAt(null, 'b').limitToLast(1), {c: 3}],
      [node.startAt(null, 'b').limitToLast(2), {b: 2, c: 3}],
      [node.startAt(null, 'b').limitToLast(3), {b: 2, c: 3}],
      [node.limitToFirst(1).startAt(null, 'c'), {c: 3}],
      [node.limitToFirst(1).startAt(null, 'b'), {b: 2}],
      [node.limitToFirst(2).startAt(null, 'b'), {b: 2, c: 3}],
      [node.limitToFirst(3).startAt(null, 'b'), {b: 2, c: 3}],
      [node.limitToLast(1).startAt(null, 'b'), {c: 3}],
      [node.limitToLast(1).startAt(null, 'b'), {c: 3}],
      [node.limitToLast(2).startAt(null, 'b'), {b: 2, c: 3}],
      [node.limitToLast(3).startAt(null, 'b'), {b: 2, c: 3}],
    ];

    return Promise.all(tasks.map(async task => {
      const [query, val] = task;
      expect(await getQueryValue(query)).to.deep.equal(val);
    }));
  });

  it('Set various limits with a endAt name, ensure resulting data is correct.', async function() {
    var node = <Reference>getRandomNode();

    await node.set({a: 1, b: 2, c: 3});

    const tasks: TaskList = [
      [node.endAt().limitToFirst(1), {a: 1}],
      [node.endAt(null, 'c').limitToFirst(1), {a: 1}],
      [node.endAt(null, 'b').limitToFirst(1), {a: 1}],
      [node.endAt(null, 'b').limitToFirst(2), {a: 1, b: 2}],
      [node.endAt(null, 'b').limitToFirst(3), {a: 1, b: 2}],
      [node.endAt(null, 'c').limitToLast(1), {c: 3}],
      [node.endAt(null, 'b').limitToLast(1), {b: 2}],
      [node.endAt(null, 'b').limitToLast(2), {a: 1, b: 2}],
      [node.endAt(null, 'b').limitToLast(3), {a: 1, b: 2}],
      [node.limitToFirst(1).endAt(null, 'c'), {a: 1}],
      [node.limitToFirst(1).endAt(null, 'b'), {a: 1}],
      [node.limitToFirst(2).endAt(null, 'b'), {a: 1, b: 2}],
      [node.limitToFirst(3).endAt(null, 'b'), {a: 1, b: 2}],
      [node.limitToLast(1).endAt(null, 'c'), {c: 3}],
      [node.limitToLast(1).endAt(null, 'b'), {b: 2}],
      [node.limitToLast(2).endAt(null, 'b'), {a: 1, b: 2}],
      [node.limitToLast(3).endAt(null, 'b'), {a: 1, b: 2}],
    ];

    return Promise.all(tasks.map(async task => {
      const [query, val] = task;
      expect(await getQueryValue(query)).to.deep.equal(val);
    }));
  });

  it('Set various limits with a startAt name, ensure resulting data is correct from the server.', async function() {
    var node = <Reference>getRandomNode();

    await node.set({a: 1, b: 2, c: 3});

    const tasks: TaskList = [
      [node.startAt().limitToFirst(1), {a: 1}],
      [node.startAt(null, 'c').limitToFirst(1), {c: 3}],
      [node.startAt(null, 'b').limitToFirst(1), {b: 2}],
      // NOTE: technically there is a race condition here. The limitToFirst(1) query will return a single value, which will be
      // raised for the limitToFirst(2) callback as well, if it exists already. However, once the server gets the limitToFirst(2)
      // query, it will send more data and the correct state will be returned.
      [node.startAt(null, 'b').limitToFirst(2), {b: 2, c: 3}],
      [node.startAt(null, 'b').limitToFirst(3), {b: 2, c: 3}],
    ];

    return Promise.all(tasks.map(async task => {
      const [query, val] = task;
      expect(await getQueryValue(query)).to.deep.equal(val);
    }));
  });

  it('Set limit, ensure child_removed and child_added events are fired when limit is hit.', function() {
    var node = <Reference>getRandomNode();
    var added = '', removed = '';
    node.limitToLast(2).on('child_added', function(snap) { added += snap.key + ' '});
    node.limitToLast(2).on('child_removed', function(snap) { removed += snap.key + ' '});
    node.set({a: 1, b: 2, c: 3});

    expect(added).to.equal('b c ');
    expect(removed).to.equal('');

    added = '';
    node.child('d').set(4);
    expect(added).to.equal('d ');
    expect(removed).to.equal('b ');
  });

  // it('Set limit, ensure child_removed and child_added events are fired when limit is hit, using server data', async function() {
  //   var node = getRandomNode();

  //   await node.set({a: 1, b: 2, c: 3});

  //   var added = '', removed = '';
  //   runs(function() {
  //     count = 0;
  //     node.limitToLast(2).on('child_added', function(snap) { added += snap.key + ' '; count++; });
  //     node.limitToLast(2).on('child_removed', function(snap) { removed += snap.key + ' '});
  //   });

  //   waitsFor(function() { return count === 2; }, 'Two events', TEST_TIMEOUT);

  //   runs(function() {
  //     expect(added).to.equal('b c ');
  //     expect(removed).to.equal('');

  //     added = '';
  //     done = false;
  //     node.child('d').set(4, function() { done = true; });
  //   });

  //   waitsFor(function() { return done; }, 'Second set', TEST_TIMEOUT);

  //   runs(function() {
  //     expect(added).to.equal('d ');
  //     expect(removed).to.equal('b ');
  //   });
  // });

  it('Set start and limit, ensure child_removed and child_added events are fired when limit is hit.', function() {
    var node = <Reference>getRandomNode();

    var added = '', removed = '';
    node.startAt(null, 'a').limitToFirst(2).on('child_added', function(snap) { added += snap.key + ' '});
    node.startAt(null, 'a').limitToFirst(2).on('child_removed', function(snap) { removed += snap.key + ' '});
    node.set({a: 1, b: 2, c: 3});
    expect(added).to.equal('a b ');
    expect(removed).to.equal('');

    added = '';
    node.child('aa').set(4);
    expect(added).to.equal('aa ');
    expect(removed).to.equal('b ');
  });

  // it('Set start and limit, ensure child_removed and child_added events are fired when limit is hit, using server data', async function() {
  //   var node = getRandomNode(),
  //       done, count;

  //   var added = '', removed = '';
  //   runs(function() {
  //     done = false;
  //     node.set({a: 1, b: 2, c: 3}, function() { done = true; });
  //   });

  //   waitsFor(function() { return done; }, 'Finished setting', TEST_TIMEOUT);

  //   runs(function() {
  //     count = 0;
  //     node.startAt(null, 'a').limitToFirst(2).on('child_added', function(snap) { added += snap.key + ' '; count++; });
  //     node.startAt(null, 'a').limitToFirst(2).on('child_removed', function(snap) { removed += snap.key + ' '});
  //   });

  //   waitsFor(function() { return count === 2; }, 'Two events', TEST_TIMEOUT);

  //   runs(function() {
  //     expect(added).to.equal('a b ');
  //     expect(removed).to.equal('');

  //     added = '';
  //     done = false;
  //     node.child('aa').set(4, function() { done = true; });
  //   });

  //   waitsFor(function() { return done; }, 'Second set', TEST_TIMEOUT);

  //   runs(function() {
  //     expect(added).to.equal('aa ');
  //     expect(removed).to.equal('b ');
  //   });
  // });

  it("Set start and limit, ensure child_added events are fired when limit isn't hit yet.", function() {
    var node = <Reference>getRandomNode();

    var added = '', removed = '';
    node.startAt(null, 'a').limitToFirst(2).on('child_added', function(snap) { added += snap.key + ' '});
    node.startAt(null, 'a').limitToFirst(2).on('child_removed', function(snap) { removed += snap.key + ' '});
    node.set({c: 3});
    expect(added).to.equal('c ');
    expect(removed).to.equal('');

    added = '';
    node.child('b').set(4);
    expect(added).to.equal('b ');
    expect(removed).to.equal('');
  });

  // it("Set start and limit, ensure child_added events are fired when limit isn't hit yet, using server data", async function() {
  //   var node = getRandomNode(),
  //       done, added, removed;

  //   runs(function() {
  //     done = false;
  //     node.set({c: 3}, function() { done = true; });
  //   });
  //   waitsFor(function() { return done; }, 'Finished setting', TEST_TIMEOUT);

  //   runs(function() {
  //     added = '';
  //     removed = '';
  //     node.startAt(null, 'a').limitToFirst(2).on('child_added', function(snap) { added += snap.key + ' '});
  //     node.startAt(null, 'a').limitToFirst(2).on('child_removed', function(snap) { removed += snap.key + ' '});
  //   });
  //   waitsFor(function() { return added !== ''; }, 'First add', TEST_TIMEOUT);

  //   runs(function() {
  //     expect(added).to.equal('c ');
  //     expect(removed).to.equal('');

  //     added = '';
  //     done = false;
  //     node.child('b').set(4, function() { done = true; });
  //   });
  //   waitsFor(function() { return done; }, 'Finished second set', TEST_TIMEOUT);

  //   runs(function() {
  //     expect(added).to.equal('b ');
  //     expect(removed).to.equal('');
  //   });
  // });

  // it('Set a limit, ensure child_removed and child_added events are fired when limit is satisfied and you remove an item.', async function() {
  //   var node = <Reference>getRandomNode();

  //   var added = '', removed = '';
  //   node.limitToLast(2).on('child_added', function(snap) { added += snap.key + ' '});
  //   node.limitToLast(2).on('child_removed', function(snap) { removed += snap.key + ' '});
  //   node.set({a: 1, b: 2, c: 3});
  //   expect(added).to.equal('b c ');
  //   expect(removed).to.equal('');

  //   added = '';
  //   node.child('b').remove();
  //   expect(removed).to.equal('b ');

  //   waitsFor(function() { return added === 'a '; }, 'a to be added', TEST_TIMEOUT);
  // });

  // it('Set a limit, ensure child_removed and child_added events are fired when limit is satisfied and you remove an item. Using server data', async function() {
  //   var node = getRandomNode(),
  //       done, count;

  //   var added = '', removed = '';
  //   runs(function() {
  //     done = false;
  //     node.set({a: 1, b: 2, c: 3}, function() { done = true; });
  //   });

  //   waitsFor(function() { return done; }, 'Finished setting', TEST_TIMEOUT);

  //   runs(function() {
  //     count = 0;
  //     node.limitToLast(2).on('child_added', function(snap) { added += snap.key + ' '; count++; });
  //     node.limitToLast(2).on('child_removed', function(snap) { removed += snap.key + ' '});
  //   });

  //   waitsFor(function() { return count === 2; }, 'First two events', TEST_TIMEOUT);

  //   runs(function() {
  //     expect(added).to.equal('b c ');
  //     expect(removed).to.equal('');

  //     added = '';
  //     done = false;
  //     node.child('b').remove(function() { done = true; });
  //   });

  //   waitsFor(function() { return done; }, 'Finished remove', TEST_TIMEOUT);

  //   runs(function() {
  //     expect(removed).to.equal('b ');
  //   });

  //   waitsFor(function() { return added === 'a '; }, 'a to be added', TEST_TIMEOUT);
  // });

  it('Set a limit, ensure child_removed events are fired when limit is satisfied, you remove an item, and there are no more.', function() {
    var node = <Reference>getRandomNode();

    var added = '', removed = '';
    node.limitToLast(2).on('child_added', function(snap) { added += snap.key + ' '});
    node.limitToLast(2).on('child_removed', function(snap) { removed += snap.key + ' '});
    node.set({b: 2, c: 3});
    expect(added).to.equal('b c ');
    expect(removed).to.equal('');

    added = '';
    node.child('b').remove();
    expect(added).to.equal('');
    expect(removed).to.equal('b ');
    node.child('c').remove();
    expect(removed).to.equal('b c ');
  });

  // it('Set a limit, ensure child_removed events are fired when limit is satisfied, you remove an item, and there are no more. Using server data', async function() {
  //   var node = getRandomNode(),
  //       done, added, removed, count;

  //   runs(function() {
  //     added = '';
  //     removed = '';
  //     done = false;
  //     node.set({b: 2, c: 3}, function() { done = true; });
  //   });
  //   waitsFor(function() { return done; }, 'Finished setting', TEST_TIMEOUT);

  //   runs(function() {
  //     count = 0;
  //     node.limitToLast(2).on('child_added', function(snap) { added += snap.key + ' '; count++; });
  //     node.limitToLast(2).on('child_removed', function(snap) { removed += snap.key + ' '});
  //   });
  //   waitsFor(function() { return count === 2; }, 'First two events', TEST_TIMEOUT);

  //   runs(function() {
  //     expect(added).to.equal('b c ');
  //     expect(removed).to.equal('');

  //     added = '';
  //     done = false;
  //     node.child('b').remove(function() { done = true; });
  //   });
  //   waitsFor(function() { return done; }, 'Finished remove', TEST_TIMEOUT);

  //   runs(function() {
  //     expect(added).to.equal('');
  //     expect(removed).to.equal('b ');
  //   });
  // });

  it('Ensure startAt / endAt with priority works.', async function() {
    var node = <Reference>getRandomNode();

    const tasks: TaskList = [
      [node.startAt('w').endAt('y'), {b: 2, c: 3, d: 4}],
      [node.startAt('w').endAt('w'), {d: 4 }],
      [node.startAt('a').endAt('c'), null],
    ]

    await node.set({
      a: {'.value': 1, '.priority': 'z'},
      b: {'.value': 2, '.priority': 'y'},
      c: {'.value': 3, '.priority': 'x'},
      d: {'.value': 4, '.priority': 'w'}
    });

    return Promise.all(tasks.map(async task => {
      const [query, val] = task;
      expect(await getQueryValue(query)).to.deep.equal(val);
    }));
  });

  it('Ensure startAt / endAt with priority work with server data.', async function() {
    var node = <Reference>getRandomNode();
    
    await node.set({
      a: {'.value': 1, '.priority': 'z'},
      b: {'.value': 2, '.priority': 'y'},
      c: {'.value': 3, '.priority': 'x'},
      d: {'.value': 4, '.priority': 'w'}
    });

    const tasks: TaskList = [
      [node.startAt('w').endAt('y'), {b: 2, c: 3, d: 4}],
      [node.startAt('w').endAt('w'), {d: 4 }],
      [node.startAt('a').endAt('c'), null],
    ];

    return Promise.all(tasks.map(async task => {
      const [query, val] = task;
      expect(await getQueryValue(query)).to.deep.equal(val);
    }));
  });

  it('Ensure startAt / endAt with priority and name works.', async function() {
    var node = <Reference>getRandomNode();

    await node.set({
      a: {'.value': 1, '.priority': 1},
      b: {'.value': 2, '.priority': 1},
      c: {'.value': 3, '.priority': 2},
      d: {'.value': 4, '.priority': 2}
    });

    const tasks: TaskList = [
      [node.startAt(1, 'a').endAt(2, 'd'), {a: 1, b: 2, c: 3, d: 4}],
      [node.startAt(1, 'b').endAt(2, 'c'), {b: 2, c: 3}],
      [node.startAt(1, 'c').endAt(2), {c: 3, d: 4}],
    ];

    return Promise.all(tasks.map(async task => {
      const [query, val] = task;
      expect(await getQueryValue(query)).to.deep.equal(val);
    }));
  });

  it('Ensure startAt / endAt with priority and name work with server data', async function() {
    var node = <Reference>getRandomNode();

    await node.set({
      a: {'.value': 1, '.priority': 1},
      b: {'.value': 2, '.priority': 1},
      c: {'.value': 3, '.priority': 2},
      d: {'.value': 4, '.priority': 2}
    });
    const tasks: TaskList = [
      [node.startAt(1, 'a').endAt(2, 'd'), {a: 1, b: 2, c: 3, d: 4}],
      [node.startAt(1, 'b').endAt(2, 'c'), {b: 2, c: 3}],
      [node.startAt(1, 'c').endAt(2), {c: 3, d: 4}],
    ];
    return Promise.all(tasks.map(async task => {
      const [query, val] = task;
      expect(await getQueryValue(query)).to.deep.equal(val);
    }));
  });

  it('Ensure startAt / endAt with priority and name works (2).', function() {
    var node = <Reference>getRandomNode();

    const tasks: TaskList = [
      [node.startAt(1, 'c').endAt(2, 'b'), {a: 1, b: 2, c: 3, d: 4}],
      [node.startAt(1, 'd').endAt(2, 'a'), {d: 4, a: 1}],
      [node.startAt(1, 'e').endAt(2), {a: 1, b: 2}],
    ]

    node.set({
      c: {'.value': 3, '.priority': 1},
      d: {'.value': 4, '.priority': 1},
      a: {'.value': 1, '.priority': 2},
      b: {'.value': 2, '.priority': 2}
    });

    return Promise.all(tasks.map(async task => {
      const [query, val] = task;
      expect(await getQueryValue(query)).to.deep.equal(val);
    }));
  });

  it('Ensure startAt / endAt with priority and name works (2). With server data', async function() {
    var node = <Reference>getRandomNode();
    
    await node.set({
      c: {'.value': 3, '.priority': 1},
      d: {'.value': 4, '.priority': 1},
      a: {'.value': 1, '.priority': 2},
      b: {'.value': 2, '.priority': 2}
    });

    const tasks: TaskList = [
      [node.startAt(1, 'c').endAt(2, 'b'), {a: 1, b: 2, c: 3, d: 4}],
      [node.startAt(1, 'd').endAt(2, 'a'), {d: 4, a: 1}],
      [node.startAt(1, 'e').endAt(2), {a: 1, b: 2}],
    ];
    
    return Promise.all(tasks.map(async task => {
      const [query, val] = task;
      expect(await getQueryValue(query)).to.deep.equal(val);
    }));
  });

  it('Set a limit, add some nodes, ensure prevName works correctly.', function() {
    var node = <Reference>getRandomNode();

    var added = '';
    node.limitToLast(2).on('child_added', function(snap, prevName) {
      added += snap.key + ' ' + prevName + ', ';
    });

    node.child('a').set(1);
    expect(added).to.equal('a null, ');

    added = '';
    node.child('c').set(3);
    expect(added).to.equal('c a, ');

    added = '';
    node.child('b').set(2);
    expect(added).to.equal('b null, ');

    added = '';
    node.child('d').set(4);
    expect(added).to.equal('d c, ');
  });

  // it('Set a limit, add some nodes, ensure prevName works correctly. With server data', function() {
  //   var node = getRandomNode(),
  //       added, done;

  //   runs(function() {
  //     added = '';
  //     done = false;
  //     node.child('a').set(1, function() { done = true; });
  //   });
  //   waitsFor(function() { return done; }, 'Initial set', TEST_TIMEOUT);

  //   runs(function() {
  //     node.limitToLast(2).on('child_added', function(snap, prevName) {
  //       added += snap.key + ' ' + prevName + ', ';
  //     });
  //   });
  //   waitsFor(function() { return added !== ''; }, 'First child', TEST_TIMEOUT);

  //   runs(function() {
  //     expect(added).to.equal('a null, ');

  //     added = '';
  //     done = false;
  //     node.child('c').set(3, function() { done = true; });
  //   });
  //   waitsFor(function() { return done; }, 'second set', TEST_TIMEOUT);

  //   runs(function() {
  //     expect(added).to.equal('c a, ');

  //     added = '';
  //     done = false;
  //     node.child('b').set(2, function() { done = true; });
  //   });
  //   waitsFor(function() { return done; }, 'third set', TEST_TIMEOUT);

  //   runs(function() {
  //     expect(added).to.equal('b null, ');

  //     added = '';
  //     done = false;
  //     node.child('d').set(4, function() { done = true; });
  //   });
  //   waitsFor(function() { return done; }, 'third set', TEST_TIMEOUT);

  //   runs(function() {
  //     expect(added).to.equal('d c, ');
  //   });
  // });

  it('Set a limit, move some nodes, ensure prevName works correctly.', function() {
    var node = <Reference>getRandomNode();
    
    var moved = '';
    node.limitToLast(2).on('child_moved', function(snap, prevName) {
      moved += snap.key + ' ' + prevName + ', ';
    });

    node.child('a').setWithPriority('a', 10);
    node.child('b').setWithPriority('b', 20);
    node.child('c').setWithPriority('c', 30);
    node.child('d').setWithPriority('d', 40);

    node.child('c').setPriority(50);
    expect(moved).to.equal('c d, ');

    moved = '';
    node.child('c').setPriority(35);
    expect(moved).to.equal('c null, ');

    moved = '';
    node.child('b').setPriority(33);
    expect(moved).to.equal('');
  });

  // it('Set a limit, move some nodes, ensure prevName works correctly, with server data', function() {
  //   var node = <Reference>getRandomNode();
  //   var moved = '', done;

  //   runs(function() {
  //     done = false;
  //     node.child('a').setWithPriority('a', 10);
  //     node.child('b').setWithPriority('b', 20);
  //     node.child('c').setWithPriority('c', 30);
  //     node.child('d').setWithPriority('d', 40, function() { done = true; });
  //   });
  //   waitsFor(function() { return done;}, 'Initial setup', TEST_TIMEOUT);

  //   runs(function() {
  //     done = false;
  //     node.limitToLast(2).on('child_moved', function(snap, prevName) {
  //       moved += snap.key + ' ' + prevName + ', ';
  //     });
  //     // Need to load the data before the set so we'll see the move
  //     node.limitToLast(2).once('value', function() { done = true; });
  //   });
  //   waitsFor(function() { return done;}, "First load", TEST_TIMEOUT);

  //   runs(function() {
  //     var done = false;
  //     node.child('c').setPriority(50, function() { done = true; });
  //   });
  //   waitsFor(function() { return done;}, 'First move', TEST_TIMEOUT);

  //   runs(function() {
  //     expect(moved).to.equal('c d, ');

  //     moved = '';
  //     done = false;
  //     node.child('c').setPriority(35, function() { done = true; });
  //   });
  //   waitsFor(function() { return done;}, 'Second move', TEST_TIMEOUT);

  //   runs(function() {
  //     expect(moved).to.equal('c null, ');
  //     moved = '';
  //     done = false;
  //     node.child('b').setPriority(33, function() { done = true; });
  //   });
  //   waitsFor(function() { return done;}, 'Third move', TEST_TIMEOUT);

  //   runs(function() {
  //     expect(moved).to.equal('');
  //   });
  // });

  it('Numeric priorities: Set a limit, move some nodes, ensure prevName works correctly.', function() {
    var node = <Reference>getRandomNode();

    var moved = '';
    node.limitToLast(2).on('child_moved', function(snap, prevName) {
      moved += snap.key + ' ' + prevName + ', ';
    });

    node.child('a').setWithPriority('a', 1);
    node.child('b').setWithPriority('b', 2);
    node.child('c').setWithPriority('c', 3);
    node.child('d').setWithPriority('d', 4);

    node.child('c').setPriority(10);
    expect(moved).to.equal('c d, ');
  });

  // it('Numeric priorities: Set a limit, move some nodes, ensure prevName works correctly. With server data', function() {
  //   var node = getRandomNode(),
  //       done, moved = '';

  //   runs(function() {
  //     done = false;
  //     node.child('a').setWithPriority('a', 1);
  //     node.child('b').setWithPriority('b', 2);
  //     node.child('c').setWithPriority('c', 3);
  //     node.child('d').setWithPriority('d', 4, function() { done = true; });
  //   });
  //   waitsFor(function() { return done;}, 'Initial setup', TEST_TIMEOUT);

  //   runs(function() {
  //     done = false;
  //     node.limitToLast(2).on('child_moved', function(snap, prevName) {
  //       moved += snap.key + ' ' + prevName + ', ';
  //     });
  //     // Need to load the data before the set so we'll see the move
  //     node.limitToLast(2).once('value', function() { done = true; });
  //   });
  //   waitsFor(function() { return done;}, 'First load', TEST_TIMEOUT);

  //   runs(function() {
  //     var done = false;
  //     node.child('c').setPriority(10, function() { done = true; });
  //   });
  //   waitsFor(function() { return done;}, 'First move', TEST_TIMEOUT);

  //   runs(function() {
  //     expect(moved).to.equal('c d, ');
  //   });
  // });

  it('Set a limit, add a bunch of nodes, ensure local events are correct.', function() {
    var node = <Reference>getRandomNode();
    node.set({});
    var eventHistory = '';

    node.limitToLast(2).on('child_added', function(snap) {
      eventHistory = eventHistory + snap.val() + ' added, ';
    });
    node.limitToLast(2).on('child_removed', function(snap) {
      eventHistory = eventHistory + snap.val() + ' removed, ';
    });

    for (var i = 0; i < 5; i++) {
      var n = node.push();
      n.set(i);
    }

    expect(eventHistory).to.equal('0 added, 1 added, 0 removed, 2 added, 1 removed, 3 added, 2 removed, 4 added, ');
  });

  // it('Set a limit, add a bunch of nodes, ensure remote events are correct.', function() {
  //   var nodePair = getRandomNode(2);
  //   var writeNode = nodePair[0];
  //   var readNode = nodePair[1];

  //   var eventHistory = '';

  //   readNode.limitToLast(2).on('child_added', function(snap) {
  //     eventHistory = eventHistory + snap.val() + ' added, ';
  //   });
  //   readNode.limitToLast(2).on('child_removed', function(snap) {
  //     eventHistory = eventHistory.replace(snap.val() + ' added, ', '');
  //   });

  //   for (var i = 0; i < 5; i++) {
  //     var n = writeNode.push();
  //     n.set(i);
  //   }

  //   waitsFor(
  //       function() {
  //         return eventHistory === '3 added, 4 added, ';
  //       },
  //       'Got remote events.', 5000);
  // });

  it('Ensure on() returns callback function.', function() {
    var node = <Reference>getRandomNode();
    var callback = function() { };
    var ret = node.on('value', callback);
    expect(ret).to.equal(callback);
  });

  // it("Limit on unsynced node fires 'value'.", function() {
  //   var f = <Reference>getRandomNode();
  //   var done = false;
  //   f.limitToLast(1).on('value', function() { done = true; });
  //   waitsFor(function() { return done;}, 'value to fire.', TEST_TIMEOUT);
  // });

  // it('Filtering to only null priorities works.', function() {
  //   var f = <Reference>getRandomNode();
  //   var connected = false;
  //   runs(function() {
  //     f.root.child('.info/connected').on('value', function(snap) {
  //       connected = snap.val();
  //     });
  //   });

  //   waitsFor(function() { return connected; }, 'Test fails if disconnected due to listen re-ordering', TEST_TIMEOUT);

  //   var done;
  //   runs(function() {
  //     f.set({
  //       a: {'.priority': null, '.value': 0},
  //       b: {'.priority': null, '.value': 1},
  //       c: {'.priority': '2', '.value': 2},
  //       d: {'.priority': 3, '.value': 3},
  //       e: {'.priority': 'hi', '.value': 4}
  //     });

  //     f.startAt(null).endAt(null).on('value', function(snap) {
  //       expect(snap.val()).to.equal({a: 0, b: 1});
  //       done = true;
  //     });
  //   });
  //   waitsFor(function() { return done; }, 'value to fire', TEST_TIMEOUT);
  // });

  // it('null priorities included in endAt(2).', function() {
  //   var f = <Reference>getRandomNode();
  //   f.set({
  //     a: {'.priority': null, '.value': 0},
  //     b: {'.priority': null, '.value': 1},
  //     c: {'.priority': 2, '.value': 2},
  //     d: {'.priority': 3, '.value': 3},
  //     e: {'.priority': 'hi', '.value': 4}
  //   });

  //   var done;
  //   f.endAt(2).on('value', function(snap) {
  //     expect(snap.val()).to.equal({a: 0, b: 1, c: 2});
  //     done = true;
  //   });
  //   waitsFor(function() { return done; }, 'value to fire', TEST_TIMEOUT);
  // });

  // it('null priorities not included in startAt(2).', function() {
  //   var f = <Reference>getRandomNode();
  //   f.set({
  //     a: {'.priority': null, '.value': 0},
  //     b: {'.priority': null, '.value': 1},
  //     c: {'.priority': 2, '.value': 2},
  //     d: {'.priority': 3, '.value': 3},
  //     e: {'.priority': 'hi', '.value': 4}
  //   });

  //   var done;
  //   f.startAt(2).on('value', function(snap) {
  //     expect(snap.val()).to.equal({c: 2, d: 3, e: 4});
  //     done = true;
  //   });
  //   waitsFor(function() { return done; }, 'value to fire', TEST_TIMEOUT);
  // });

  function dumpListens(node: Query) {
    var listens = node.repo.persistentConnection_.listens_;
    var nodePath = getPath(node);
    var listenPaths = [];
    for (var path in listens) {
      if (path.substring(0, nodePath.length) === nodePath) {
        listenPaths.push(path);
      }
    }

    listenPaths.sort();
    var dumpPieces = [];
    for (var i = 0; i < listenPaths.length; i++) {

      var queryIds = [];
      for (var queryId in listens[listenPaths[i]]) {
        queryIds.push(queryId);
      }
      queryIds.sort();
      if (queryIds.length > 0) {
        dumpPieces.push(listenPaths[i].substring(nodePath.length) + ':' + queryIds.join(','));
      }
    }

    return dumpPieces.join(';');
  }

  it('Dedupe listens: listen on parent.', function() {
    var node = <Reference>getRandomNode();
    expect(dumpListens(node)).to.equal('');

    var aOn = node.child('a').on('value', function() { });
    expect(dumpListens(node)).to.equal('/a:default');

    var rootOn = node.on('value', function() {});
    expect(dumpListens(node)).to.equal(':default');

    node.off('value', rootOn);
    expect(dumpListens(node)).to.equal('/a:default');

    node.child('a').off('value', aOn);
    expect(dumpListens(node)).to.equal('');
  });

  it('Dedupe listens: listen on grandchild.', function() {
    var node = <Reference>getRandomNode();

    var rootOn = node.on('value', function() {});
    expect(dumpListens(node)).to.equal(':default');

    var aaOn = node.child('a/aa').on('value', function() { });
    expect(dumpListens(node)).to.equal(':default');

    node.off('value', rootOn);
    node.child('a/aa').off('value', aaOn);
    expect(dumpListens(node)).to.equal('');
  });

  it('Dedupe listens: listen on grandparent of two children.', function() {
    var node = <Reference>getRandomNode();
    expect(dumpListens(node)).to.equal('');

    var aaOn = node.child('a/aa').on('value', function() { });
    expect(dumpListens(node)).to.equal('/a/aa:default');

    var bbOn = node.child('a/bb').on('value', function() { });
    expect(dumpListens(node)).to.equal('/a/aa:default;/a/bb:default');

    var rootOn = node.on('value', function() {});
    expect(dumpListens(node)).to.equal(':default');

    node.off('value', rootOn);
    expect(dumpListens(node)).to.equal('/a/aa:default;/a/bb:default');

    node.child('a/aa').off('value', aaOn);
    expect(dumpListens(node)).to.equal('/a/bb:default');

    node.child('a/bb').off('value', bbOn);
    expect(dumpListens(node)).to.equal('');
  });

  it('Dedupe queried listens: multiple queried listens; no dupes', function() {
    var node = <Reference>getRandomNode();
    expect(dumpListens(node)).to.equal('');

    var aLim1On = node.child('a').limitToLast(1).on('value', function() { });
    expect(dumpListens(node)).to.equal('/a:{"l":1,"vf":"r"}');

    var rootLim1On = node.limitToLast(1).on('value', function() { });
    expect(dumpListens(node)).to.equal(':{"l":1,"vf":"r"};/a:{"l":1,"vf":"r"}');

    var aLim5On = node.child('a').limitToLast(5).on('value', function() { });
    expect(dumpListens(node)).to.equal(':{"l":1,"vf":"r"};/a:{"l":1,"vf":"r"},{"l":5,"vf":"r"}');

    node.limitToLast(1).off('value', rootLim1On);
    expect(dumpListens(node)).to.equal('/a:{"l":1,"vf":"r"},{"l":5,"vf":"r"}');

    node.child('a').limitToLast(1).off('value', aLim1On);
    node.child('a').limitToLast(5).off('value', aLim5On);
    expect(dumpListens(node)).to.equal('');
  });

  it('Dedupe queried listens: listen on parent of queried children.', function() {
    var node = <Reference>getRandomNode();

    var aLim1On = node.child('a').limitToLast(1).on('value', function() { });
    expect(dumpListens(node)).to.equal('/a:{"l":1,"vf":"r"}');

    var bLim1On = node.child('b').limitToLast(1).on('value', function() { });
    expect(dumpListens(node)).to.equal('/a:{"l":1,"vf":"r"};/b:{"l":1,"vf":"r"}');

    var rootOn = node.on('value', function() { });
    expect(dumpListens(node)).to.equal(':default');

    // remove in slightly random order.
    node.child('a').limitToLast(1).off('value', aLim1On);
    expect(dumpListens(node)).to.equal(':default');

    node.off('value', rootOn);
    expect(dumpListens(node)).to.equal('/b:{"l":1,"vf":"r"}');

    node.child('b').limitToLast(1).off('value', bLim1On);
    expect(dumpListens(node)).to.equal('');
  });

  it('Limit with mix of null and non-null priorities.', function() {
    var node = <Reference>getRandomNode();

    var children = [];
    node.limitToLast(5).on('child_added', function(childSnap) {
      children.push(childSnap.key);
    });

    node.set({
      'Vikrum': {'.priority': 1000, 'score': 1000, 'name': 'Vikrum'},
      'Mike': {'.priority': 500, 'score': 500, 'name': 'Mike'},
      'Andrew': {'.priority': 50, 'score': 50, 'name': 'Andrew'},
      'James': {'.priority': 7, 'score': 7, 'name': 'James'},
      'Sally': {'.priority': -7, 'score': -7, 'name': 'Sally'},
      'Fred': {'score': 0, 'name': 'Fred'}
    });

    expect(children.join(',')).to.equal('Sally,James,Andrew,Mike,Vikrum');
  });

  // it('Limit with mix of null and non-null priorities using server data', function() {
  //   var node = getRandomNode(),
  //       done, count;

  //   var children = [];
  //   runs(function() {
  //     done = false;
  //     node.set({
  //       'Vikrum': {'.priority': 1000, 'score': 1000, 'name': 'Vikrum'},
  //       'Mike': {'.priority': 500, 'score': 500, 'name': 'Mike'},
  //       'Andrew': {'.priority': 50, 'score': 50, 'name': 'Andrew'},
  //       'James': {'.priority': 7, 'score': 7, 'name': 'James'},
  //       'Sally': {'.priority': -7, 'score': -7, 'name': 'Sally'},
  //       'Fred': {'score': 0, 'name': 'Fred'}
  //     }, function() { done = true; });
  //   });
  //   waitsFor(function() { return done; }, 'Initial setup', TEST_TIMEOUT);

  //   runs(function() {
  //     count = 0;
  //     node.limitToLast(5).on('child_added', function(childSnap) {
  //       children.push(childSnap.key);
  //       count++;
  //     });
  //   });
  //   waitsFor(function() { return count === 5; }, 'Get all children', TEST_TIMEOUT);

  //   runs(function() {
  //     expect(children.join(',')).to.equal('Sally,James,Andrew,Mike,Vikrum');
  //   });
  // });

  it('.on() with a context works.', function() {
    var ref = <Reference>getRandomNode();

    var ListenerDoohickey = function() { this.snap = null; };
    ListenerDoohickey.prototype.onEvent = function(snap) {
      this.snap = snap;
    };

    var l = new ListenerDoohickey();
    ref.on('value', l.onEvent, l);

    ref.set('test');
    expect(l.snap.val()).to.equal('test');

    ref.off('value', l.onEvent, l);

    // Ensure we don't get any more events.
    ref.set('blah');
    expect(l.snap.val()).to.equal('test');
  });

  it('.once() with a context works.', function() {
    var ref = <Reference>getRandomNode();

    var ListenerDoohickey = function() { this.snap = null; };
    ListenerDoohickey.prototype.onEvent = function(snap) {
      this.snap = snap;
    };

    var l = new ListenerDoohickey();
    ref.once('value', l.onEvent, l);

    ref.set('test');
    expect(l.snap.val()).to.equal('test');

    // Shouldn't get any more events.
    ref.set('blah');
    expect(l.snap.val()).to.equal('test');
  });

  it('handles an update that deletes the entire window in a query', function() {
    var ref = <Reference>getRandomNode();

    var snaps = [];
    ref.limitToLast(2).on('value', function(snap) {
      snaps.push(snap.val());
    });

    ref.set({
      a: {'.value': 1, '.priority': 1},
      b: {'.value': 2, '.priority': 2},
      c: {'.value': 3, '.priority': 3}
    });
    ref.update({
      b: null,
      c: null
    });

    expect(snaps.length).to.equal(2);
    expect(snaps[0]).to.equal({b: 2, c: 3});
    // The original set is still outstanding (synchronous API), so we have a full cache to re-window against
    expect(snaps[1]).to.equal({a: 1});
  });

  it('handles an out-of-view query on a child', function() {
    var ref = <Reference>getRandomNode();

    var parent = null;
    ref.limitToLast(1).on('value', function(snap) {
      parent = snap.val();
    });

    var child = null;
    ref.child('a').on('value', function(snap) {
      child = snap.val();
    });

    ref.set({a: 1, b: 2});
    expect(parent).to.equal({b: 2});
    expect(child).to.equal(1);

    ref.update({c: 3});
    expect(parent).to.equal({c: 3});
    expect(child).to.equal(1);
  });

  it('handles a child query going out of view of the parent', function() {
    var ref = <Reference>getRandomNode();

    var parent = null;
    ref.limitToLast(1).on('value', function(snap) {
      parent = snap.val();
    });

    var child = null;
    ref.child('a').on('value', function(snap) {
      child = snap.val();
    });

    ref.set({a: 1});
    expect(parent).to.equal({a: 1});
    expect(child).to.equal(1);
    ref.child('b').set(2);
    expect(parent).to.equal({b: 2});
    expect(child).to.equal(1);
    ref.child('b').remove();
    expect(parent).to.equal({a: 1});
    expect(child).to.equal(1);
  });

  it('handles diverging views', function() {
    var ref = <Reference>getRandomNode();

    var c = null;
    ref.limitToLast(1).endAt(null, 'c').on('value', function(snap) {
      c = snap.val();
    });

    var d = null;
    ref.limitToLast(1).endAt(null, 'd').on('value', function(snap) {
      d = snap.val();
    });

    ref.set({a: 1, b: 2, c: 3});
    expect(c).to.equal({c: 3});
    expect(d).to.equal({c: 3});
    ref.child('d').set(4);
    expect(c).to.equal({c: 3});
    expect(d).to.equal({d: 4});
  });

  // it('handles removing a queried element', function() {
  //   var ref = <Reference>getRandomNode();

  //   var val;
  //   ref.limitToLast(1).on('child_added', function(snap) {
  //     val = snap.val();
  //   });

  //   ref.set({a: 1, b: 2});
  //   expect(val).to.equal(2);

  //   ref.child('b').remove();
  //   waitsFor(function() {
  //     return val == 1;
  //   }, 'Get the next element in the window', TEST_TIMEOUT);
  // });

  // it('.startAt().limitToFirst(1) works.', function() {
  //   var ref = <Reference>getRandomNode();
  //   ref.set({a: 1, b: 2});

  //   var val;
  //   ref.startAt().limitToFirst(1).on('child_added', function(snap) {
  //     val = snap.val();
  //   });

  //   waitsFor(function() { return val === 1; }, 'got first child', TEST_TIMEOUT);
  // });

  // it('.startAt().limitToFirst(1) and then remove first child (case 1664).', function() {
  //   var ref = <Reference>getRandomNode();
  //   ref.set({a: 1, b: 2});

  //   var val;
  //   ref.startAt().limitToFirst(1).on('child_added', function(snap) {
  //     val = snap.val();
  //   });

  //   waitsFor(function() { return val === 1; }, 'got first child', TEST_TIMEOUT);

  //   runs(function() {
  //     ref.child('a').remove();
  //   });
  //   waitsFor(function() { return val === 2; }, 'got first child after remove', TEST_TIMEOUT);
  // });

  // it('.startAt() with two arguments works properly.  Case 1169.', function() {
  //   var ref = getRandomNode(), done = false;
  //   ref.set({ 'Walker': { name: 'Walker', score: 20, '.priority': 20 }, 'Michael': { name: 'Michael', score: 100, '.priority': 100 } }, function() {
  //     ref.startAt(20, 'Walker').limitToFirst(2).on('value', function(s) {
  //       var childNames = [];
  //       s.forEach(function(node) { childNames.push(node.key); });
  //       expect(childNames).to.equal(['Walker', 'Michael']);
  //       done = true;
  //     });
  //   });
  //   waitsFor(function() { return done; }, 'Got correct data back.', TEST_TIMEOUT);
  // });

  // it('handles multiple queries on the same node', function() {
  //   var ref = getRandomNode(),
  //       ready, done;

  //   runs(function() {
  //     ready = false
  //     ref.set({
  //       a: 1,
  //       b: 2,
  //       c: 3,
  //       d: 4,
  //       e: 5,
  //       f: 6
  //     }, function() { ready = true; });
  //   });
  //   waitsFor(function() { return ready; }, 'Set initial data', TEST_TIMEOUT);

  //   runs(function() {
  //     // do first listen
  //     ready = false;
  //     ref.limitToLast(2).on('value', function(snap) {
  //       // This shouldn't get called twice, we don't update the values here
  //       expect(ready).to.be.false;
  //       ready = true;
  //     });
  //   });
  //   waitsFor(function() { return ready; }, 'Get initial data', TEST_TIMEOUT);

  //   runs(function() {
  //     // now do the nested once calls
  //     done = false;
  //     ref.limitToLast(1).once('value', function(snap) {
  //       ref.limitToLast(1).once('value', function(snap) {
  //         var val = snap.val();
  //         expect(val).to.equal({f: 6});
  //         done = true;
  //       });
  //     });
  //   });
  //   waitsFor(function() { return done; }, 'Get nested once response', TEST_TIMEOUT);
  // });

  // it('handles once called on a node with a default listener', function() {
  //   var ref = getRandomNode(),
  //       ready, done;

  //   runs(function() {
  //     ready = false;
  //     ref.set({
  //       a: 1,
  //       b: 2,
  //       c: 3,
  //       d: 4,
  //       e: 5,
  //       f: 6
  //     }, function() { ready = true; });
  //   });
  //   waitsFor(function() { return ready; }, 'Set initial data', TEST_TIMEOUT);

  //   runs(function() {
  //     // do first listen
  //     ready = false;
  //     ref.on('value', function(snap) {
  //       ready = true;
  //     });
  //   });
  //   waitsFor(function() { return ready; }, 'Get initial data', TEST_TIMEOUT);

  //   runs(function() {
  //     // now do the once call
  //     done = false;
  //     ref.limitToLast(1).once('child_added', function(snap) {
  //       var val = snap.val();
  //       expect(val).to.equal(6);
  //       done = true;
  //     });
  //   });
  //   waitsFor(function() { return done; }, 'Get once response', TEST_TIMEOUT);
  // });


  // it('handles once called on a node with a default listener and non-complete limit', function() {
  //   var ref = getRandomNode(),
  //       ready, done;

  //   runs(function() {
  //     ready = false;
  //     ref.set({
  //       a: 1,
  //       b: 2,
  //       c: 3
  //     }, function() { ready = true; });
  //   });
  //   waitsFor(function() { return ready; }, 'Set initial data', TEST_TIMEOUT);

  //   runs(function() {
  //     // do first listen
  //     ready = false;
  //     ref.on('value', function(snap) {
  //       ready = true;
  //     });
  //   });
  //   waitsFor(function() { return ready; }, 'Get initial data', TEST_TIMEOUT);

  //   runs(function() {
  //     // now do the once call
  //     done = false;
  //     ref.limitToLast(5).once('value', function(snap) {
  //       var val = snap.val();
  //       expect(val).to.equal({a: 1, b: 2, c: 3});
  //       done = true;
  //     });
  //   });
  //   waitsFor(function() { return done; }, 'Get once response', TEST_TIMEOUT);
  // });

  // it('Remote remove triggers events.', function() {
  //   var refPair = getRandomNode(2), writeRef = refPair[0], readRef = refPair[1];

  //   var done = false;
  //   writeRef.set({ a: 'a', b: 'b', c: 'c', d: 'd', e: 'e' }, function() {

  //     // Wait to get the initial data, and then remove 'c' remotely and wait for new data.
  //     var count = 0;
  //     readRef.limitToLast(5).on('value', function(s) {
  //       count++;
  //       if (count == 1) {
  //         expect(s.val()).to.equal({a: 'a', b: 'b', c: 'c', d: 'd', e: 'e' });
  //         writeRef.child('c').remove();
  //       } else {
  //         expect(count).to.equal(2);
  //         expect(s.val()).to.equal({a: 'a', b: 'b', d: 'd', e: 'e' });
  //         done = true;
  //       }
  //     });
  //   });

  //   waitsFor(function() { return done; }, "'value' received after remote delete.", TEST_TIMEOUT);
  // });

  // it(".endAt(null, 'f').limitToLast(5) returns the right set of children.", function() {
  //   var ref = getRandomNode(), done = false;
  //   ref.set({ a: 'a', b: 'b', c: 'c', d: 'd', e: 'e', f: 'f', g: 'g', h: 'h' }, function() {
  //     ref.endAt(null, 'f').limitToLast(5).on('value', function(s) {
  //       expect(s.val()).to.equal({b: 'b', c: 'c', d: 'd', e: 'e', f: 'f' });
  //       done = true;
  //     });
  //   });
  //   waitsFor(function() { return done; }, 'test to finish.', TEST_TIMEOUT);
  // });

  // it('complex update() at query root raises correct value event', function() {
  //   var done = false;
  //   runs(function() {
  //     var nodePair = getRandomNode(2);
  //     var writer = nodePair[0];
  //     var reader = nodePair[1];

  //     var readerLoaded = false, numEventsReceived = 0;
  //     writer.child('foo').set({a: 1, b: 2, c: 3, d: 4, e: 5}, function(error, dummy) {
  //       reader.child('foo').startAt().limitToFirst(4).on('value', function(snapshot) {
  //         var val = snapshot.val();
  //         if (!readerLoaded) {
  //           readerLoaded = true;
  //           expect(val).to.equal({a: 1, b: 2, c: 3, d: 4});

  //           // This update causes the following to happen:
  //           // 1. An in-view child is set to null (b)
  //           // 2. An in-view child has its value changed (c)
  //           // 3. An in-view child is changed and bumped out-of-view (d)
  //           // We expect to get null values for b and d, along with the new children and updated value for c
  //           writer.child('foo').update({b: null, c: 'a', cc: 'new', cd: 'new2', d: 'gone'});
  //         } else {
  //           done = true;
  //           expect(val).to.equal({a: 1, c: 'a', cc: 'new', cd: 'new2'});
  //         }
  //       });
  //     });
  //   });
  //   waitsFor(function() { return done; }, 'The disconnect should fire one value event', TEST_TIMEOUT);
  // });

  // it('update() at query root raises correct value event', function() {
  //   var done = false;
  //   runs(function() {
  //     var nodePair = getRandomNode(2);
  //     var writer = nodePair[0];
  //     var reader = nodePair[1];

  //     var readerLoaded = false, numEventsReceived = 0;
  //     writer.child('foo').set({ 'bar': 'a', 'baz': 'b', 'bam': 'c' }, function(error, dummy) {
  //       reader.child('foo').limitToLast(10).on('value', function(snapshot) {
  //         var val = snapshot.val();
  //         if (!readerLoaded) {
  //           readerLoaded = true;
  //           expect(val.bar).to.equal('a');
  //           expect(val.baz).to.equal('b');
  //           expect(val.bam).to.equal('c');
  //           writer.child('foo').update({ 'bar': 'd', 'bam': null, 'bat': 'e' });
  //         } else {
  //           done = true;
  //           expect(val.bar).to.equal('d');
  //           expect(val.baz).to.equal('b');
  //           expect(val.bat).to.equal('e');
  //           expect(val.bam).to.equal(undefined);
  //         }
  //       });
  //     });
  //   });
  //   waitsFor(function() { return done; }, 'The disconnect should fire one value event', TEST_TIMEOUT);
  // });

  // it('set() at query root raises correct value event', function() {
  //   var done = false;
  //   runs(function() {
  //     var nodePair = getRandomNode(2);
  //     var writer = nodePair[0];
  //     var reader = nodePair[1];

  //     var readerLoaded = false, numEventsReceived = 0;
  //     writer.child('foo').set({ 'bar': 'a', 'baz': 'b', 'bam': 'c' }, function(error, dummy) {
  //       reader.child('foo').limitToLast(10).on('value', function(snapshot) {
  //         var val = snapshot.val();
  //         if (!readerLoaded) {
  //           readerLoaded = true;
  //           expect(val.bar).to.equal('a');
  //           expect(val.baz).to.equal('b');
  //           expect(val.bam).to.equal('c');
  //           writer.child('foo').set({ 'bar': 'd', 'baz': 'b', 'bat': 'e' });
  //         } else {
  //           done = true;
  //           expect(val.bar).to.equal('d');
  //           expect(val.baz).to.equal('b');
  //           expect(val.bat).to.equal('e');
  //           expect(val.bam).to.equal(undefined);
  //         }
  //       });
  //     });
  //   });
  //   waitsFor(function() { return done; }, 'The disconnect should fire one value event', TEST_TIMEOUT);
  // });


  // it('listen for child_added events with limit and different types fires properly', function() {
  //   var done = false;
  //   runs(function() {
  //     var nodePair = getRandomNode(2);
  //     var writer = nodePair[0];
  //     var reader = nodePair[1];

  //     var numEventsReceived = 0, gotA = false, gotB = false, gotC = false;
  //     writer.child('a').set(1, function(error, dummy) {
  //       writer.child('b').set('b', function(error, dummy) {
  //         writer.child('c').set({ 'deep': 'path', 'of': { 'stuff': true }}, function(error, dummy) {
  //           reader.limitToLast(3).on('child_added', function(snap) {
  //             var val = snap.val();
  //             switch (snap.key) {
  //               case 'a':
  //                 gotA = true;
  //                 expect(val).to.equal(1);
  //                 break;
  //               case 'b':
  //                 gotB = true;
  //                 expect(val).to.equal('b');
  //                 break;
  //               case 'c':
  //                 gotC = true;
  //                 expect(val.deep).to.equal('path');
  //                 expect(val.of.stuff).to.be.true;
  //                 break;
  //               default:
  //                 expect(false).to.be.true;
  //             }
  //             numEventsReceived += 1;
  //             expect(numEventsReceived).toBeLessThan(4);
  //             done = gotA && gotB && gotC;
  //           });
  //         });
  //       });
  //     });
  //   });
  //   waitsFor(function() { return done; }, 'The reader should receive three child_added events', TEST_TIMEOUT);
  // });

  // it('listen for child_changed events with limit and different types fires properly', function() {
  //   var done = false;
  //   runs(function() {
  //     var nodePair = getRandomNode(2);
  //     var writer = nodePair[0];
  //     var reader = nodePair[1];

  //     var numEventsReceived = 0, gotA = false, gotB = false, gotC = false, readerLoaded = false;
  //     writer.set({ a: 'something', b: "we'll", c: 'overwrite '}, function(error, dummy) {
  //       reader.limitToLast(3).on('value', function(snapshot) {
  //         if (!readerLoaded) {
  //           readerLoaded = true;
  //           // Set up listener for upcoming change events
  //           reader.limitToLast(3).on('child_changed', function(snap) {
  //             var val = snap.val();
  //             switch (snap.key) {
  //               case 'a':
  //                 gotA = true;
  //                 expect(val).to.equal(1);
  //                 break;
  //               case 'b':
  //                 gotB = true;
  //                 expect(val).to.equal('b');
  //                 break;
  //               case 'c':
  //                 gotC = true;
  //                 expect(val.deep).to.equal('path');
  //                 expect(val.of.stuff).to.be.true;
  //                 break;
  //               default:
  //                 expect(false).to.be.true;
  //             }
  //             numEventsReceived += 1;
  //             expect(numEventsReceived).toBeLessThan(4);
  //             done = gotA && gotB && gotC;
  //           });

  //           // Begin changing every key
  //           writer.child('a').set(1);
  //           writer.child('b').set('b');
  //           writer.child('c').set({ 'deep': 'path', 'of': { 'stuff': true }});
  //         }
  //       });
  //     });
  //   });
  //   waitsFor(function() { return done; }, 'The reader should receive three child_changed events', TEST_TIMEOUT);
  // });

  // it('listen for child_remove events with limit and different types fires properly', function() {
  //   var done = false;
  //   runs(function() {
  //     var nodePair = getRandomNode(2);
  //     var writer = nodePair[0];
  //     var reader = nodePair[1];

  //     var numEventsReceived = 0, gotA = false, gotB = false, gotC = false, readerLoaded = false;
  //     writer.set({ a: 1, b: 'b', c: { 'deep': 'path', 'of': { 'stuff': true }} }, function(error, dummy) {
  //       reader.limitToLast(3).on('value', function(snapshot) {
  //         if (!readerLoaded) {
  //           readerLoaded = true;

  //           // Set up listener for upcoming change events
  //           reader.limitToLast(3).on('child_removed', function(snap) {
  //             var val = snap.val();
  //             switch (snap.key) {
  //               case 'a':
  //                 gotA = true;
  //                 expect(val).to.equal(1);
  //                 break;
  //               case 'b':
  //                 gotB = true;
  //                 expect(val).to.equal('b');
  //                 break;
  //               case 'c':
  //                 gotC = true;
  //                 expect(val.deep).to.equal('path');
  //                 expect(val.of.stuff).to.be.true;
  //                 break;
  //               default:
  //                 expect(false).to.be.true;
  //             }
  //             numEventsReceived += 1;
  //             expect(numEventsReceived).toBeLessThan(4);
  //             done = gotA && gotB && gotC;
  //           });

  //           // Begin removing every key
  //           writer.child('a').remove();
  //           writer.child('b').remove();
  //           writer.child('c').remove();
  //         }
  //       });
  //     });
  //   });
  //   waitsFor(function() { return done; }, 'The reader should receive three child_removed events', 3 * TEST_TIMEOUT);
  // });

  // it('listen for child_remove events when parent removed', function() {
  //   var done = false;
  //   runs(function() {
  //     var nodePair = getRandomNode(2);
  //     var writer = nodePair[0];
  //     var reader = nodePair[1];

  //     var numEventsReceived = 0, gotA = false, gotB = false, gotC = false, readerLoaded = false;
  //     writer.set({ a: 1, b: 'b', c: { 'deep': 'path', 'of': { 'stuff': true }} }, function(error, dummy) {

  //       reader.limitToLast(3).on('value', function(snapshot) {
  //         if (!readerLoaded) {
  //           readerLoaded = true;

  //           // Set up listener for upcoming change events
  //           reader.limitToLast(3).on('child_removed', function(snap) {
  //             var val = snap.val();
  //             switch (snap.key) {
  //               case 'a':
  //                 gotA = true;
  //                 expect(val).to.equal(1);
  //                 break;
  //               case 'b':
  //                 gotB = true;
  //                 expect(val).to.equal('b');
  //                 break;
  //               case 'c':
  //                 gotC = true;
  //                 expect(val.deep).to.equal('path');
  //                 expect(val.of.stuff).to.be.true;
  //                 break;
  //               default:
  //                 expect(false).to.be.true;
  //             }
  //             numEventsReceived += 1;
  //             expect(numEventsReceived).toBeLessThan(4);
  //             done = gotA && gotB && gotC;
  //           });

  //           // Remove the query parent
  //           writer.remove();
  //         }
  //       });
  //     });
  //   });
  //   waitsFor(function() { return done; }, 'The reader should receive three child_removed events', 3 * TEST_TIMEOUT);
  // });

  // it('listen for child_remove events when parent set to scalar', function() {
  //   var done = false;
  //   runs(function() {
  //     var nodePair = getRandomNode(2);
  //     var writer = nodePair[0];
  //     var reader = nodePair[1];

  //     var numEventsReceived = 0, gotA = false, gotB = false, gotC = false, readerLoaded = false;
  //     writer.set({ a: 1, b: 'b', c: { 'deep': 'path', 'of': { 'stuff': true }} }, function(error, dummy) {

  //       reader.limitToLast(3).on('value', function(snapshot) {
  //         if (!readerLoaded) {
  //           readerLoaded = true;

  //           // Set up listener for upcoming change events
  //           reader.limitToLast(3).on('child_removed', function(snap) {
  //             var val = snap.val();
  //             switch (snap.key) {
  //               case 'a':
  //                 gotA = true;
  //                 expect(val).to.equal(1);
  //                 break;
  //               case 'b':
  //                 gotB = true;
  //                 expect(val).to.equal('b');
  //                 break;
  //               case 'c':
  //                 gotC = true;
  //                 expect(val.deep).to.equal('path');
  //                 expect(val.of.stuff).to.be.true;
  //                 break;
  //               default:
  //                 expect(false).to.be.true;
  //             }
  //             numEventsReceived += 1;
  //             expect(numEventsReceived).toBeLessThan(4);
  //             done = gotA && gotB && gotC;
  //           });

  //           // Set the parent to a scalar
  //           writer.set('scalar');
  //         }
  //       });
  //     });
  //   });
  //   waitsFor(function() { return done; }, 'The reader should receive three child_removed events', 3 * TEST_TIMEOUT);
  // });


  // it('Queries behave wrong after .once().', function() {
  //   var refPair = getRandomNode(2),
  //       writeRef = refPair[0],
  //       readRef = refPair[1],
  //       done, startAtCount, defaultCount;

  //   runs(function() {
  //     done = false;
  //     writeRef.set({a: 1, b: 2, c: 3, d: 4 }, function() {
  //       done = true;
  //     });
  //   });
  //   waitsFor(function() { return done; }, 'wrote some initial data', TEST_TIMEOUT);

  //   runs(function() {
  //     done = false;
  //     readRef.once('value', function() {
  //       done = true;
  //     });
  //   });
  //   waitsFor(function() { return done; }, 'Read data with .once.', TEST_TIMEOUT);

  //   runs(function() {
  //     startAtCount = 0;
  //     readRef.startAt(null, 'd').on('child_added', function() {
  //       startAtCount++;
  //     });
  //     expect(startAtCount).to.equal(0);

  //     defaultCount = 0;
  //     readRef.on('child_added', function() {
  //       defaultCount++;
  //     });
  //     expect(defaultCount).to.equal(0);

  //     readRef.on('child_removed', function() {
  //       expect(false).to.be.true;
  //     });
  //   });
  //   waitsFor(function() { return startAtCount === 1 && defaultCount === 4; }, 'Got child_added events for queries.', TEST_TIMEOUT);
  // });

  it('Case 2003: Correctly get events for startAt/endAt queries when priority changes.', function() {
    var ref = <Reference>getRandomNode();
    var addedFirst = [], removedFirst = [], addedSecond = [], removedSecond = [];
    ref.startAt(0).endAt(10).on('child_added', function(snap) { addedFirst.push(snap.key); });
    ref.startAt(0).endAt(10).on('child_removed', function(snap) { removedFirst.push(snap.key); });
    ref.startAt(10).endAt(20).on('child_added', function(snap) { addedSecond.push(snap.key); });
    ref.startAt(10).endAt(20).on('child_removed', function(snap) { removedSecond.push(snap.key); });

    ref.child('a').setWithPriority('a', 5);
    expect(addedFirst).to.equal(['a']);
    ref.child('a').setWithPriority('a', 15);
    expect(removedFirst).to.equal(['a']);
    expect(addedSecond).to.equal(['a']);

    ref.child('a').setWithPriority('a', 10);
    expect(addedFirst).to.equal(['a', 'a']);

    ref.child('a').setWithPriority('a', 5);
    expect(removedSecond).to.equal(['a']);
  });

  // it('Behaves with diverging queries', function() {
  //   var refs = getRandomNode(2);
  //   var writer = refs[0];
  //   var reader = refs[1];

  //   var written = false;
  //   var ready = false;
  //   var done = false;
  //   runs(function() {
  //     writer.set({
  //       a: {b: 1, c: 2},
  //       e: 3
  //     }, function() {
  //       written = true;
  //     });
  //   });

  //   waitsFor(function() { return written; }, 'Initial write', TEST_TIMEOUT);

  //   runs(function() {
  //     var childCount = 0;
  //     reader.child('a/b').on('value', function(snap) {
  //       var val = snap.val();
  //       childCount++;
  //       if (childCount == 1) {
  //         expect(val).to.equal(1);
  //       } else {
  //         // fail this, nothing should have changed
  //         expect(true).to.be.false;
  //       }
  //     });

  //     var count = 0;
  //     reader.limitToLast(2).on('value', function(snap) {
  //       var val = snap.val();
  //       count++;
  //       if (count == 1) {
  //         expect(val).to.equal({a: {b: 1, c: 2}, e: 3});
  //         ready = true;
  //       } else if (count == 2) {
  //         expect(val).to.equal({d: 4, e: 3});
  //         done = true;
  //       }
  //     });
  //   });

  //   waitsFor(function() { return ready; }, 'Initial data loaded', TEST_TIMEOUT);

  //   runs(function() {
  //     writer.child('d').set(4);
  //   });

  //   waitsFor(function() { return done; }, 'Got updates', TEST_TIMEOUT);
  // });

  // it('Priority-only updates are processed correctly by server.', function() {
  //   var refPair = getRandomNode(2), readRef = refPair[0], writeRef = refPair[1];

  //   var readVal;
  //   readRef.limitToLast(2).on('value', function(s) {
  //     readVal = s.val();
  //   });
  //   writeRef.set(
  //       { a: { '.priority': 10, '.value': 1},
  //         b: { '.priority': 20, '.value': 2},
  //         c: { '.priority': 30, '.value': 3}
  //     });

  //   waitsFor(function() { return TESTS.equals(readVal, { b: 2, c: 3 }); }, 'correct initial data', TEST_TIMEOUT);

  //   runs(function() {
  //     writeRef.child('a').setPriority(25);
  //   });

  //   waitsFor(function() { return TESTS.equals(readVal, { a: 1, c: 3 }); }, 'correct data after priority update', TEST_TIMEOUT);
  // });

  // it('Server: Test re-listen', function() {
  //   var refPair = getRandomNode(2), ref = refPair[0], ref2 = refPair[1];
  //   ref.set({
  //     a: 'a',
  //     b: 'b',
  //     c: 'c',
  //     d: 'd',
  //     e: 'e',
  //     f: 'f',
  //     g: 'g'
  //   });

  //   var before;
  //   ref.startAt(null, 'a').endAt(null, 'b').on('value', function(b) {
  //     before = b.val();
  //   });

  //   var done;
  //   ref.child('aa').set('aa', function() {
  //     ref2.startAt(null, 'a').endAt(null, 'b').on('value', function(b) {
  //       expect(b.val()).to.equal(before);
  //       done = true;
  //     });
  //   });
  //   waitsFor(function() { return done; });
  // });

  // it('Server: Test re-listen 2', function() {
  //   var refPair = getRandomNode(2), ref = refPair[0], ref2 = refPair[1];
  //   ref.set({
  //     a: 'a',
  //     b: 'b',
  //     c: 'c',
  //     d: 'd',
  //     e: 'e',
  //     f: 'f',
  //     g: 'g'
  //   });

  //   var before;
  //   ref.startAt(null, 'b').limitToFirst(3).on('value', function(b) {
  //     before = b.val();
  //   });

  //   var done;
  //   ref.child('aa').update({ 'a': 5, 'aa': 4, 'b': 7, 'c': 4, 'd': 4, 'dd': 3 }, function() {
  //     ref2.startAt(null, 'b').limitToFirst(3).on('value', function(b) {
  //       expect(b.val()).to.equal(before);
  //       done = true;
  //     });
  //   });

  //   waitsFor(function() { return done; });
  // });

  // it('Server: Test re-listen 3', function() {
  //   var refPair = getRandomNode(2), ref = refPair[0], ref2 = refPair[1];
  //   ref.set({
  //     a: 'a',
  //     b: 'b',
  //     c: 'c',
  //     d: 'd',
  //     e: 'e',
  //     f: 'f',
  //     g: 'g'
  //   });

  //   var before;
  //   ref.limitToLast(3).on('value', function(b) {
  //     before = b.val();
  //   });

  //   var done;
  //   ref.child('h').set('h', function() {
  //     ref2.limitToLast(3).on('value', function(b) {
  //       expect(b.val()).to.equal(before);
  //       done = true;
  //     });
  //   });

  //   waitsFor(function() { return done; });
  // });

  // it('Server limit below limit works properly.', function() {
  //   var refPair = getRandomNode(2),
  //       readRef = refPair[0],
  //       writeRef = refPair[1],
  //       childData;

  //   writeRef.set({
  //     a: {
  //       aa: {'.priority': 1, '.value': 1 },
  //       ab: {'.priority': 1, '.value': 1 }
  //     } }, function() {
  //     readRef.limitToLast(1).on('value', function(s) {
  //       expect(s.val()).to.equal({a: { aa: 1, ab: 1}});
  //     });

  //     readRef.child('a').startAt(1).endAt(1).on('value', function(s) {
  //       childData = s.val();
  //     });
  //   });
  //   waitsFor(function() { return TESTS.equals(childData, { aa: 1, ab: 1 }); }, 'initial child data', TEST_TIMEOUT);

  //   runs(function() {
  //     // This should remove an item from the child query, but *not* the parent query.
  //     writeRef.child('a/ab').setWithPriority(1, 2);
  //   });
  //   waitsFor(function() { return TESTS.equals(childData, { aa: 1 }); }, 'updated child data', TEST_TIMEOUT);
  // });

  // it('Server: Setting grandchild of item in limit works.', function() {
  //   var refPair = getRandomNode(2), ref = refPair[0], ref2 = refPair[1];

  //   ref.set({ a: {
  //     name: 'Mike'
  //   }});

  //   var snaps = [];
  //   ref2.limitToLast(1).on('value', function(s) {
  //     var val = s.val();
  //     if (val !== null) {
  //       snaps.push(val);
  //     }
  //   });
  //   waitsFor(function() { return TESTS.equals(snaps, [{ a: { name: 'Mike' } }]); }, 'initial data', TEST_TIMEOUT);

  //   runs(function() {
  //     ref.child('a/name').set('Fred');
  //   });
  //   waitsFor(function() { return TESTS.equals(snaps, [{ a: { name: 'Mike' } }, { a: { name: 'Fred' } }]); }, 'updated data', TEST_TIMEOUT);
  // });

  // it('Server: Updating grandchildren of item in limit works.', function() {
  //   var refPair = getRandomNode(2), ref = refPair[0], ref2 = refPair[1];

  //   ref.set({ a: {
  //     name: 'Mike'
  //   }});

  //   var snaps = [];
  //   ref2.limitToLast(1).on('value', function(s) {
  //     var val = s.val();
  //     if (val !== null) {
  //       snaps.push(val);
  //     }
  //   });
  //   waitsFor(function() { return TESTS.equals(snaps, [{ a: { name: 'Mike' } }]); }, 'initial data', TEST_TIMEOUT);

  //   runs(function() {
  //     ref.child('a').update({ name: null, Name: 'Fred' });
  //   });
  //   waitsFor(function() { return TESTS.equals(snaps, [{ a: { name: 'Mike' } }, { a: { Name: 'Fred' } }]); },
  //     'updated data', TEST_TIMEOUT);
  // });

  // it('Server: New child at end of limit shows up.', function() {
  //   var refPair = getRandomNode(2), ref = refPair[0], ref2 = refPair[1];

  //   var snap;
  //   ref2.limitToLast(1).on('value', function(s) {
  //     snap = s.val();
  //   });

  //   waitsFor(function() { return snap === null }, 'initial data', TEST_TIMEOUT);

  //   runs(function() {
  //     ref.child('a').set('new child');
  //   });
  //   waitsFor(function() { return TESTS.equals(snap, { a: 'new child' }); }, 'updated data', TEST_TIMEOUT);
  // });

  // it('Server: Priority-only updates are processed correctly by server (1).', function() {
  //   var refPair = getRandomNode(2), readRef = refPair[0], writeRef = refPair[1];

  //   var readVal;
  //   readRef.limitToLast(2).on('value', function(s) {
  //     readVal = s.val();
  //   });
  //   writeRef.set(
  //       { a: { '.priority': 10, '.value': 1},
  //         b: { '.priority': 20, '.value': 2},
  //         c: { '.priority': 30, '.value': 3}
  //       });

  //   waitsFor(function() { return TESTS.equals(readVal, { b: 2, c: 3 }); }, 'correct initial data', TEST_TIMEOUT);

  //   runs(function() {
  //     writeRef.child('a').setPriority(25);
  //   });

  //   waitsFor(function() { return TESTS.equals(readVal, { a: 1, c: 3 }); }, 'correct data after priority update', TEST_TIMEOUT);
  // });

  // // Same as above but with an endAt() so we hit CompoundQueryView instead of SimpleLimitView.
  // it('Server: Priority-only updates are processed correctly by server (2).', function() {
  //   var refPair = getRandomNode(2), readRef = refPair[0], writeRef = refPair[1];

  //   var readVal;
  //   readRef.endAt(50).limitToLast(2).on('value', function(s) {
  //     readVal = s.val();
  //   });
  //   writeRef.set(
  //       { a: { '.priority': 10, '.value': 1},
  //         b: { '.priority': 20, '.value': 2},
  //         c: { '.priority': 30, '.value': 3}
  //       });

  //   waitsFor(function() { return TESTS.equals(readVal, { b: 2, c: 3 }); }, 'correct initial data', TEST_TIMEOUT);

  //   runs(function() {
  //     writeRef.child('a').setPriority(25);
  //   });

  //   waitsFor(function() { return TESTS.equals(readVal, { a: 1, c: 3 }); }, 'correct data after priority update', TEST_TIMEOUT);
  // });

  // it('Latency compensation works with limit and pushed object.', function() {
  //   var ref = <Reference>getRandomNode();
  //   var events = [];
  //   ref.limitToLast(3).on('child_added', function(s) { events.push(s.val()); });

  //   // If you change this to ref.push('foo') it works.
  //   ref.push({a: 'foo'});

  //   // Should have synchronously gotten an event.
  //   expect(events.length).to.equal(1);
  // });

  // it("Cache doesn't remove items that have fallen out of view.", function() {
  //   var refPair = getRandomNode(2), readRef = refPair[0], writeRef = refPair[1];

  //   var readVal;
  //   readRef.limitToLast(2).on('value', function(s) {
  //     readVal = s.val();
  //   });
  //   waitsFor(function() { return readVal === null; }, 'initial data', TEST_TIMEOUT);

  //   runs(function() {
  //     for (var i = 0; i < 4; i++) {
  //       writeRef.child('k' + i).set(i);
  //     }
  //   });
  //   waitsFor(function() { return TESTS.equals(readVal, {'k2': 2, 'k3': 3}); }, 'correct data after sets.', TEST_TIMEOUT);

  //   runs(function() {
  //     writeRef.remove();
  //   });
  //   waitsFor(function() { return readVal === null; }, 'correct data after clear.', TEST_TIMEOUT);
  // });

  // it('handles an update that moves another child that has a deeper listener out of view', function() {
  //   var refs = getRandomNode(2);
  //   var reader = refs[0];
  //   var writer = refs[1];

  //   var done = false;
  //   runs(function() {
  //     writer.set({ a: { '.priority': 10, '.value': 1},
  //       b: { '.priority': 20, d: 4},
  //       c: { '.priority': 30, '.value': 3}
  //     }, function() { done = true; });
  //   });

  //   waitsFor(function() { return done; }, 'Set initial data', TEST_TIMEOUT);

  //   var loaded = false;

  //   runs(function() {
  //     done = false;
  //     reader.child('b/d').on('value', function(snap) {
  //       expect(snap.val()).to.equal(4);
  //     });
  //     reader.limitToLast(2).on('value', function(snap) {
  //       var val = snap.val();
  //       if (TESTS.equals(val, {b: {d: 4}, c: 3})) {
  //         loaded = true;
  //       } else if (TESTS.equals(val, {c: 3, a: 1})) {
  //         done = true;
  //       }
  //     });
  //   });

  //   waitsFor(function() { return loaded; }, 'Wait for limit to load', TEST_TIMEOUT);

  //   runs(function() {
  //     writer.child('a').setWithPriority(1, 40);
  //   });

  //   waitsFor(function() { return done; }, 'Wait for limit to be updated', TEST_TIMEOUT);
  // });

  // it('Integer keys behave numerically 1.', function() {
  //   var ref = <Reference>getRandomNode();
  //   var done;
  //   ref.set({1: true, 50: true, 550: true, 6: true, 600: true, 70: true, 8: true, 80: true }, function() {
  //     ref.startAt(null, '80').once('value', function(s) {
  //       expect(s.val()).to.equal({80: true, 550: true, 600: true });
  //       done = true;
  //     });
  //   });
  //   waitsFor(function() { return done; }, 'Query to return', TEST_TIMEOUT);
  // });

  // it('Integer keys behave numerically 2.', function() {
  //   var ref = <Reference>getRandomNode();
  //   var done;
  //   ref.set({1: true, 50: true, 550: true, 6: true, 600: true, 70: true, 8: true, 80: true }, function() {
  //     ref.endAt(null, '50').once('value', function(s) {
  //       expect(s.val()).to.equal({1: true, 6: true, 8: true, 50: true });
  //       done = true;
  //     });
  //   });
  //   waitsFor(function() { return done; }, 'Query to return', TEST_TIMEOUT);
  // });

  // it('Integer keys behave numerically 3.', function() {
  //   var ref = <Reference>getRandomNode();
  //   var done;
  //   ref.set({1: true, 50: true, 550: true, 6: true, 600: true, 70: true, 8: true, 80: true}, function() {
  //     ref.startAt(null, '50').endAt(null, '80').once('value', function(s) {
  //       expect(s.val()).to.equal({50: true, 70: true, 80: true });
  //       done = true;
  //     });
  //   });
  //   waitsFor(function() { return done; }, 'Query to return', TEST_TIMEOUT);
  // });

  // it('.limitToLast() on node with priority.', function() {
  //   var ref = <Reference>getRandomNode();
  //   var done = false;
  //   runs(function() {
  //     ref.set({'a': 'blah', '.priority': 'priority'}, function() {
  //       ref.limitToLast(2).once('value', function(s) {
  //         expect(s.exportVal()).to.equal({a: 'blah' });
  //         done = true;
  //       });
  //     });
  //   });

  //   waitsFor(function() { return done; }, 'Once() to finish', TEST_TIMEOUT);
  // });

  // it('.equalTo works', function() {
  //   var ref = <Reference>getRandomNode();
  //   var done = false;

  //   runs(function() {
  //     ref.set({
  //       a: 1,
  //       b: {'.priority': 2, '.value': 2},
  //       c: {'.priority': '3', '.value': 3}
  //     }, function(error) {
  //       expect(error).toBeNull();
  //       done = true;
  //     });
  //   });

  //   waitsFor(function() { return done; }, 'Initial data set', TEST_TIMEOUT);

  //   runs(function() {
  //     done = false;
  //     ref.equalTo(2).once('value', function(snap) {
  //       var val = snap.exportVal();
  //       expect(val).to.equal({b: {'.priority': 2, '.value': 2}});
  //       done = true;
  //     });
  //   });

  //   waitsFor(function() { return done; }, 'Got snapshot', TEST_TIMEOUT);

  //   runs(function() {
  //     done = false;
  //     ref.equalTo('3', 'c').once('value', function(snap) {
  //       var val = snap.exportVal();
  //       expect(val).to.equal({c: {'.priority': '3', '.value': 3}});
  //       done = true;
  //     });
  //   });

  //   waitsFor(function() { return done; }, 'Got snapshot', TEST_TIMEOUT);

  //   runs(function() {
  //     done = false;
  //     ref.equalTo(null, 'c').once('value', function(snap) {
  //       var val = snap.exportVal();
  //       expect(val).toBeNull();
  //       done = true;
  //     });
  //   });

  //   waitsFor(function() { return done; }, 'Got snapshot', TEST_TIMEOUT);
  // });

  // it('Handles fallback for orderBy', function() {
  //   var ref = <Reference>getRandomNode();
  //   var done = false;

  //   runs(function() {
  //     // Set initial data
  //     ref.set({
  //       a: {foo: 3},
  //       b: {foo: 1},
  //       c: {foo: 2}
  //     }, function() {
  //       done = true;
  //     });
  //   });

  //   waitsFor(function() { return done; }, 'Set initial data', TEST_TIMEOUT);

  //   var children = [];
  //   runs(function() {
  //     done = false;
  //     ref.orderByChild('foo').on('child_added', function(snap) {
  //       children.push(snap.key);
  //       done = (children.length === 3);
  //     });
  //   });

  //   waitsFor(function() { return done; }, 'Get all the children', TEST_TIMEOUT);

  //   runs(function() {
  //     expect(children).to.equal(['b', 'c', 'a']);
  //   });
  // });

  // it("Get notified of deletes that happen while offline.", function() {
  //   var refPair = getRandomNode(2);
  //   var queryRef = refPair[0];
  //   var writerRef = refPair[1];
  //   var readSnapshot = null;

  //   // Write 3 children and then start our limit query.
  //   writerRef.set({a: 1, b: 2, c: 3}, function() {
  //     queryRef.limitToLast(3).on('value', function(s) { readSnapshot = s; });
  //   });

  //   // Wait for us to read the 3 children.
  //   waitsFor(function() { return readSnapshot != null; }, "initial data", TEST_TIMEOUT);
  //   runs(function() {
  //     expect(readSnapshot.val()).to.equal({a: 1, b: 2, c: 3 });

  //     queryRef.database.goOffline();

  //     // Delete an item in the query and then bring our connection back up.
  //     writerRef.child('b').remove(function() {
  //       queryRef.database.goOnline();
  //     });

  //     // Now wait for us to get notified that b is deleted.
  //   });
  //   waitsFor(function() { return readSnapshot.child('b').val() == null; }, "b to be deleted", TEST_TIMEOUT);
  // });

  it('Snapshot children respect default ordering', function(done) {
    var refPair = getRandomNode(2);
    var queryRef = refPair[0], writerRef = refPair[1];

    var list = {
      'a': {
        thisvaluefirst: { '.value': true, '.priority': 1 },
        name: { '.value': 'Michael', '.priority': 2 },
        thisvaluelast: { '.value': true, '.priority': 3 }
      },
      'b': {
        thisvaluefirst: { '.value': true, '.priority': null },
        name: { '.value': 'Rob', '.priority': 2 },
        thisvaluelast: { '.value': true, '.priority': 3 }
      },
      'c': {
        thisvaluefirst: { '.value': true, '.priority': 1 },
        name: { '.value': 'Jonny', '.priority': 2 },
        thisvaluelast: { '.value': true, '.priority': 'somestring' }
      }
    };

    writerRef.set(list, function() {
      queryRef.orderByChild('name').once('value', function(snap) {
        var expectedKeys = ['thisvaluefirst', 'name', 'thisvaluelast'];
        var expectedNames = ['Jonny', 'Michael', 'Rob'];


        // Validate that snap.child() resets order to default for child snaps
        var orderedKeys = [];
        snap.child('b').forEach(function(childSnap) {
          orderedKeys.push(childSnap.key);
        });
        expect(orderedKeys).to.equal(expectedKeys);

        // Validate that snap.forEach() resets ordering to default for child snaps
        var orderedNames = [];
        snap.forEach(function(childSnap) {
          orderedNames.push(childSnap.child('name').val());
          var orderedKeys = [];
          childSnap.forEach(function(grandchildSnap) {
            orderedKeys.push(grandchildSnap.key);
          });
          expect(orderedKeys).to.equal(['thisvaluefirst', 'name', 'thisvaluelast']);
        });
        expect(orderedNames).to.equal(expectedNames);
        done();
      });
    });
  });

  it('Adding listens for the same paths does not check fail', function(done) {
    // This bug manifests itself if there's a hierarchy of query listener, default listener and one-time listener
    // underneath. During one-time listener registration, sync-tree traversal stopped as soon as it found a complete
    // server cache (this is the case for not indexed query view). The problem is that the same traversal was
    // looking for a ancestor default view, and the early exit prevented from finding the default listener above the
    // one-time listener. Event removal code path wasn't removing the listener because it stopped as soon as it
    // found the default view. This left the zombie one-time listener and check failed on the second attempt to
    // create a listener for the same path (asana#61028598952586).
    var ref = getRandomNode(1)[0];

    ref.child('child').set({name: "John"}, function() {
      ref.orderByChild('name').equalTo('John').on('value', function(snap) {
        ref.child('child').on('value', function(snap) {
          ref.child('child').child('favoriteToy').once('value', function (snap) {
            ref.child('child').child('favoriteToy').once('value', function (snap) {
              done();
            });
          });
        });
      });
    });
  });

  it('Can JSON serialize refs', function() {
    var ref = <Reference>getRandomNode();
    expect(JSON.stringify(ref)).to.equal('"' + ref.toString() + '"');
  });
});
