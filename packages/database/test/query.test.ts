/**
 * @license
 * Copyright 2017 Google Inc.
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

import { expect } from 'chai';
import { Reference } from '../src/api/Reference';
import { Query } from '../src/api/Query';
import '../src/core/snap/ChildrenNode';
import { getRandomNode, getPath, pause } from './helpers/util';
import {
  EventAccumulator,
  EventAccumulatorFactory
} from './helpers/EventAccumulator';

const _ = require('lodash');

type TaskList = [Query, any][];

describe('Query Tests', function() {
  // Little helper class for testing event callbacks w/ contexts.
  const EventReceiver = function() {
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
    const path = getRandomNode() as Reference;

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
    path.orderByChild('child');
    path.orderByChild('child/deep/path');
    path.orderByValue();
    path.orderByPriority();
  });

  it('Exposes database as read-only property', function() {
    const path = getRandomNode() as Reference;
    const child = path.child('child');

    const db = path.database;
    const dbChild = child.database;

    expect(db).to.equal(dbChild);
    /**
     * TS throws an error here (as is expected)
     * casting to any to allow the code to run
     */
    expect(() => ((path as any).database = "can't overwrite")).to.throw();
    expect(path.database).to.equal(db);
  });

  it('Invalid queries throw', function() {
    const path = getRandomNode() as Reference;

    /**
     * Because we are testing invalid queries, I am casting
     * to `any` to avoid the typechecking error. This can
     * occur when a user uses the SDK through a pure JS
     * client, rather than typescript
     */
    expect(function() {
      (path as any).limitToLast();
    }).to.throw();
    expect(function() {
      (path as any).limitToLast('100');
    }).to.throw();
    expect(function() {
      (path as any).limitToLast({ x: 5 });
    }).to.throw();
    expect(function() {
      path.limitToLast(100).limitToLast(100);
    }).to.throw();
    expect(function() {
      path.limitToLast(100).limitToFirst(100);
    }).to.throw();
    expect(function() {
      path.limitToLast(100).limitToLast(100);
    }).to.throw();
    expect(function() {
      path.limitToFirst(100).limitToLast(100);
    }).to.throw();
    expect(function() {
      path.limitToFirst(100).limitToFirst(100);
    }).to.throw();
    expect(function() {
      path.limitToFirst(100).limitToLast(100);
    }).to.throw();
    expect(function() {
      path.limitToLast(100).limitToLast(100);
    }).to.throw();
    expect(function() {
      path.limitToLast(100).limitToFirst(100);
    }).to.throw();
    expect(function() {
      path.limitToLast(100).limitToLast(100);
    }).to.throw();
    expect(function() {
      path.orderByPriority().orderByPriority();
    }).to.throw();
    expect(function() {
      path.orderByPriority().orderByKey();
    }).to.throw();
    expect(function() {
      path.orderByPriority().orderByChild('foo');
    }).to.throw();
    expect(function() {
      path.orderByPriority().startAt(true);
    }).to.throw();
    expect(function() {
      path.orderByPriority().endAt(false);
    }).to.throw();
    expect(function() {
      path.orderByPriority().equalTo(true);
    }).to.throw();
    expect(function() {
      path.orderByKey().orderByPriority();
    }).to.throw();
    expect(function() {
      path.orderByKey().orderByKey();
    }).to.throw();
    expect(function() {
      path.orderByKey().orderByChild('foo');
    }).to.throw();
    expect(function() {
      path.orderByChild('foo').orderByPriority();
    }).to.throw();
    expect(function() {
      path.orderByChild('foo').orderByKey();
    }).to.throw();
    expect(function() {
      path.orderByChild('foo').orderByChild('foo');
    }).to.throw();
    expect(function() {
      (path as any).orderByChild('foo').startAt({ a: 1 });
    }).to.throw();
    expect(function() {
      (path as any).orderByChild('foo').endAt({ a: 1 });
    }).to.throw();
    expect(function() {
      (path as any).orderByChild('foo').equalTo({ a: 1 });
    }).to.throw();
    expect(function() {
      path.startAt('foo').startAt('foo');
    }).to.throw();
    expect(function() {
      path.startAt('foo').equalTo('foo');
    }).to.throw();
    expect(function() {
      path.endAt('foo').endAt('foo');
    }).to.throw();
    expect(function() {
      path.endAt('foo').equalTo('foo');
    }).to.throw();
    expect(function() {
      path.equalTo('foo').startAt('foo');
    }).to.throw();
    expect(function() {
      path.equalTo('foo').endAt('foo');
    }).to.throw();
    expect(function() {
      path.equalTo('foo').equalTo('foo');
    }).to.throw();
    expect(function() {
      path.orderByKey().startAt('foo', 'foo');
    }).to.throw();
    expect(function() {
      path.orderByKey().endAt('foo', 'foo');
    }).to.throw();
    expect(function() {
      path.orderByKey().equalTo('foo', 'foo');
    }).to.throw();
    expect(function() {
      path.orderByKey().startAt(1);
    }).to.throw();
    expect(function() {
      path.orderByKey().startAt(true);
    }).to.throw();
    expect(function() {
      path.orderByKey().startAt(null);
    }).to.throw();
    expect(function() {
      path.orderByKey().endAt(1);
    }).to.throw();
    expect(function() {
      path.orderByKey().endAt(true);
    }).to.throw();
    expect(function() {
      path.orderByKey().endAt(null);
    }).to.throw();
    expect(function() {
      path.orderByKey().equalTo(1);
    }).to.throw();
    expect(function() {
      path.orderByKey().equalTo(true);
    }).to.throw();
    expect(function() {
      path.orderByKey().equalTo(null);
    }).to.throw();
    expect(function() {
      path.startAt('foo', 'foo').orderByKey();
    }).to.throw();
    expect(function() {
      path.endAt('foo', 'foo').orderByKey();
    }).to.throw();
    expect(function() {
      path.equalTo('foo', 'foo').orderByKey();
    }).to.throw();
    expect(function() {
      path.startAt(1).orderByKey();
    }).to.throw();
    expect(function() {
      path.startAt(true).orderByKey();
    }).to.throw();
    expect(function() {
      path.endAt(1).orderByKey();
    }).to.throw();
    expect(function() {
      path.endAt(true).orderByKey();
    }).to.throw();
  });

  it('can produce a valid ref', function() {
    const path = getRandomNode() as Reference;

    const query = path.limitToLast(1);
    const ref = query.ref;

    expect(ref.toString()).to.equal(path.toString());
  });

  it('Passing invalidKeys to startAt / endAt throws.', function() {
    const f = getRandomNode() as Reference;
    const badKeys = [
      '.test',
      'test.',
      'fo$o',
      '[what',
      'ever]',
      'ha#sh',
      '/thing',
      'th/ing',
      'thing/'
    ];
    // Changed from basic array iteration to avoid closure issues accessing mutable state
    _.each(badKeys, function(badKey) {
      expect(function() {
        f.startAt(null, badKey);
      }).to.throw();
      expect(function() {
        f.endAt(null, badKey);
      }).to.throw();
    });
  });

  it('Passing invalid paths to orderBy throws', function() {
    const ref = getRandomNode() as Reference;
    expect(function() {
      ref.orderByChild('$child/foo');
    }).to.throw();
    expect(function() {
      ref.orderByChild('$key');
    }).to.throw();
    expect(function() {
      ref.orderByChild('$priority');
    }).to.throw();
  });

  it('Query.queryIdentifier works.', function() {
    const path = getRandomNode() as Reference;
    const queryId = function(query) {
      return query.queryIdentifier(query);
    };

    expect(queryId(path)).to.equal('default');

    expect(queryId(path.startAt('pri', 'name'))).to.equal(
      '{"sn":"name","sp":"pri"}'
    );
    expect(queryId(path.startAt('spri').endAt('epri'))).to.equal(
      '{"ep":"epri","sp":"spri"}'
    );
    expect(
      queryId(path.startAt('spri', 'sname').endAt('epri', 'ename'))
    ).to.equal('{"en":"ename","ep":"epri","sn":"sname","sp":"spri"}');
    expect(queryId(path.startAt('pri').limitToFirst(100))).to.equal(
      '{"l":100,"sp":"pri","vf":"l"}'
    );
    expect(queryId(path.startAt('bar').orderByChild('foo'))).to.equal(
      '{"i":"foo","sp":"bar"}'
    );
  });

  it('Passing invalid queries to isEqual throws', function() {
    const ref = getRandomNode() as Reference;
    expect(function() {
      (ref as any).isEqual();
    }).to.throw();
    expect(function() {
      (ref as any).isEqual('');
    }).to.throw();
    expect(function() {
      (ref as any).isEqual('foo');
    }).to.throw();
    expect(function() {
      (ref as any).isEqual({});
    }).to.throw();
    expect(function() {
      (ref as any).isEqual([]);
    }).to.throw();
    expect(function() {
      (ref as any).isEqual(0);
    }).to.throw();
    expect(function() {
      (ref as any).isEqual(1);
    }).to.throw();
    expect(function() {
      (ref as any).isEqual(NaN);
    }).to.throw();
    expect(function() {
      ref.isEqual(null);
    }).to.throw();
    expect(function() {
      (ref as any).isEqual({ a: 1 });
    }).to.throw();
    expect(function() {
      (ref as any).isEqual(ref, 'extra');
    }).to.throw();
  });

  it('Query.isEqual works.', function() {
    const path = getRandomNode() as Reference;
    const rootRef = path.root;
    const childRef = rootRef.child('child');

    // Equivalent refs
    expect(path.isEqual(path), 'Query.isEqual - 1').to.be.true;
    expect(rootRef.isEqual(rootRef), 'Query.isEqual - 2').to.be.true;
    expect(rootRef.isEqual(childRef.parent), 'Query.isEqual - 3').to.be.true;
    expect(rootRef.child('child').isEqual(childRef), 'Query.isEqual - 4').to.be
      .true;

    // Refs with different repos
    // NOTE: getFreshRepo() no longer takes a hostname, so this test needs to be reworked.
    // Same in info.test.ts.
    // var rootRefDifferentRepo = TESTS.getFreshRepo(TEST_ALT_NAMESPACE);
    // rootRefDifferentRepo.database.goOffline();

    // expect(rootRef.isEqual(rootRefDifferentRepo), 'Query.isEqual - 5').to.be.false;
    // expect(childRef.isEqual(rootRefDifferentRepo.child('child')), 'Query.isEqual - 6').to.be.false;

    // Refs with different paths
    expect(rootRef.isEqual(childRef), 'Query.isEqual - 7').to.be.false;
    expect(childRef.isEqual(rootRef.child('otherChild')), 'Query.isEqual - 8')
      .to.be.false;

    const childQueryLast25 = childRef.limitToLast(25);
    const childQueryOrderedByKey = childRef.orderByKey();
    const childQueryOrderedByPriority = childRef.orderByPriority();
    const childQueryOrderedByTimestamp = childRef.orderByChild('timestamp');
    const childQueryStartAt1 = childQueryOrderedByTimestamp.startAt(1);
    const childQueryStartAt2 = childQueryOrderedByTimestamp.startAt(2);
    const childQueryEndAt2 = childQueryOrderedByTimestamp.endAt(2);
    const childQueryStartAt1EndAt2 = childQueryOrderedByTimestamp
      .startAt(1)
      .endAt(2);

    // Equivalent queries
    expect(childRef.isEqual(childQueryLast25.ref), 'Query.isEqual - 9').to.be
      .true;
    expect(
      childQueryLast25.isEqual(childRef.limitToLast(25)),
      'Query.isEqual - 10'
    ).to.be.true;
    expect(
      childQueryStartAt1EndAt2.isEqual(
        childQueryOrderedByTimestamp.startAt(1).endAt(2)
      ),
      'Query.isEqual - 11'
    ).to.be.true;

    // Non-equivalent queries
    expect(childQueryLast25.isEqual(childRef), 'Query.isEqual - 12').to.be
      .false;
    expect(
      childQueryLast25.isEqual(childQueryOrderedByKey),
      'Query.isEqual - 13'
    ).to.be.false;
    expect(
      childQueryLast25.isEqual(childQueryOrderedByPriority),
      'Query.isEqual - 14'
    ).to.be.false;
    expect(
      childQueryLast25.isEqual(childQueryOrderedByTimestamp),
      'Query.isEqual - 15'
    ).to.be.false;
    expect(
      childQueryOrderedByKey.isEqual(childQueryOrderedByPriority),
      'Query.isEqual - 16'
    ).to.be.false;
    expect(
      childQueryOrderedByKey.isEqual(childQueryOrderedByTimestamp),
      'Query.isEqual - 17'
    ).to.be.false;
    expect(childQueryStartAt1.isEqual(childQueryStartAt2), 'Query.isEqual - 18')
      .to.be.false;
    expect(
      childQueryStartAt1.isEqual(childQueryStartAt1EndAt2),
      'Query.isEqual - 19'
    ).to.be.false;
    expect(childQueryEndAt2.isEqual(childQueryStartAt2), 'Query.isEqual - 20')
      .to.be.false;
    expect(
      childQueryEndAt2.isEqual(childQueryStartAt1EndAt2),
      'Query.isEqual - 21'
    ).to.be.false;
  });

  it('Query.off can be called on the default query.', function() {
    const path = getRandomNode() as Reference;
    let eventFired = false;

    const callback = function() {
      eventFired = true;
    };
    path.limitToLast(5).on('value', callback);

    path.set({ a: 5, b: 6 });
    expect(eventFired).to.be.true;
    eventFired = false;

    path.off('value', callback);
    path.set({ a: 6, b: 5 });
    expect(eventFired).to.be.false;
  });

  it('Query.off can be called on the specific query.', function() {
    const path = getRandomNode() as Reference;
    let eventFired = false;

    const callback = function() {
      eventFired = true;
    };
    path.limitToLast(5).on('value', callback);

    path.set({ a: 5, b: 6 });
    expect(eventFired).to.be.true;
    eventFired = false;

    path.limitToLast(5).off('value', callback);
    path.set({ a: 6, b: 5 });
    expect(eventFired).to.be.false;
  });

  it('Query.off can be called without a callback specified.', function() {
    const path = getRandomNode() as Reference;
    let eventFired = false;

    const callback1 = function() {
      eventFired = true;
    };
    const callback2 = function() {
      eventFired = true;
    };
    path.on('value', callback1);
    path.limitToLast(5).on('value', callback2);

    path.set({ a: 5, b: 6 });
    expect(eventFired).to.be.true;
    eventFired = false;

    path.off('value');
    path.set({ a: 6, b: 5 });
    expect(eventFired).to.be.false;
  });

  it('Query.off can be called without an event type or callback specified.', function() {
    const path = getRandomNode() as Reference;
    let eventFired = false;

    const callback1 = function() {
      eventFired = true;
    };
    const callback2 = function() {
      eventFired = true;
    };
    path.on('value', callback1);
    path.limitToLast(5).on('value', callback2);

    path.set({ a: 5, b: 6 });
    expect(eventFired).to.be.true;
    eventFired = false;

    path.off();
    path.set({ a: 6, b: 5 });
    expect(eventFired).to.be.false;
  });

  it('Query.off respects provided context (for value events).', function() {
    const ref = getRandomNode() as Reference;

    const a = new EventReceiver(),
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
    const ref = getRandomNode() as Reference;

    const a = new EventReceiver(),
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
    const ref = getRandomNode() as Reference;

    const a = new EventReceiver(),
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
    const ref = getRandomNode() as Reference;

    const a = new EventReceiver(),
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
    const ref = getRandomNode() as Reference;

    const a = new EventReceiver(),
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
    const node = getRandomNode() as Reference;
    let snap = null;
    node.limitToLast(5).on('value', function(s) {
      snap = s;
    });

    node.set({});
    for (let i = 0; i < 10; i++) {
      node.push().set(i);
    }

    let expected = 5;
    snap.forEach(function(child) {
      expect(child.val()).to.equal(expected);
      expected++;
    });

    expect(expected).to.equal(10);
  });

  it('Set a limit of 5, add a bunch of nodes, ensure only last 5 items are sent from server.', async function() {
    const node = getRandomNode() as Reference;
    await node.set({});

    const pushPromises = [];

    for (let i = 0; i < 10; i++) {
      let promise = node.push().set(i);
      pushPromises.push(promise);
    }

    await Promise.all(pushPromises);

    const ea = EventAccumulatorFactory.waitsForCount(1);

    node.limitToLast(5).on('value', snap => {
      ea.addEvent(snap);
    });

    const [snap] = await ea.promise;

    let expected = 5;

    snap.forEach(function(child) {
      expect(child.val()).to.equal(expected);
      expected++;
    });

    expect(expected).to.equal(10);
  });

  it('Set various limits, ensure resulting data is correct.', async function() {
    const node = getRandomNode() as Reference;

    await node.set({ a: 1, b: 2, c: 3 });

    const tasks: TaskList = [
      [node.limitToLast(1), { c: 3 }],
      [node.endAt().limitToLast(1), { c: 3 }],
      [node.limitToLast(2), { b: 2, c: 3 }],
      [node.limitToLast(3), { a: 1, b: 2, c: 3 }],
      [node.limitToLast(4), { a: 1, b: 2, c: 3 }]
    ];

    return Promise.all(
      tasks.map(async task => {
        const [query, val] = task;
        const ea = EventAccumulatorFactory.waitsForCount(1);
        query.on('value', snap => {
          ea.addEvent(snap.val());
        });
        const [newVal] = await ea.promise;
        expect(newVal).to.deep.equal(val);
      })
    );
  });

  it('Set various limits with a startAt name, ensure resulting data is correct.', async function() {
    const node = getRandomNode() as Reference;

    await node.set({ a: 1, b: 2, c: 3 });

    const tasks: TaskList = [
      [node.startAt().limitToFirst(1), { a: 1 }],
      [node.startAt(null, 'c').limitToFirst(1), { c: 3 }],
      [node.startAt(null, 'b').limitToFirst(1), { b: 2 }],
      [node.startAt(null, 'b').limitToFirst(2), { b: 2, c: 3 }],
      [node.startAt(null, 'b').limitToFirst(3), { b: 2, c: 3 }],
      [node.startAt(null, 'b').limitToLast(1), { c: 3 }],
      [node.startAt(null, 'b').limitToLast(1), { c: 3 }],
      [node.startAt(null, 'b').limitToLast(2), { b: 2, c: 3 }],
      [node.startAt(null, 'b').limitToLast(3), { b: 2, c: 3 }],
      [node.limitToFirst(1).startAt(null, 'c'), { c: 3 }],
      [node.limitToFirst(1).startAt(null, 'b'), { b: 2 }],
      [node.limitToFirst(2).startAt(null, 'b'), { b: 2, c: 3 }],
      [node.limitToFirst(3).startAt(null, 'b'), { b: 2, c: 3 }],
      [node.limitToLast(1).startAt(null, 'b'), { c: 3 }],
      [node.limitToLast(1).startAt(null, 'b'), { c: 3 }],
      [node.limitToLast(2).startAt(null, 'b'), { b: 2, c: 3 }],
      [node.limitToLast(3).startAt(null, 'b'), { b: 2, c: 3 }]
    ];

    return Promise.all(
      tasks.map(async task => {
        const [query, val] = task;
        const ea = EventAccumulatorFactory.waitsForCount(1);
        query.on('value', snap => {
          ea.addEvent(snap.val());
        });
        const [newVal] = await ea.promise;
        expect(newVal).to.deep.equal(val);
      })
    );
  });

  it('Set various limits with a endAt name, ensure resulting data is correct.', async function() {
    const node = getRandomNode() as Reference;

    await node.set({ a: 1, b: 2, c: 3 });

    const tasks: TaskList = [
      [node.endAt().limitToFirst(1), { a: 1 }],
      [node.endAt(null, 'c').limitToFirst(1), { a: 1 }],
      [node.endAt(null, 'b').limitToFirst(1), { a: 1 }],
      [node.endAt(null, 'b').limitToFirst(2), { a: 1, b: 2 }],
      [node.endAt(null, 'b').limitToFirst(3), { a: 1, b: 2 }],
      [node.endAt(null, 'c').limitToLast(1), { c: 3 }],
      [node.endAt(null, 'b').limitToLast(1), { b: 2 }],
      [node.endAt(null, 'b').limitToLast(2), { a: 1, b: 2 }],
      [node.endAt(null, 'b').limitToLast(3), { a: 1, b: 2 }],
      [node.limitToFirst(1).endAt(null, 'c'), { a: 1 }],
      [node.limitToFirst(1).endAt(null, 'b'), { a: 1 }],
      [node.limitToFirst(2).endAt(null, 'b'), { a: 1, b: 2 }],
      [node.limitToFirst(3).endAt(null, 'b'), { a: 1, b: 2 }],
      [node.limitToLast(1).endAt(null, 'c'), { c: 3 }],
      [node.limitToLast(1).endAt(null, 'b'), { b: 2 }],
      [node.limitToLast(2).endAt(null, 'b'), { a: 1, b: 2 }],
      [node.limitToLast(3).endAt(null, 'b'), { a: 1, b: 2 }]
    ];

    return Promise.all(
      tasks.map(async task => {
        const [query, val] = task;
        const ea = EventAccumulatorFactory.waitsForCount(1);
        query.on('value', snap => {
          ea.addEvent(snap.val());
        });
        const [newVal] = await ea.promise;
        expect(newVal).to.deep.equal(val);
      })
    );
  });

  it('Set various limits with a startAt name, ensure resulting data is correct from the server.', async function() {
    const node = getRandomNode() as Reference;

    await node.set({ a: 1, b: 2, c: 3 });

    const tasks: TaskList = [
      [node.startAt().limitToFirst(1), { a: 1 }],
      [node.startAt(null, 'c').limitToFirst(1), { c: 3 }],
      [node.startAt(null, 'b').limitToFirst(1), { b: 2 }],
      // NOTE: technically there is a race condition here. The limitToFirst(1) query will return a single value, which will be
      // raised for the limitToFirst(2) callback as well, if it exists already. However, once the server gets the limitToFirst(2)
      // query, it will send more data and the correct state will be returned.
      [node.startAt(null, 'b').limitToFirst(2), { b: 2, c: 3 }],
      [node.startAt(null, 'b').limitToFirst(3), { b: 2, c: 3 }]
    ];

    return Promise.all(
      tasks.map(async task => {
        const [query, val] = task;
        const ea = EventAccumulatorFactory.waitsForCount(1);
        query.on('value', snap => {
          ea.addEvent(snap.val());
        });
        const [newVal] = await ea.promise;
        expect(newVal).to.deep.equal(val);
      })
    );
  });

  it('Set limit, ensure child_removed and child_added events are fired when limit is hit.', function() {
    const node = getRandomNode() as Reference;
    let added = '',
      removed = '';
    node.limitToLast(2).on('child_added', function(snap) {
      added += snap.key + ' ';
    });
    node.limitToLast(2).on('child_removed', function(snap) {
      removed += snap.key + ' ';
    });
    node.set({ a: 1, b: 2, c: 3 });

    expect(added).to.equal('b c ');
    expect(removed).to.equal('');

    added = '';
    node.child('d').set(4);
    expect(added).to.equal('d ');
    expect(removed).to.equal('b ');
  });

  it('Set limit, ensure child_removed and child_added events are fired when limit is hit, using server data', async function() {
    const node = getRandomNode() as Reference;

    await node.set({ a: 1, b: 2, c: 3 });

    const ea = EventAccumulatorFactory.waitsForCount(2);

    let added = '',
      removed = '';
    node.limitToLast(2).on('child_added', function(snap) {
      added += snap.key + ' ';
      ea.addEvent();
    });
    node.limitToLast(2).on('child_removed', function(snap) {
      removed += snap.key + ' ';
    });

    await ea.promise;

    expect(added).to.equal('b c ');
    expect(removed).to.equal('');

    added = '';
    await node.child('d').set(4);

    expect(added).to.equal('d ');
    expect(removed).to.equal('b ');
  });

  it('Set start and limit, ensure child_removed and child_added events are fired when limit is hit.', function() {
    const node = getRandomNode() as Reference;

    let added = '',
      removed = '';
    node
      .startAt(null, 'a')
      .limitToFirst(2)
      .on('child_added', function(snap) {
        added += snap.key + ' ';
      });
    node
      .startAt(null, 'a')
      .limitToFirst(2)
      .on('child_removed', function(snap) {
        removed += snap.key + ' ';
      });
    node.set({ a: 1, b: 2, c: 3 });
    expect(added).to.equal('a b ');
    expect(removed).to.equal('');

    added = '';
    node.child('aa').set(4);
    expect(added).to.equal('aa ');
    expect(removed).to.equal('b ');
  });

  it('Set start and limit, ensure child_removed and child_added events are fired when limit is hit, using server data', async function() {
    const node = <Reference>getRandomNode();

    await node.set({ a: 1, b: 2, c: 3 });
    const ea = EventAccumulatorFactory.waitsForCount(2);

    let added = '',
      removed = '';
    node
      .startAt(null, 'a')
      .limitToFirst(2)
      .on('child_added', function(snap) {
        added += snap.key + ' ';
        ea.addEvent();
      });
    node
      .startAt(null, 'a')
      .limitToFirst(2)
      .on('child_removed', function(snap) {
        removed += snap.key + ' ';
      });

    await ea.promise;

    expect(added).to.equal('a b ');
    expect(removed).to.equal('');

    added = '';
    await node.child('aa').set(4);

    expect(added).to.equal('aa ');
    expect(removed).to.equal('b ');
  });

  it("Set start and limit, ensure child_added events are fired when limit isn't hit yet.", function() {
    const node = getRandomNode() as Reference;

    let added = '',
      removed = '';
    node
      .startAt(null, 'a')
      .limitToFirst(2)
      .on('child_added', function(snap) {
        added += snap.key + ' ';
      });
    node
      .startAt(null, 'a')
      .limitToFirst(2)
      .on('child_removed', function(snap) {
        removed += snap.key + ' ';
      });
    node.set({ c: 3 });
    expect(added).to.equal('c ');
    expect(removed).to.equal('');

    added = '';
    node.child('b').set(4);
    expect(added).to.equal('b ');
    expect(removed).to.equal('');
  });

  it("Set start and limit, ensure child_added events are fired when limit isn't hit yet, using server data", async function() {
    const node = getRandomNode() as Reference;

    await node.set({ c: 3 });

    const ea = EventAccumulatorFactory.waitsForCount(1);

    let added = '';
    let removed = '';
    node
      .startAt(null, 'a')
      .limitToFirst(2)
      .on('child_added', function(snap) {
        added += snap.key + ' ';
        ea.addEvent();
      });
    node
      .startAt(null, 'a')
      .limitToFirst(2)
      .on('child_removed', function(snap) {
        removed += snap.key + ' ';
      });

    await ea.promise;

    expect(added).to.equal('c ');
    expect(removed).to.equal('');

    added = '';
    await node.child('b').set(4);

    expect(added).to.equal('b ');
    expect(removed).to.equal('');
  });

  it('Set a limit, ensure child_removed and child_added events are fired when limit is satisfied and you remove an item.', async function() {
    const node = getRandomNode() as Reference;
    const ea = EventAccumulatorFactory.waitsForCount(1);

    let added = '',
      removed = '';
    node.limitToLast(2).on('child_added', function(snap) {
      added += snap.key + ' ';
      ea.addEvent();
    });
    node.limitToLast(2).on('child_removed', function(snap) {
      removed += snap.key + ' ';
    });
    node.set({ a: 1, b: 2, c: 3 });
    expect(added).to.equal('b c ');
    expect(removed).to.equal('');

    added = '';
    node.child('b').remove();
    expect(removed).to.equal('b ');

    await ea.promise;
  });

  it('Set a limit, ensure child_removed and child_added events are fired when limit is satisfied and you remove an item. Using server data', async function() {
    const node = getRandomNode() as Reference;

    await node.set({ a: 1, b: 2, c: 3 });

    let ea = EventAccumulatorFactory.waitsForCount(2);
    let added = '',
      removed = '';
    node.limitToLast(2).on('child_added', function(snap) {
      added += snap.key + ' ';
      ea.addEvent();
    });
    node.limitToLast(2).on('child_removed', function(snap) {
      removed += snap.key + ' ';
    });

    await ea.promise;

    expect(added).to.equal('b c ');
    expect(removed).to.equal('');

    // We are going to wait for one more event before closing
    ea = EventAccumulatorFactory.waitsForCount(1);
    added = '';
    await node.child('b').remove();

    expect(removed).to.equal('b ');

    await ea.promise;
    expect(added).to.equal('a ');
  });

  it('Set a limit, ensure child_removed events are fired when limit is satisfied, you remove an item, and there are no more.', function() {
    const node = getRandomNode() as Reference;

    let added = '',
      removed = '';
    node.limitToLast(2).on('child_added', function(snap) {
      added += snap.key + ' ';
    });
    node.limitToLast(2).on('child_removed', function(snap) {
      removed += snap.key + ' ';
    });
    node.set({ b: 2, c: 3 });
    expect(added).to.equal('b c ');
    expect(removed).to.equal('');

    added = '';
    node.child('b').remove();
    expect(added).to.equal('');
    expect(removed).to.equal('b ');
    node.child('c').remove();
    expect(removed).to.equal('b c ');
  });

  it('Set a limit, ensure child_removed events are fired when limit is satisfied, you remove an item, and there are no more. Using server data', async function() {
    const node = getRandomNode() as Reference;
    const ea = EventAccumulatorFactory.waitsForCount(2);
    let added = '';
    let removed = '';
    await node.set({ b: 2, c: 3 });

    node.limitToLast(2).on('child_added', function(snap) {
      added += snap.key + ' ';
      ea.addEvent();
    });
    node.limitToLast(2).on('child_removed', function(snap) {
      removed += snap.key + ' ';
    });

    await ea.promise;

    expect(added).to.equal('b c ');
    expect(removed).to.equal('');

    added = '';

    await node.child('b').remove();

    expect(added).to.equal('');
    expect(removed).to.equal('b ');
  });

  it('Ensure startAt / endAt with priority works.', async function() {
    const node = getRandomNode() as Reference;

    const tasks: TaskList = [
      [node.startAt('w').endAt('y'), { b: 2, c: 3, d: 4 }],
      [node.startAt('w').endAt('w'), { d: 4 }],
      [node.startAt('a').endAt('c'), null]
    ];

    await node.set({
      a: { '.value': 1, '.priority': 'z' },
      b: { '.value': 2, '.priority': 'y' },
      c: { '.value': 3, '.priority': 'x' },
      d: { '.value': 4, '.priority': 'w' }
    });

    return Promise.all(
      tasks.map(async task => {
        const [query, val] = task;
        const ea = EventAccumulatorFactory.waitsForCount(1);
        query.on('value', snap => {
          ea.addEvent(snap.val());
        });
        const [newVal] = await ea.promise;
        expect(newVal).to.deep.equal(val);
      })
    );
  });

  it('Ensure startAt / endAt with priority work with server data.', async function() {
    const node = getRandomNode() as Reference;

    await node.set({
      a: { '.value': 1, '.priority': 'z' },
      b: { '.value': 2, '.priority': 'y' },
      c: { '.value': 3, '.priority': 'x' },
      d: { '.value': 4, '.priority': 'w' }
    });

    const tasks: TaskList = [
      [node.startAt('w').endAt('y'), { b: 2, c: 3, d: 4 }],
      [node.startAt('w').endAt('w'), { d: 4 }],
      [node.startAt('a').endAt('c'), null]
    ];

    return Promise.all(
      tasks.map(async task => {
        const [query, val] = task;
        const ea = EventAccumulatorFactory.waitsForCount(1);
        query.on('value', snap => {
          ea.addEvent(snap.val());
        });
        const [newVal] = await ea.promise;
        expect(newVal).to.deep.equal(val);
      })
    );
  });

  it('Ensure startAt / endAt with priority and name works.', async function() {
    const node = getRandomNode() as Reference;

    await node.set({
      a: { '.value': 1, '.priority': 1 },
      b: { '.value': 2, '.priority': 1 },
      c: { '.value': 3, '.priority': 2 },
      d: { '.value': 4, '.priority': 2 }
    });

    const tasks: TaskList = [
      [node.startAt(1, 'a').endAt(2, 'd'), { a: 1, b: 2, c: 3, d: 4 }],
      [node.startAt(1, 'b').endAt(2, 'c'), { b: 2, c: 3 }],
      [node.startAt(1, 'c').endAt(2), { c: 3, d: 4 }]
    ];

    return Promise.all(
      tasks.map(async task => {
        const [query, val] = task;
        const ea = EventAccumulatorFactory.waitsForCount(1);
        query.on('value', snap => {
          ea.addEvent(snap.val());
        });
        const [newVal] = await ea.promise;
        expect(newVal).to.deep.equal(val);
      })
    );
  });

  it('Ensure startAt / endAt with priority and name work with server data', async function() {
    const node = getRandomNode() as Reference;

    await node.set({
      a: { '.value': 1, '.priority': 1 },
      b: { '.value': 2, '.priority': 1 },
      c: { '.value': 3, '.priority': 2 },
      d: { '.value': 4, '.priority': 2 }
    });
    const tasks: TaskList = [
      [node.startAt(1, 'a').endAt(2, 'd'), { a: 1, b: 2, c: 3, d: 4 }],
      [node.startAt(1, 'b').endAt(2, 'c'), { b: 2, c: 3 }],
      [node.startAt(1, 'c').endAt(2), { c: 3, d: 4 }]
    ];
    return Promise.all(
      tasks.map(async task => {
        const [query, val] = task;
        const ea = EventAccumulatorFactory.waitsForCount(1);
        query.on('value', snap => {
          ea.addEvent(snap.val());
        });
        const [newVal] = await ea.promise;
        expect(newVal).to.deep.equal(val);
      })
    );
  });

  it('Ensure startAt / endAt with priority and name works (2).', function() {
    const node = getRandomNode() as Reference;

    const tasks: TaskList = [
      [node.startAt(1, 'c').endAt(2, 'b'), { a: 1, b: 2, c: 3, d: 4 }],
      [node.startAt(1, 'd').endAt(2, 'a'), { d: 4, a: 1 }],
      [node.startAt(1, 'e').endAt(2), { a: 1, b: 2 }]
    ];

    node.set({
      c: { '.value': 3, '.priority': 1 },
      d: { '.value': 4, '.priority': 1 },
      a: { '.value': 1, '.priority': 2 },
      b: { '.value': 2, '.priority': 2 }
    });

    return Promise.all(
      tasks.map(async task => {
        const [query, val] = task;
        const ea = EventAccumulatorFactory.waitsForCount(1);
        query.on('value', snap => {
          ea.addEvent(snap.val());
        });
        const [newVal] = await ea.promise;
        expect(newVal).to.deep.equal(val);
      })
    );
  });

  it('Ensure startAt / endAt with priority and name works (2). With server data', async function() {
    const node = getRandomNode() as Reference;

    await node.set({
      c: { '.value': 3, '.priority': 1 },
      d: { '.value': 4, '.priority': 1 },
      a: { '.value': 1, '.priority': 2 },
      b: { '.value': 2, '.priority': 2 }
    });

    const tasks: TaskList = [
      [node.startAt(1, 'c').endAt(2, 'b'), { a: 1, b: 2, c: 3, d: 4 }],
      [node.startAt(1, 'd').endAt(2, 'a'), { d: 4, a: 1 }],
      [node.startAt(1, 'e').endAt(2), { a: 1, b: 2 }]
    ];

    return Promise.all(
      tasks.map(async task => {
        const [query, val] = task;
        const ea = EventAccumulatorFactory.waitsForCount(1);
        query.on('value', snap => {
          ea.addEvent(snap.val());
        });
        const [newVal] = await ea.promise;
        expect(newVal).to.deep.equal(val);
      })
    );
  });

  it('Set a limit, add some nodes, ensure prevName works correctly.', function() {
    const node = getRandomNode() as Reference;

    let added = '';
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

  it('Set a limit, add some nodes, ensure prevName works correctly. With server data', async function() {
    const node = getRandomNode() as Reference;

    let added = '';
    await node.child('a').set(1);

    const ea = EventAccumulatorFactory.waitsForCount(1);
    node.limitToLast(2).on('child_added', function(snap, prevName) {
      added += snap.key + ' ' + prevName + ', ';
      ea.addEvent();
    });

    await ea.promise;

    expect(added).to.equal('a null, ');

    added = '';
    await node.child('c').set(3);

    expect(added).to.equal('c a, ');

    added = '';
    await node.child('b').set(2);

    expect(added).to.equal('b null, ');

    added = '';
    await node.child('d').set(4);

    expect(added).to.equal('d c, ');
  });

  it('Set a limit, move some nodes, ensure prevName works correctly.', function() {
    const node = getRandomNode() as Reference;
    let moved = '';
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

  it('Set a limit, move some nodes, ensure prevName works correctly, with server data', async function() {
    const node = getRandomNode() as Reference;
    let moved = '';

    node.child('a').setWithPriority('a', 10);
    node.child('b').setWithPriority('b', 20);
    node.child('c').setWithPriority('c', 30);
    await node.child('d').setWithPriority('d', 40);

    node.limitToLast(2).on('child_moved', async function(snap, prevName) {
      moved += snap.key + ' ' + prevName + ', ';
    });
    // Need to load the data before the set so we'll see the move
    await node.limitToLast(2).once('value');

    await node.child('c').setPriority(50);

    expect(moved).to.equal('c d, ');

    moved = '';
    await node.child('c').setPriority(35);

    expect(moved).to.equal('c null, ');
    moved = '';
    await node.child('b').setPriority(33);

    expect(moved).to.equal('');
  });

  it('Numeric priorities: Set a limit, move some nodes, ensure prevName works correctly.', function() {
    const node = getRandomNode() as Reference;

    let moved = '';
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

  it('Numeric priorities: Set a limit, move some nodes, ensure prevName works correctly. With server data', async function() {
    const node = getRandomNode() as Reference;
    let moved = '';

    node.child('a').setWithPriority('a', 1);
    node.child('b').setWithPriority('b', 2);
    node.child('c').setWithPriority('c', 3);
    await node.child('d').setWithPriority('d', 4);

    node.limitToLast(2).on('child_moved', function(snap, prevName) {
      moved += snap.key + ' ' + prevName + ', ';
    });
    // Need to load the data before the set so we'll see the move
    await node.limitToLast(2).once('value');

    await node.child('c').setPriority(10);

    expect(moved).to.equal('c d, ');
  });

  it('Set a limit, add a bunch of nodes, ensure local events are correct.', function() {
    const node = getRandomNode() as Reference;
    node.set({});
    let eventHistory = '';

    node.limitToLast(2).on('child_added', function(snap) {
      eventHistory = eventHistory + snap.val() + ' added, ';
    });
    node.limitToLast(2).on('child_removed', function(snap) {
      eventHistory = eventHistory + snap.val() + ' removed, ';
    });

    for (let i = 0; i < 5; i++) {
      const n = node.push();
      n.set(i);
    }

    expect(eventHistory).to.equal(
      '0 added, 1 added, 0 removed, 2 added, 1 removed, 3 added, 2 removed, 4 added, '
    );
  });

  it('Set a limit, add a bunch of nodes, ensure remote events are correct.', async function() {
    const nodePair = getRandomNode(2);
    const writeNode = nodePair[0];
    const readNode = nodePair[1];
    const ea = new EventAccumulator(() => {
      try {
        expect(eventHistory).to.equal('3 added, 4 added, ');
        return true;
      } catch (err) {
        return false;
      }
    });
    let eventHistory = '';

    readNode.limitToLast(2).on('child_added', function(snap) {
      eventHistory = eventHistory + snap.val() + ' added, ';
      ea.addEvent();
    });
    readNode.limitToLast(2).on('child_removed', function(snap) {
      eventHistory = eventHistory.replace(snap.val() + ' added, ', '');
      /**
       * This test expects this code NOT to fire, so by adding this
       * I trigger the resolve early if it happens to fire and fail
       * the expect at the end
       */
      ea.addEvent();
    });

    const promises = [];
    for (let i = 0; i < 5; i++) {
      const n = writeNode.push();
      n.set(i);
    }

    await ea.promise;
  });

  it('Ensure on() returns callback function.', function() {
    const node = getRandomNode() as Reference;
    const callback = function() {};
    const ret = node.on('value', callback);
    expect(ret).to.equal(callback);
  });

  it("Limit on unsynced node fires 'value'.", function(done) {
    const f = getRandomNode() as Reference;
    f.limitToLast(1).on('value', function() {
      done();
    });
  });

  it('Filtering to only null priorities works.', async function() {
    const f = getRandomNode() as Reference;

    const ea = EventAccumulatorFactory.waitsForCount(1);
    f.root.child('.info/connected').on('value', function(snap) {
      ea.addEvent();
    });

    await ea.promise;

    f.set({
      a: { '.priority': null, '.value': 0 },
      b: { '.priority': null, '.value': 1 },
      c: { '.priority': '2', '.value': 2 },
      d: { '.priority': 3, '.value': 3 },
      e: { '.priority': 'hi', '.value': 4 }
    });

    const snapAcc = EventAccumulatorFactory.waitsForCount(1);
    f.startAt(null)
      .endAt(null)
      .on('value', snap => {
        snapAcc.addEvent(snap.val());
      });

    const [val] = await snapAcc.promise;
    expect(val).to.deep.equal({ a: 0, b: 1 });
  });

  it('null priorities included in endAt(2).', async function() {
    const f = getRandomNode() as Reference;

    f.set({
      a: { '.priority': null, '.value': 0 },
      b: { '.priority': null, '.value': 1 },
      c: { '.priority': 2, '.value': 2 },
      d: { '.priority': 3, '.value': 3 },
      e: { '.priority': 'hi', '.value': 4 }
    });

    const ea = EventAccumulatorFactory.waitsForCount(1);
    f.endAt(2).on('value', snap => {
      ea.addEvent(snap.val());
    });

    const [val] = await ea.promise;
    expect(val).to.deep.equal({ a: 0, b: 1, c: 2 });
  });

  it('null priorities not included in startAt(2).', async function() {
    const f = getRandomNode() as Reference;

    f.set({
      a: { '.priority': null, '.value': 0 },
      b: { '.priority': null, '.value': 1 },
      c: { '.priority': 2, '.value': 2 },
      d: { '.priority': 3, '.value': 3 },
      e: { '.priority': 'hi', '.value': 4 }
    });

    const ea = EventAccumulatorFactory.waitsForCount(1);

    f.startAt(2).on('value', snap => {
      ea.addEvent(snap.val());
    });

    const [val] = await ea.promise;
    expect(val).to.deep.equal({ c: 2, d: 3, e: 4 });
  });

  function dumpListens(node: Query) {
    const listens: Map<string, Map<string, unknown>> = (node.repo
      .persistentConnection_ as any).listens;
    const nodePath = getPath(node);
    const listenPaths = [];
    for (let path of listens.keys()) {
      if (path.substring(0, nodePath.length) === nodePath) {
        listenPaths.push(path);
      }
    }

    listenPaths.sort();
    const dumpPieces = [];
    for (let i = 0; i < listenPaths.length; i++) {
      const queryIds = [];
      for (let queryId of listens.get(listenPaths[i]).keys()) {
        queryIds.push(queryId);
      }
      queryIds.sort();
      if (queryIds.length > 0) {
        dumpPieces.push(
          listenPaths[i].substring(nodePath.length) + ':' + queryIds.join(',')
        );
      }
    }

    return dumpPieces.join(';');
  }

  it('Dedupe listens: listen on parent.', function() {
    const node = getRandomNode() as Reference;
    expect(dumpListens(node)).to.equal('');

    const aOn = node.child('a').on('value', function() {});
    expect(dumpListens(node)).to.equal('/a:default');

    const rootOn = node.on('value', function() {});
    expect(dumpListens(node)).to.equal(':default');

    node.off('value', rootOn);
    expect(dumpListens(node)).to.equal('/a:default');

    node.child('a').off('value', aOn);
    expect(dumpListens(node)).to.equal('');
  });

  it('Dedupe listens: listen on grandchild.', function() {
    const node = getRandomNode() as Reference;

    const rootOn = node.on('value', function() {});
    expect(dumpListens(node)).to.equal(':default');

    const aaOn = node.child('a/aa').on('value', function() {});
    expect(dumpListens(node)).to.equal(':default');

    node.off('value', rootOn);
    node.child('a/aa').off('value', aaOn);
    expect(dumpListens(node)).to.equal('');
  });

  it('Dedupe listens: listen on grandparent of two children.', function() {
    const node = getRandomNode() as Reference;
    expect(dumpListens(node)).to.equal('');

    const aaOn = node.child('a/aa').on('value', function() {});
    expect(dumpListens(node)).to.equal('/a/aa:default');

    const bbOn = node.child('a/bb').on('value', function() {});
    expect(dumpListens(node)).to.equal('/a/aa:default;/a/bb:default');

    const rootOn = node.on('value', function() {});
    expect(dumpListens(node)).to.equal(':default');

    node.off('value', rootOn);
    expect(dumpListens(node)).to.equal('/a/aa:default;/a/bb:default');

    node.child('a/aa').off('value', aaOn);
    expect(dumpListens(node)).to.equal('/a/bb:default');

    node.child('a/bb').off('value', bbOn);
    expect(dumpListens(node)).to.equal('');
  });

  it('Dedupe queried listens: multiple queried listens; no dupes', function() {
    const node = getRandomNode() as Reference;
    expect(dumpListens(node)).to.equal('');

    const aLim1On = node
      .child('a')
      .limitToLast(1)
      .on('value', function() {});
    expect(dumpListens(node)).to.equal('/a:{"l":1,"vf":"r"}');

    const rootLim1On = node.limitToLast(1).on('value', function() {});
    expect(dumpListens(node)).to.equal(':{"l":1,"vf":"r"};/a:{"l":1,"vf":"r"}');

    const aLim5On = node
      .child('a')
      .limitToLast(5)
      .on('value', function() {});
    expect(dumpListens(node)).to.equal(
      ':{"l":1,"vf":"r"};/a:{"l":1,"vf":"r"},{"l":5,"vf":"r"}'
    );

    node.limitToLast(1).off('value', rootLim1On);
    expect(dumpListens(node)).to.equal('/a:{"l":1,"vf":"r"},{"l":5,"vf":"r"}');

    node
      .child('a')
      .limitToLast(1)
      .off('value', aLim1On);
    node
      .child('a')
      .limitToLast(5)
      .off('value', aLim5On);
    expect(dumpListens(node)).to.equal('');
  });

  it('Dedupe queried listens: listen on parent of queried children.', function() {
    const node = getRandomNode() as Reference;

    const aLim1On = node
      .child('a')
      .limitToLast(1)
      .on('value', function() {});
    expect(dumpListens(node)).to.equal('/a:{"l":1,"vf":"r"}');

    const bLim1On = node
      .child('b')
      .limitToLast(1)
      .on('value', function() {});
    expect(dumpListens(node)).to.equal(
      '/a:{"l":1,"vf":"r"};/b:{"l":1,"vf":"r"}'
    );

    const rootOn = node.on('value', function() {});
    expect(dumpListens(node)).to.equal(':default');

    // remove in slightly random order.
    node
      .child('a')
      .limitToLast(1)
      .off('value', aLim1On);
    expect(dumpListens(node)).to.equal(':default');

    node.off('value', rootOn);
    expect(dumpListens(node)).to.equal('/b:{"l":1,"vf":"r"}');

    node
      .child('b')
      .limitToLast(1)
      .off('value', bLim1On);
    expect(dumpListens(node)).to.equal('');
  });

  it('Limit with mix of null and non-null priorities.', function() {
    const node = getRandomNode() as Reference;

    const children = [];
    node.limitToLast(5).on('child_added', function(childSnap) {
      children.push(childSnap.key);
    });

    node.set({
      Vikrum: { '.priority': 1000, score: 1000, name: 'Vikrum' },
      Mike: { '.priority': 500, score: 500, name: 'Mike' },
      Andrew: { '.priority': 50, score: 50, name: 'Andrew' },
      James: { '.priority': 7, score: 7, name: 'James' },
      Sally: { '.priority': -7, score: -7, name: 'Sally' },
      Fred: { score: 0, name: 'Fred' }
    });

    expect(children.join(',')).to.equal('Sally,James,Andrew,Mike,Vikrum');
  });

  it('Limit with mix of null and non-null priorities using server data', async function() {
    const node = <Reference>getRandomNode();

    const children = [];
    await node.set({
      Vikrum: { '.priority': 1000, score: 1000, name: 'Vikrum' },
      Mike: { '.priority': 500, score: 500, name: 'Mike' },
      Andrew: { '.priority': 50, score: 50, name: 'Andrew' },
      James: { '.priority': 7, score: 7, name: 'James' },
      Sally: { '.priority': -7, score: -7, name: 'Sally' },
      Fred: { score: 0, name: 'Fred' }
    });

    const ea = EventAccumulatorFactory.waitsForCount(5);
    node.limitToLast(5).on('child_added', function(childSnap) {
      children.push(childSnap.key);
      ea.addEvent();
    });

    await ea.promise;

    expect(children.join(',')).to.equal('Sally,James,Andrew,Mike,Vikrum');
  });

  it('.on() with a context works.', function() {
    const ref = getRandomNode() as Reference;

    const ListenerDoohickey = function() {
      this.snap = null;
    };
    ListenerDoohickey.prototype.onEvent = function(snap) {
      this.snap = snap;
    };

    const l = new ListenerDoohickey();
    ref.on('value', l.onEvent, l);

    ref.set('test');
    expect(l.snap.val()).to.equal('test');

    ref.off('value', l.onEvent, l);

    // Ensure we don't get any more events.
    ref.set('blah');
    expect(l.snap.val()).to.equal('test');
  });

  it('.once() with a context works.', function() {
    const ref = getRandomNode() as Reference;

    const ListenerDoohickey = function() {
      this.snap = null;
    };
    ListenerDoohickey.prototype.onEvent = function(snap) {
      this.snap = snap;
    };

    const l = new ListenerDoohickey();
    ref.once('value', l.onEvent, l);

    ref.set('test');
    expect(l.snap.val()).to.equal('test');

    // Shouldn't get any more events.
    ref.set('blah');
    expect(l.snap.val()).to.equal('test');
  });

  it('handles an update that deletes the entire window in a query', function() {
    const ref = getRandomNode() as Reference;

    const snaps = [];
    ref.limitToLast(2).on('value', function(snap) {
      snaps.push(snap.val());
    });

    ref.set({
      a: { '.value': 1, '.priority': 1 },
      b: { '.value': 2, '.priority': 2 },
      c: { '.value': 3, '.priority': 3 }
    });
    ref.update({
      b: null,
      c: null
    });

    expect(snaps.length).to.equal(2);
    expect(snaps[0]).to.deep.equal({ b: 2, c: 3 });
    // The original set is still outstanding (synchronous API), so we have a full cache to re-window against
    expect(snaps[1]).to.deep.equal({ a: 1 });
  });

  it('handles an out-of-view query on a child', function() {
    const ref = getRandomNode() as Reference;

    let parent = null;
    ref.limitToLast(1).on('value', function(snap) {
      parent = snap.val();
    });

    let child = null;
    ref.child('a').on('value', function(snap) {
      child = snap.val();
    });

    ref.set({ a: 1, b: 2 });
    expect(parent).to.deep.equal({ b: 2 });
    expect(child).to.equal(1);

    ref.update({ c: 3 });
    expect(parent).to.deep.equal({ c: 3 });
    expect(child).to.equal(1);
  });

  it('handles a child query going out of view of the parent', function() {
    const ref = getRandomNode() as Reference;

    let parent = null;
    ref.limitToLast(1).on('value', function(snap) {
      parent = snap.val();
    });

    let child = null;
    ref.child('a').on('value', function(snap) {
      child = snap.val();
    });

    ref.set({ a: 1 });
    expect(parent).to.deep.equal({ a: 1 });
    expect(child).to.equal(1);
    ref.child('b').set(2);
    expect(parent).to.deep.equal({ b: 2 });
    expect(child).to.equal(1);
    ref.child('b').remove();
    expect(parent).to.deep.equal({ a: 1 });
    expect(child).to.equal(1);
  });

  it('handles diverging views', function() {
    const ref = getRandomNode() as Reference;

    let c = null;
    ref
      .limitToLast(1)
      .endAt(null, 'c')
      .on('value', function(snap) {
        c = snap.val();
      });

    let d = null;
    ref
      .limitToLast(1)
      .endAt(null, 'd')
      .on('value', function(snap) {
        d = snap.val();
      });

    ref.set({ a: 1, b: 2, c: 3 });
    expect(c).to.deep.equal({ c: 3 });
    expect(d).to.deep.equal({ c: 3 });
    ref.child('d').set(4);
    expect(c).to.deep.equal({ c: 3 });
    expect(d).to.deep.equal({ d: 4 });
  });

  it('handles removing a queried element', async function() {
    const ref = getRandomNode() as Reference;

    let val;
    const ea = EventAccumulatorFactory.waitsForCount(1);
    ref.limitToLast(1).on('child_added', function(snap) {
      val = snap.val();
      ea.addEvent();
    });

    ref.set({ a: 1, b: 2 });
    expect(val).to.equal(2);

    ref.child('b').remove();

    await ea.promise;

    expect(val).to.equal(1);
  });

  it('.startAt().limitToFirst(1) works.', function(done) {
    const ref = getRandomNode() as Reference;
    ref.set({ a: 1, b: 2 });

    let val;
    ref
      .startAt()
      .limitToFirst(1)
      .on('child_added', function(snap) {
        val = snap.val();
        if (val === 1) {
          done();
        }
      });
  });

  it('.startAt().limitToFirst(1) and then remove first child (case 1664).', async function() {
    const ref = getRandomNode() as Reference;
    ref.set({ a: 1, b: 2 });

    const ea = EventAccumulatorFactory.waitsForCount(1);
    let val;
    ref
      .startAt()
      .limitToFirst(1)
      .on('child_added', function(snap) {
        val = snap.val();
        ea.addEvent();
      });

    await ea.promise;
    expect(val).to.equal(1);

    ea.reset();
    ref.child('a').remove();

    await ea.promise;
    expect(val).to.equal(2);
  });

  it('.startAt() with two arguments works properly (case 1169).', function(done) {
    const ref = getRandomNode() as Reference;
    const data = {
      Walker: {
        name: 'Walker',
        score: 20,
        '.priority': 20
      },
      Michael: {
        name: 'Michael',
        score: 100,
        '.priority': 100
      }
    };
    ref.set(data, function() {
      ref
        .startAt(20, 'Walker')
        .limitToFirst(2)
        .on('value', function(s) {
          const childNames = [];
          s.forEach(function(node) {
            childNames.push(node.key);
          });
          expect(childNames).to.deep.equal(['Walker', 'Michael']);
          done();
        });
    });
  });

  it('handles multiple queries on the same node', async function() {
    const ref = getRandomNode() as Reference;

    await ref.set({
      a: 1,
      b: 2,
      c: 3,
      d: 4,
      e: 5,
      f: 6
    });

    const ea = EventAccumulatorFactory.waitsForCount(1);

    let firstListen = false;
    ref.limitToLast(2).on('value', function(snap) {
      // This shouldn't get called twice, we don't update the values here
      expect(firstListen).to.be.false;
      firstListen = true;
      ea.addEvent();
    });

    await ea.promise;

    // now do consecutive once calls
    await ref.limitToLast(1).once('value');
    const snap = await ref.limitToLast(1).once('value');
    const val = snap.val();
    expect(val).to.deep.equal({ f: 6 });
  });

  it('handles once called on a node with a default listener', async function() {
    const ref = getRandomNode() as Reference;

    await ref.set({
      a: 1,
      b: 2,
      c: 3,
      d: 4,
      e: 5,
      f: 6
    });

    const ea = EventAccumulatorFactory.waitsForCount(1);
    // Setup value listener
    ref.on('value', function(snap) {
      ea.addEvent();
    });

    await ea.promise;

    // now do the once call
    const snap = await ref.limitToLast(1).once('child_added');
    const val = snap.val();
    expect(val).to.equal(6);
  });

  it('handles once called on a node with a default listener and non-complete limit', async function() {
    const ref = <Reference>getRandomNode();

    await ref.set({
      a: 1,
      b: 2,
      c: 3
    });

    const ea = EventAccumulatorFactory.waitsForCount(1);
    // Setup value listener
    ref.on('value', function(snap) {
      ea.addEvent();
    });

    await ea.promise;

    // now do the once call
    const snap = await ref.limitToLast(5).once('value');
    const val = snap.val();
    expect(val).to.deep.equal({ a: 1, b: 2, c: 3 });
  });

  it('Remote remove triggers events.', function(done) {
    const refPair = getRandomNode(2),
      writeRef = refPair[0],
      readRef = refPair[1];

    writeRef.set({ a: 'a', b: 'b', c: 'c', d: 'd', e: 'e' }, function() {
      // Wait to get the initial data, and then remove 'c' remotely and wait for new data.
      let count = 0;
      readRef.limitToLast(5).on('value', function(s) {
        count++;
        if (count == 1) {
          expect(s.val()).to.deep.equal({
            a: 'a',
            b: 'b',
            c: 'c',
            d: 'd',
            e: 'e'
          });
          writeRef.child('c').remove();
        } else {
          expect(count).to.equal(2);
          expect(s.val()).to.deep.equal({ a: 'a', b: 'b', d: 'd', e: 'e' });
          done();
        }
      });
    });
  });

  it(".endAt(null, 'f').limitToLast(5) returns the right set of children.", function(done) {
    const ref = getRandomNode() as Reference;
    ref.set(
      { a: 'a', b: 'b', c: 'c', d: 'd', e: 'e', f: 'f', g: 'g', h: 'h' },
      function() {
        ref
          .endAt(null, 'f')
          .limitToLast(5)
          .on('value', function(s) {
            expect(s.val()).to.deep.equal({
              b: 'b',
              c: 'c',
              d: 'd',
              e: 'e',
              f: 'f'
            });
            done();
          });
      }
    );
  });

  it('complex update() at query root raises correct value event', function(done) {
    const nodePair = getRandomNode(2);
    const writer = nodePair[0];
    const reader = nodePair[1];

    let readerLoaded = false,
      numEventsReceived = 0;
    writer
      .child('foo')
      .set({ a: 1, b: 2, c: 3, d: 4, e: 5 }, function(error, dummy) {
        reader
          .child('foo')
          .startAt()
          .limitToFirst(4)
          .on('value', function(snapshot) {
            const val = snapshot.val();
            if (!readerLoaded) {
              readerLoaded = true;
              expect(val).to.deep.equal({ a: 1, b: 2, c: 3, d: 4 });

              // This update causes the following to happen:
              // 1. An in-view child is set to null (b)
              // 2. An in-view child has its value changed (c)
              // 3. An in-view child is changed and bumped out-of-view (d)
              // We expect to get null values for b and d, along with the new children and updated value for c
              writer
                .child('foo')
                .update({ b: null, c: 'a', cc: 'new', cd: 'new2', d: 'gone' });
            } else {
              done();
              expect(val).to.deep.equal({
                a: 1,
                c: 'a',
                cc: 'new',
                cd: 'new2'
              });
            }
          });
      });
  });

  it('update() at query root raises correct value event', function(done) {
    const nodePair = getRandomNode(2);
    const writer = nodePair[0];
    const reader = nodePair[1];

    let readerLoaded = false,
      numEventsReceived = 0;
    writer
      .child('foo')
      .set({ bar: 'a', baz: 'b', bam: 'c' }, function(error, dummy) {
        reader
          .child('foo')
          .limitToLast(10)
          .on('value', function(snapshot) {
            const val = snapshot.val();
            if (!readerLoaded) {
              readerLoaded = true;
              expect(val.bar).to.equal('a');
              expect(val.baz).to.equal('b');
              expect(val.bam).to.equal('c');
              writer.child('foo').update({ bar: 'd', bam: null, bat: 'e' });
            } else {
              expect(val.bar).to.equal('d');
              expect(val.baz).to.equal('b');
              expect(val.bat).to.equal('e');
              expect(val.bam).to.equal(undefined);
              done();
            }
          });
      });
  });

  it('set() at query root raises correct value event', function(done) {
    const nodePair = getRandomNode(2);
    const writer = nodePair[0];
    const reader = nodePair[1];

    let readerLoaded = false,
      numEventsReceived = 0;
    writer
      .child('foo')
      .set({ bar: 'a', baz: 'b', bam: 'c' }, function(error, dummy) {
        reader
          .child('foo')
          .limitToLast(10)
          .on('value', function(snapshot) {
            const val = snapshot.val();
            if (!readerLoaded) {
              readerLoaded = true;
              expect(val.bar).to.equal('a');
              expect(val.baz).to.equal('b');
              expect(val.bam).to.equal('c');
              writer.child('foo').set({ bar: 'd', baz: 'b', bat: 'e' });
            } else {
              expect(val.bar).to.equal('d');
              expect(val.baz).to.equal('b');
              expect(val.bat).to.equal('e');
              expect(val.bam).to.equal(undefined);
              done();
            }
          });
      });
  });

  it('listen for child_added events with limit and different types fires properly', function(done) {
    const nodePair = getRandomNode(2);
    const writer = nodePair[0];
    const reader = nodePair[1];

    let numEventsReceived = 0,
      gotA = false,
      gotB = false,
      gotC = false;
    writer.child('a').set(1, function(error, dummy) {
      writer.child('b').set('b', function(error, dummy) {
        writer
          .child('c')
          .set({ deep: 'path', of: { stuff: true } }, function(error, dummy) {
            reader.limitToLast(3).on('child_added', function(snap) {
              const val = snap.val();
              switch (snap.key) {
                case 'a':
                  gotA = true;
                  expect(val).to.equal(1);
                  break;
                case 'b':
                  gotB = true;
                  expect(val).to.equal('b');
                  break;
                case 'c':
                  gotC = true;
                  expect(val.deep).to.equal('path');
                  expect(val.of.stuff).to.be.true;
                  break;
                default:
                  expect(false).to.be.true;
              }
              numEventsReceived += 1;
              expect(numEventsReceived).to.be.lessThan(4);
              if (gotA && gotB && gotC) done();
            });
          });
      });
    });
  });

  it('listen for child_changed events with limit and different types fires properly', function(done) {
    const nodePair = getRandomNode(2);
    const writer = nodePair[0];
    const reader = nodePair[1];

    let numEventsReceived = 0,
      gotA = false,
      gotB = false,
      gotC = false,
      readerLoaded = false;
    writer.set({ a: 'something', b: "we'll", c: 'overwrite ' }, function(
      error,
      dummy
    ) {
      reader.limitToLast(3).on('value', function(snapshot) {
        if (!readerLoaded) {
          readerLoaded = true;
          // Set up listener for upcoming change events
          reader.limitToLast(3).on('child_changed', function(snap) {
            const val = snap.val();
            switch (snap.key) {
              case 'a':
                gotA = true;
                expect(val).to.equal(1);
                break;
              case 'b':
                gotB = true;
                expect(val).to.equal('b');
                break;
              case 'c':
                gotC = true;
                expect(val.deep).to.equal('path');
                expect(val.of.stuff).to.be.true;
                break;
              default:
                expect(false).to.be.true;
            }
            numEventsReceived += 1;
            expect(numEventsReceived).to.be.lessThan(4);
            if (gotA && gotB && gotC) done();
          });

          // Begin changing every key
          writer.child('a').set(1);
          writer.child('b').set('b');
          writer.child('c').set({ deep: 'path', of: { stuff: true } });
        }
      });
    });
  });

  it('listen for child_remove events with limit and different types fires properly', function(done) {
    const nodePair = getRandomNode(2);
    const writer = nodePair[0];
    const reader = nodePair[1];

    let numEventsReceived = 0,
      gotA = false,
      gotB = false,
      gotC = false,
      readerLoaded = false;
    writer.set(
      { a: 1, b: 'b', c: { deep: 'path', of: { stuff: true } } },
      function(error, dummy) {
        reader.limitToLast(3).on('value', function(snapshot) {
          if (!readerLoaded) {
            readerLoaded = true;

            // Set up listener for upcoming change events
            reader.limitToLast(3).on('child_removed', function(snap) {
              const val = snap.val();
              switch (snap.key) {
                case 'a':
                  gotA = true;
                  expect(val).to.equal(1);
                  break;
                case 'b':
                  gotB = true;
                  expect(val).to.equal('b');
                  break;
                case 'c':
                  gotC = true;
                  expect(val.deep).to.equal('path');
                  expect(val.of.stuff).to.be.true;
                  break;
                default:
                  expect(false).to.be.true;
              }
              numEventsReceived += 1;
              expect(numEventsReceived).to.be.lessThan(4);
              if (gotA && gotB && gotC) done();
            });

            // Begin removing every key
            writer.child('a').remove();
            writer.child('b').remove();
            writer.child('c').remove();
          }
        });
      }
    );
  });

  it('listen for child_remove events when parent removed', function(done) {
    const nodePair = getRandomNode(2);
    const writer = nodePair[0];
    const reader = nodePair[1];

    let numEventsReceived = 0,
      gotA = false,
      gotB = false,
      gotC = false,
      readerLoaded = false;
    writer.set(
      { a: 1, b: 'b', c: { deep: 'path', of: { stuff: true } } },
      function(error, dummy) {
        reader.limitToLast(3).on('value', function(snapshot) {
          if (!readerLoaded) {
            readerLoaded = true;

            // Set up listener for upcoming change events
            reader.limitToLast(3).on('child_removed', function(snap) {
              const val = snap.val();
              switch (snap.key) {
                case 'a':
                  gotA = true;
                  expect(val).to.equal(1);
                  break;
                case 'b':
                  gotB = true;
                  expect(val).to.equal('b');
                  break;
                case 'c':
                  gotC = true;
                  expect(val.deep).to.equal('path');
                  expect(val.of.stuff).to.be.true;
                  break;
                default:
                  expect(false).to.be.true;
              }
              numEventsReceived += 1;
              expect(numEventsReceived).to.be.lessThan(4);
              if (gotA && gotB && gotC) done();
            });

            // Remove the query parent
            writer.remove();
          }
        });
      }
    );
  });

  it('listen for child_remove events when parent set to scalar', function(done) {
    const nodePair = getRandomNode(2);
    const writer = nodePair[0];
    const reader = nodePair[1];

    let numEventsReceived = 0,
      gotA = false,
      gotB = false,
      gotC = false,
      readerLoaded = false;
    writer.set(
      { a: 1, b: 'b', c: { deep: 'path', of: { stuff: true } } },
      function(error, dummy) {
        reader.limitToLast(3).on('value', function(snapshot) {
          if (!readerLoaded) {
            readerLoaded = true;

            // Set up listener for upcoming change events
            reader.limitToLast(3).on('child_removed', function(snap) {
              const val = snap.val();
              switch (snap.key) {
                case 'a':
                  gotA = true;
                  expect(val).to.equal(1);
                  break;
                case 'b':
                  gotB = true;
                  expect(val).to.equal('b');
                  break;
                case 'c':
                  gotC = true;
                  expect(val.deep).to.equal('path');
                  expect(val.of.stuff).to.be.true;
                  break;
                default:
                  expect(false).to.be.true;
              }
              numEventsReceived += 1;
              expect(numEventsReceived).to.be.lessThan(4);
              if (gotA && gotB && gotC) done();
            });

            // Set the parent to a scalar
            writer.set('scalar');
          }
        });
      }
    );
  });

  it('Queries behave wrong after .once().', async function() {
    const refPair = getRandomNode(2),
      writeRef = refPair[0],
      readRef = refPair[1];
    let startAtCount, defaultCount;

    await writeRef.set({ a: 1, b: 2, c: 3, d: 4 });

    await readRef.once('value');

    const ea = EventAccumulatorFactory.waitsForCount(5);
    startAtCount = 0;
    readRef.startAt(null, 'd').on('child_added', function() {
      startAtCount++;
      ea.addEvent();
    });
    expect(startAtCount).to.equal(0);

    defaultCount = 0;
    readRef.on('child_added', function() {
      defaultCount++;
      ea.addEvent();
    });
    expect(defaultCount).to.equal(0);

    readRef.on('child_removed', function() {
      expect(false).to.be.true;
    });

    return ea.promise;
  });

  it('Case 2003: Correctly get events for startAt/endAt queries when priority changes.', function() {
    const ref = getRandomNode() as Reference;
    const addedFirst = [],
      removedFirst = [],
      addedSecond = [],
      removedSecond = [];
    ref
      .startAt(0)
      .endAt(10)
      .on('child_added', function(snap) {
        addedFirst.push(snap.key);
      });
    ref
      .startAt(0)
      .endAt(10)
      .on('child_removed', function(snap) {
        removedFirst.push(snap.key);
      });
    ref
      .startAt(10)
      .endAt(20)
      .on('child_added', function(snap) {
        addedSecond.push(snap.key);
      });
    ref
      .startAt(10)
      .endAt(20)
      .on('child_removed', function(snap) {
        removedSecond.push(snap.key);
      });

    ref.child('a').setWithPriority('a', 5);
    expect(addedFirst).to.deep.equal(['a']);
    ref.child('a').setWithPriority('a', 15);
    expect(removedFirst).to.deep.equal(['a']);
    expect(addedSecond).to.deep.equal(['a']);

    ref.child('a').setWithPriority('a', 10);
    expect(addedFirst).to.deep.equal(['a', 'a']);

    ref.child('a').setWithPriority('a', 5);
    expect(removedSecond).to.deep.equal(['a']);
  });

  it('Behaves with diverging queries', async function() {
    const refs = getRandomNode(2);
    const writer = refs[0];
    const reader = refs[1];

    await writer.set({
      a: { b: 1, c: 2 },
      e: 3
    });

    let childCount = 0;

    reader.child('a/b').on('value', function(snap) {
      const val = snap.val();
      childCount++;
      if (childCount == 1) {
        expect(val).to.equal(1);
      } else {
        // fail this, nothing should have changed
        expect(true).to.be.false;
      }
    });

    const ea = EventAccumulatorFactory.waitsForCount(1);
    let count = 0;
    reader.limitToLast(2).on('value', function(snap) {
      ea.addEvent();
      const val = snap.val();
      count++;
      if (count == 1) {
        expect(val).to.deep.equal({ a: { b: 1, c: 2 }, e: 3 });
      } else if (count == 2) {
        expect(val).to.deep.equal({ d: 4, e: 3 });
      }
    });

    await ea.promise;

    ea.reset();
    writer.child('d').set(4);

    return ea.promise;
  });

  it('Priority-only updates are processed correctly by server.', async function() {
    const refPair = getRandomNode(2) as Reference[],
      readRef = refPair[0],
      writeRef = refPair[1];

    const ea = EventAccumulatorFactory.waitsForCount(1);
    let readVal;
    readRef.limitToLast(2).on('value', function(s) {
      readVal = s.val();
      if (readVal) {
        ea.addEvent();
      }
    });
    writeRef.set({
      a: { '.priority': 10, '.value': 1 },
      b: { '.priority': 20, '.value': 2 },
      c: { '.priority': 30, '.value': 3 }
    });

    await ea.promise;
    expect(readVal).to.deep.equal({ b: 2, c: 3 });

    ea.reset();
    writeRef.child('a').setPriority(25);

    await ea.promise;
    expect(readVal).to.deep.equal({ a: 1, c: 3 });
  });

  it('Server: Test re-listen', function(done) {
    const refPair = getRandomNode(2) as Reference[],
      ref = refPair[0],
      ref2 = refPair[1];
    ref.set({
      a: 'a',
      b: 'b',
      c: 'c',
      d: 'd',
      e: 'e',
      f: 'f',
      g: 'g'
    });

    let before;
    ref
      .startAt(null, 'a')
      .endAt(null, 'b')
      .on('value', function(b) {
        before = b.val();
      });

    ref.child('aa').set('aa', function() {
      ref2
        .startAt(null, 'a')
        .endAt(null, 'b')
        .on('value', function(b) {
          expect(b.val()).to.deep.equal(before);
          done();
        });
    });
  });

  it('Server: Test re-listen 2', function(done) {
    const refPair = getRandomNode(2),
      ref = refPair[0],
      ref2 = refPair[1];
    ref.set({
      a: 'a',
      b: 'b',
      c: 'c',
      d: 'd',
      e: 'e',
      f: 'f',
      g: 'g'
    });

    let before;
    ref
      .startAt(null, 'b')
      .limitToFirst(3)
      .on('value', function(b) {
        before = b.val();
      });

    ref
      .child('aa')
      .update({ a: 5, aa: 4, b: 7, c: 4, d: 4, dd: 3 }, function() {
        ref2
          .startAt(null, 'b')
          .limitToFirst(3)
          .on('value', function(b) {
            expect(b.val()).to.deep.equal(before);
            done();
          });
      });
  });

  it('Server: Test re-listen 3', function(done) {
    const refPair = getRandomNode(2),
      ref = refPair[0],
      ref2 = refPair[1];
    ref.set({
      a: 'a',
      b: 'b',
      c: 'c',
      d: 'd',
      e: 'e',
      f: 'f',
      g: 'g'
    });

    let before;
    ref.limitToLast(3).on('value', function(b) {
      before = b.val();
    });

    ref.child('h').set('h', function() {
      ref2.limitToLast(3).on('value', function(b) {
        expect(b.val()).to.deep.equal(before);
        done();
      });
    });
  });

  it('Server limit below limit works properly.', async function() {
    const refPair = <Reference[]>getRandomNode(2),
      readRef = refPair[0],
      writeRef = refPair[1];
    let childData;

    await writeRef.set({
      a: {
        aa: { '.priority': 1, '.value': 1 },
        ab: { '.priority': 1, '.value': 1 }
      }
    });

    readRef.limitToLast(1).on('value', function(s) {
      expect(s.val()).to.deep.equal({ a: { aa: 1, ab: 1 } });
    });

    const ea = EventAccumulatorFactory.waitsForCount(1);
    readRef
      .child('a')
      .startAt(1)
      .endAt(1)
      .on('value', function(s) {
        childData = s.val();
        if (childData) {
          ea.addEvent();
        }
      });

    await ea.promise;
    expect(childData).to.deep.equal({ aa: 1, ab: 1 });

    // This should remove an item from the child query, but *not* the parent query.
    ea.reset();
    writeRef.child('a/ab').setWithPriority(1, 2);

    await ea.promise;

    expect(childData).to.deep.equal({ aa: 1 });
  });

  it('Server: Setting grandchild of item in limit works.', async function() {
    const refPair = getRandomNode(2),
      ref = refPair[0],
      ref2 = refPair[1];

    ref.set({
      a: {
        name: 'Mike'
      }
    });

    const ea = EventAccumulatorFactory.waitsForCount(1);
    const snaps = [];
    ref2.limitToLast(1).on('value', function(s) {
      const val = s.val();
      if (val !== null) {
        snaps.push(val);
        ea.addEvent();
      }
    });

    await ea.promise;
    expect(snaps).to.deep.equal([{ a: { name: 'Mike' } }]);

    ea.reset();
    ref.child('a/name').set('Fred');

    await ea.promise;
    expect(snaps).to.deep.equal([
      { a: { name: 'Mike' } },
      { a: { name: 'Fred' } }
    ]);
  });

  it('Server: Updating grandchildren of item in limit works.', async function() {
    const refPair = getRandomNode(2),
      ref = refPair[0],
      ref2 = refPair[1];

    ref.set({
      a: {
        name: 'Mike'
      }
    });

    const ea = EventAccumulatorFactory.waitsForCount(1);
    const snaps = [];
    ref2.limitToLast(1).on('value', function(s) {
      const val = s.val();
      if (val !== null) {
        snaps.push(val);
        ea.addEvent();
      }
    });

    /**
     * If I put this artificial pause here, this test works however
     * something about the timing is broken
     */
    await ea.promise;
    expect(snaps).to.deep.equal([{ a: { name: 'Mike' } }]);

    ea.reset();
    ref.child('a').update({ name: null, Name: 'Fred' });
    await ea.promise;

    expect(snaps).to.deep.equal([
      { a: { name: 'Mike' } },
      { a: { Name: 'Fred' } }
    ]);
  });

  it('Server: New child at end of limit shows up.', async function() {
    const refPair = getRandomNode(2),
      ref = refPair[0],
      ref2 = refPair[1];

    const ea = EventAccumulatorFactory.waitsForCount(1);
    let snap;
    ref2.limitToLast(1).on('value', function(s) {
      snap = s.val();
      ea.addEvent();
    });

    await ea.promise;
    expect(snap).to.be.null;
    ea.reset();

    ref.child('a').set('new child');

    /**
     * If I put this artificial pause here, this test works however
     * something about the timing is broken
     */
    await ea.promise;
    expect(snap).to.deep.equal({ a: 'new child' });
  });

  it('Server: Priority-only updates are processed correctly by server (1).', async function() {
    const refPair = getRandomNode(2),
      readRef = refPair[0],
      writeRef = refPair[1];

    const ea = EventAccumulatorFactory.waitsForCount(1);
    let readVal;
    readRef.limitToLast(2).on('value', function(s) {
      readVal = s.val();
      if (readVal) {
        ea.addEvent();
      }
    });
    writeRef.set({
      a: { '.priority': 10, '.value': 1 },
      b: { '.priority': 20, '.value': 2 },
      c: { '.priority': 30, '.value': 3 }
    });

    await ea.promise;
    expect(readVal).to.deep.equal({ b: 2, c: 3 });

    ea.reset();
    writeRef.child('a').setPriority(25);

    await ea.promise;
    expect(readVal).to.deep.equal({ a: 1, c: 3 });
  });

  // Same as above but with an endAt() so we hit CompoundQueryView instead of SimpleLimitView.
  it('Server: Priority-only updates are processed correctly by server (2).', async function() {
    const refPair = getRandomNode(2),
      readRef = refPair[0],
      writeRef = refPair[1];

    const ea = EventAccumulatorFactory.waitsForCount(1);
    let readVal;
    readRef
      .endAt(50)
      .limitToLast(2)
      .on('value', function(s) {
        readVal = s.val();
        if (readVal) {
          ea.addEvent();
        }
      });

    writeRef.set({
      a: { '.priority': 10, '.value': 1 },
      b: { '.priority': 20, '.value': 2 },
      c: { '.priority': 30, '.value': 3 }
    });

    await ea.promise;
    expect(readVal).to.deep.equal({ b: 2, c: 3 });

    ea.reset();
    writeRef.child('a').setPriority(25);

    await ea.promise;
    expect(readVal).to.deep.equal({ a: 1, c: 3 });
  });

  it('Latency compensation works with limit and pushed object.', function() {
    const ref = getRandomNode() as Reference;
    const events = [];
    ref.limitToLast(3).on('child_added', function(s) {
      events.push(s.val());
    });

    // If you change this to ref.push('foo') it works.
    ref.push({ a: 'foo' });

    // Should have synchronously gotten an event.
    expect(events.length).to.equal(1);
  });

  it("Cache doesn't remove items that have fallen out of view.", async function() {
    const refPair = getRandomNode(2),
      readRef = refPair[0],
      writeRef = refPair[1];

    let ea = EventAccumulatorFactory.waitsForCount(1);
    let readVal;
    readRef.limitToLast(2).on('value', function(s) {
      readVal = s.val();
      ea.addEvent();
    });

    await ea.promise;
    expect(readVal).to.be.null;

    ea = EventAccumulatorFactory.waitsForCount(4);
    for (let i = 0; i < 4; i++) {
      writeRef.child('k' + i).set(i);
    }

    await ea.promise;

    await pause(500);
    expect(readVal).to.deep.equal({ k2: 2, k3: 3 });

    ea = EventAccumulatorFactory.waitsForCount(1);
    writeRef.remove();

    await ea.promise;
    expect(readVal).to.be.null;
  });

  it('handles an update that moves another child that has a deeper listener out of view', async function() {
    const refs = getRandomNode(2);
    const reader = refs[0];
    const writer = refs[1];

    await writer.set({
      a: { '.priority': 10, '.value': 1 },
      b: { '.priority': 20, d: 4 },
      c: { '.priority': 30, '.value': 3 }
    });

    reader.child('b/d').on('value', function(snap) {
      expect(snap.val()).to.equal(4);
    });

    const ea = EventAccumulatorFactory.waitsForCount(1);
    let val;
    reader.limitToLast(2).on('value', function(snap) {
      val = snap.val();
      if (val) {
        ea.addEvent();
      }
    });

    await ea.promise;
    expect(val).to.deep.equal({ b: { d: 4 }, c: 3 });

    ea.reset();
    writer.child('a').setWithPriority(1, 40);

    await ea.promise;
    expect(val).to.deep.equal({ c: 3, a: 1 });
  });

  it('Integer keys behave numerically 1.', function(done) {
    const ref = getRandomNode() as Reference;
    ref.set(
      {
        1: true,
        50: true,
        550: true,
        6: true,
        600: true,
        70: true,
        8: true,
        80: true
      },
      function() {
        ref.startAt(null, '80').once('value', function(s) {
          expect(s.val()).to.deep.equal({ 80: true, 550: true, 600: true });
          done();
        });
      }
    );
  });

  it('Integer keys behave numerically 2.', function(done) {
    const ref = getRandomNode() as Reference;
    ref.set(
      {
        1: true,
        50: true,
        550: true,
        6: true,
        600: true,
        70: true,
        8: true,
        80: true
      },
      function() {
        ref.endAt(null, '50').once('value', function(s) {
          expect(s.val()).to.deep.equal({
            1: true,
            6: true,
            8: true,
            50: true
          });
          done();
        });
      }
    );
  });

  it('Integer keys behave numerically 3.', function(done) {
    const ref = getRandomNode() as Reference;
    ref.set(
      {
        1: true,
        50: true,
        550: true,
        6: true,
        600: true,
        70: true,
        8: true,
        80: true
      },
      function() {
        ref
          .startAt(null, '50')
          .endAt(null, '80')
          .once('value', function(s) {
            expect(s.val()).to.deep.equal({ 50: true, 70: true, 80: true });
            done();
          });
      }
    );
  });

  it('.limitToLast() on node with priority.', function(done) {
    const ref = getRandomNode() as Reference;
    ref.set({ a: 'blah', '.priority': 'priority' }, function() {
      ref.limitToLast(2).once('value', function(s) {
        expect(s.exportVal()).to.deep.equal({ a: 'blah' });
        done();
      });
    });
  });

  it('.equalTo works', async function() {
    const ref = getRandomNode() as Reference;
    const done = false;

    await ref.set({
      a: 1,
      b: { '.priority': 2, '.value': 2 },
      c: { '.priority': '3', '.value': 3 }
    });

    const snap1 = await ref.equalTo(2).once('value');
    const val1 = snap1.exportVal();
    expect(val1).to.deep.equal({ b: { '.priority': 2, '.value': 2 } });

    const snap2 = await ref.equalTo('3', 'c').once('value');

    const val2 = snap2.exportVal();
    expect(val2).to.deep.equal({ c: { '.priority': '3', '.value': 3 } });

    const snap3 = await ref.equalTo(null, 'c').once('value');
    const val3 = snap3.exportVal();
    expect(val3).to.be.null;
  });

  it('Handles fallback for orderBy', async function() {
    const ref = getRandomNode() as Reference;

    const children = [];

    ref.orderByChild('foo').on('child_added', function(snap) {
      children.push(snap.key);
    });

    // Set initial data
    await ref.set({
      a: { foo: 3 },
      b: { foo: 1 },
      c: { foo: 2 }
    });

    expect(children).to.deep.equal(['b', 'c', 'a']);
  });

  it('Get notified of deletes that happen while offline.', async function() {
    const refPair = getRandomNode(2);
    const queryRef = refPair[0];
    const writerRef = refPair[1];
    let readSnapshot = null;

    // Write 3 children and then start our limit query.
    await writerRef.set({ a: 1, b: 2, c: 3 });

    const ea = EventAccumulatorFactory.waitsForCount(1);
    queryRef.limitToLast(3).on('value', function(s) {
      readSnapshot = s;
      if (readSnapshot) {
        ea.addEvent();
      }
    });

    // Wait for us to read the 3 children.
    await ea.promise;

    expect(readSnapshot.val()).to.deep.equal({ a: 1, b: 2, c: 3 });

    queryRef.database.goOffline();

    // Delete an item in the query and then bring our connection back up.
    ea.reset();
    await writerRef.child('b').remove();
    queryRef.database.goOnline();

    await ea.promise;
    expect(readSnapshot.child('b').val()).to.be.null;
  });

  it('Snapshot children respect default ordering', function(done) {
    const refPair = getRandomNode(2);
    const queryRef = refPair[0],
      writerRef = refPair[1];

    const list = {
      a: {
        thisvaluefirst: { '.value': true, '.priority': 1 },
        name: { '.value': 'Michael', '.priority': 2 },
        thisvaluelast: { '.value': true, '.priority': 3 }
      },
      b: {
        thisvaluefirst: { '.value': true, '.priority': null },
        name: { '.value': 'Rob', '.priority': 2 },
        thisvaluelast: { '.value': true, '.priority': 3 }
      },
      c: {
        thisvaluefirst: { '.value': true, '.priority': 1 },
        name: { '.value': 'Jonny', '.priority': 2 },
        thisvaluelast: { '.value': true, '.priority': 'somestring' }
      }
    };

    writerRef.set(list, function() {
      queryRef.orderByChild('name').once('value', function(snap) {
        const expectedKeys = ['thisvaluefirst', 'name', 'thisvaluelast'];
        const expectedNames = ['Jonny', 'Michael', 'Rob'];

        // Validate that snap.child() resets order to default for child snaps
        const orderedKeys = [];
        snap.child('b').forEach(function(childSnap) {
          orderedKeys.push(childSnap.key);
        });
        expect(orderedKeys).to.deep.equal(expectedKeys);

        // Validate that snap.forEach() resets ordering to default for child snaps
        const orderedNames = [];
        snap.forEach(function(childSnap) {
          orderedNames.push(childSnap.child('name').val());
          const orderedKeys = [];
          childSnap.forEach(function(grandchildSnap) {
            orderedKeys.push(grandchildSnap.key);
          });
          expect(orderedKeys).to.deep.equal([
            'thisvaluefirst',
            'name',
            'thisvaluelast'
          ]);
        });
        expect(orderedNames).to.deep.equal(expectedNames);
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
    const ref = getRandomNode(1)[0];

    ref.child('child').set({ name: 'John' }, function() {
      ref
        .orderByChild('name')
        .equalTo('John')
        .on('value', function(snap) {
          ref.child('child').on('value', function(snap) {
            ref
              .child('child')
              .child('favoriteToy')
              .once('value', function(snap) {
                ref
                  .child('child')
                  .child('favoriteToy')
                  .once('value', function(snap) {
                    done();
                  });
              });
          });
        });
    });
  });

  it('Can JSON serialize refs', function() {
    const ref = getRandomNode() as Reference;
    expect(JSON.stringify(ref)).to.equal('"' + ref.toString() + '"');
  });
});
