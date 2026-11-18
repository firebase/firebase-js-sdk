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

import { EventAccumulatorFactory } from '../../database/test/helpers/EventAccumulator';
import { Reference } from '../src/api/Reference';

import { getRandomNode } from './helpers/util';

describe('.orderBy tests', () => {
  // TODO: setup spy on console.warn

  const clearRef = getRandomNode() as Reference;

  it('Snapshots are iterated in order', () => {
    const ref = getRandomNode() as Reference;

    const initial = {
      alex: { nuggets: 60 },
      rob: { nuggets: 56 },
      vassili: { nuggets: 55.5 },
      tony: { nuggets: 52 },
      greg: { nuggets: 52 }
    };

    const expectedOrder = ['greg', 'tony', 'vassili', 'rob', 'alex'];
    const expectedPrevNames = [null, 'greg', 'tony', 'vassili', 'rob'];

    const valueOrder = [];
    const addedOrder = [];
    const addedPrevNames = [];

    const orderedRef = ref.orderByChild('nuggets');

    orderedRef.on('value', snap => {
      snap.forEach(childSnap => {
        valueOrder.push(childSnap.key);
      });
    });

    orderedRef.on('child_added', (snap, prevName) => {
      addedOrder.push(snap.key);
      addedPrevNames.push(prevName);
    });

    ref.set(initial);

    expect(addedOrder).toEqual(expectedOrder);
    expect(valueOrder).toEqual(expectedOrder);
    expect(addedPrevNames).toEqual(expectedPrevNames);
  });

  it('Snapshots are iterated in order for value', () => {
    const ref = getRandomNode() as Reference;

    const initial = {
      alex: 60,
      rob: 56,
      vassili: 55.5,
      tony: 52,
      greg: 52
    };

    const expectedOrder = ['greg', 'tony', 'vassili', 'rob', 'alex'];
    const expectedPrevNames = [null, 'greg', 'tony', 'vassili', 'rob'];

    const valueOrder = [];
    const addedOrder = [];
    const addedPrevNames = [];

    const orderedRef = ref.orderByValue();

    orderedRef.on('value', snap => {
      snap.forEach(childSnap => {
        valueOrder.push(childSnap.key);
      });
    });

    orderedRef.on('child_added', (snap, prevName) => {
      addedOrder.push(snap.key);
      addedPrevNames.push(prevName);
    });

    ref.set(initial);

    expect(addedOrder).toEqual(expectedOrder);
    expect(valueOrder).toEqual(expectedOrder);
    expect(addedPrevNames).toEqual(expectedPrevNames);
  });

  it('Fires child_moved events', () => {
    const ref = getRandomNode() as Reference;

    const initial = {
      alex: { nuggets: 60 },
      rob: { nuggets: 56 },
      vassili: { nuggets: 55.5 },
      tony: { nuggets: 52 },
      greg: { nuggets: 52 }
    };

    const orderedRef = ref.orderByChild('nuggets');

    let moved = false;
    orderedRef.on('child_moved', (snap, prevName) => {
      moved = true;
      expect(snap.key).toBe('greg');
      expect(prevName).toBe('rob');
      expect(snap.val()).toEqual({ nuggets: 57 });
    });

    ref.set(initial);
    ref.child('greg/nuggets').set(57);
    expect(moved).toBe(true);
  });

  it('Callback removal works', async () => {
    const ref = getRandomNode() as Reference;

    let reads = 0;
    const ea = EventAccumulatorFactory.waitsForCount(4);

    const fooCb = ref.orderByChild('foo').on('value', () => {
      reads++;
      ea.addEvent();
    });
    const barCb = ref.orderByChild('bar').on('value', () => {
      reads++;
      ea.addEvent();
    });
    const bazCb = ref.orderByChild('baz').on('value', () => {
      reads++;
      ea.addEvent();
    });
    ref.on('value', () => {
      reads++;
      ea.addEvent();
    });

    ref.set(1);

    await ea.promise;

    ref.off('value', fooCb);
    ref.set(2);
    expect(reads).toBe(7);

    // Should be a no-op, resulting in 3 more reads
    ref.orderByChild('foo').off('value', bazCb);
    ref.set(3);
    expect(reads).toBe(10);

    ref.orderByChild('bar').off('value');
    ref.set(4);
    expect(reads).toBe(12);

    // Now, remove everything
    ref.off();
    ref.set(5);
    expect(reads).toBe(12);
  });

  it('child_added events are in the correct order', () => {
    const ref = getRandomNode() as Reference;

    const initial = {
      a: { value: 5 },
      c: { value: 3 }
    };

    const added = [];
    ref.orderByChild('value').on('child_added', snap => {
      added.push(snap.key);
    });
    ref.set(initial);

    expect(added).toEqual(['c', 'a']);

    ref.update({
      b: { value: 4 },
      d: { value: 2 }
    });

    expect(added).toEqual(['c', 'a', 'd', 'b']);
  });

  it('Can use key index', async () => {
    const ref = getRandomNode() as Reference;

    const data = {
      a: { '.priority': 10, '.value': 'a' },
      b: { '.priority': 5, '.value': 'b' },
      c: { '.priority': 20, '.value': 'c' },
      d: { '.priority': 7, '.value': 'd' },
      e: { '.priority': 30, '.value': 'e' },
      f: { '.priority': 8, '.value': 'f' }
    };

    await ref.set(data);

    const snap = await ref.orderByKey().startAt('c').once('value');

    let keys = [];
    snap.forEach(child => {
      keys.push(child.key);
    });
    expect(keys).toEqual(['c', 'd', 'e', 'f']);

    const ea = EventAccumulatorFactory.waitsForCount(5);
    keys = [];

    ref
      .orderByKey()
      .limitToLast(5)
      .on('child_added', child => {
        keys.push(child.key);
        ea.addEvent();
      });

    await ea.promise;

    ref.orderByKey().off();
    expect(keys).toEqual(['b', 'c', 'd', 'e', 'f']);
  });

  it('Queries work on leaf nodes', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const ref = getRandomNode() as Reference;

      ref.set('leaf-node', () => {
        ref
          .orderByChild('foo')
          .limitToLast(1)
          .on('value', snap => {
            expect(snap.val()).toBeNull();
            done();
          });
      });
    }));

  it('Updates for unindexed queries work', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const refs = getRandomNode(2) as Reference[];
      const reader = refs[0];
      const writer = refs[1];

      const value = {
        one: { index: 1, value: 'one' },
        two: { index: 2, value: 'two' },
        three: { index: 3, value: 'three' }
      };

      let count = 0;

      writer.set(value, () => {
        reader
          .orderByChild('index')
          .limitToLast(2)
          .on('value', snap => {
            if (count === 0) {
              expect(snap.val()).toEqual({
                two: { index: 2, value: 'two' },
                three: { index: 3, value: 'three' }
              });
              // update child which should trigger value event
              writer.child('one/index').set(4);
            } else if (count === 1) {
              expect(snap.val()).toEqual({
                three: { index: 3, value: 'three' },
                one: { index: 4, value: 'one' }
              });
              done();
            }
            count++;
          });
      });
    }));

  it('Server respects KeyIndex', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const refs = getRandomNode(2) as Reference[];
      const reader = refs[0];
      const writer = refs[1];

      const initial = {
        a: 1,
        b: 2,
        c: 3
      };

      const expected = ['b', 'c'];

      const actual = [];

      const orderedRef = reader.orderByKey().startAt('b').limitToFirst(2);
      writer.set(initial, () => {
        orderedRef.on('value', snap => {
          snap.forEach(childSnap => {
            actual.push(childSnap.key);
          });
          expect(actual).toEqual(expected);
          done();
        });
      });
    }));

  it('startAt/endAt works on value index', () => {
    const ref = getRandomNode() as Reference;

    const initial = {
      alex: 60,
      rob: 56,
      vassili: 55.5,
      tony: 52,
      greg: 52
    };

    const expectedOrder = ['tony', 'vassili', 'rob'];
    const expectedPrevNames = [null, 'tony', 'vassili'];

    const valueOrder = [];
    const addedOrder = [];
    const addedPrevNames = [];

    const orderedRef = ref.orderByValue().startAt(52, 'tony').endAt(59);

    orderedRef.on('value', snap => {
      snap.forEach(childSnap => {
        valueOrder.push(childSnap.key);
      });
    });

    orderedRef.on('child_added', (snap, prevName) => {
      addedOrder.push(snap.key);
      addedPrevNames.push(prevName);
    });

    ref.set(initial);

    expect(addedOrder).toEqual(expectedOrder);
    expect(valueOrder).toEqual(expectedOrder);
    expect(addedPrevNames).toEqual(expectedPrevNames);
  });

  it('startAfter / endAt works on value index', () => {
    const ref = getRandomNode() as Reference;

    const initial = {
      alex: 60,
      rob: 56,
      vassili: 55.5,
      tony: 52,
      greg: 52
    };

    const expectedOrder = ['vassili', 'rob'];
    const expectedPrevNames = [null, 'vassili'];

    const valueOrder = [];
    const addedOrder = [];
    const addedPrevNames = [];

    const orderedRef = ref.orderByValue().startAfter(52, 'tony').endAt(59);

    orderedRef.on('value', snap => {
      snap.forEach(childSnap => {
        valueOrder.push(childSnap.key);
      });
    });

    orderedRef.on('child_added', (snap, prevName) => {
      addedOrder.push(snap.key);
      addedPrevNames.push(prevName);
    });

    ref.set(initial);

    expect(addedOrder).toEqual(expectedOrder);
    expect(valueOrder).toEqual(expectedOrder);
    expect(addedPrevNames).toEqual(expectedPrevNames);
  });

  it('startAt / endBefore works on value index', () => {
    const ref = getRandomNode() as Reference;

    const initial = {
      alex: 60,
      rob: 56,
      vassili: 55.5,
      tony: 52,
      greg: 52
    };

    const expectedOrder = ['tony', 'vassili', 'rob'];
    const expectedPrevNames = [null, 'tony', 'vassili'];

    const valueOrder = [];
    const addedOrder = [];
    const addedPrevNames = [];

    const orderedRef = ref.orderByValue().startAt(52, 'tony').endBefore(60);

    orderedRef.on('value', snap => {
      snap.forEach(childSnap => {
        valueOrder.push(childSnap.key);
      });
    });

    orderedRef.on('child_added', (snap, prevName) => {
      addedOrder.push(snap.key);
      addedPrevNames.push(prevName);
    });

    ref.set(initial);

    expect(addedOrder).toEqual(expectedOrder);
    expect(valueOrder).toEqual(expectedOrder);
    expect(addedPrevNames).toEqual(expectedPrevNames);
  });

  it('startAfter / endBefore works on value index', () => {
    const ref = getRandomNode() as Reference;

    const initial = {
      alex: 60,
      rob: 56,
      vassili: 55.5,
      tony: 52,
      greg: 52
    };

    const expectedOrder = ['vassili', 'rob'];
    const expectedPrevNames = [null, 'vassili'];

    const valueOrder = [];
    const addedOrder = [];
    const addedPrevNames = [];

    const orderedRef = ref.orderByValue().startAfter(52, 'tony').endBefore(60);

    orderedRef.on('value', snap => {
      snap.forEach(childSnap => {
        valueOrder.push(childSnap.key);
      });
    });

    orderedRef.on('child_added', (snap, prevName) => {
      addedOrder.push(snap.key);
      addedPrevNames.push(prevName);
    });

    ref.set(initial);

    expect(addedOrder).toEqual(expectedOrder);
    expect(valueOrder).toEqual(expectedOrder);
    expect(addedPrevNames).toEqual(expectedPrevNames);
  });

  it('Removing default listener removes non-default listener that loads all data', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const ref = getRandomNode() as Reference;

      const initial = { key: 'value' };
      ref.set(initial, err => {
        expect(err).toBeNull();
        ref.orderByKey().on('value', () => {});
        ref.on('value', () => {});
        // Should remove both listener and should remove the listen sent to the server
        ref.off();

        // This used to crash because a listener for ref.orderByKey() existed already
        ref.orderByKey().once('value', snap => {
          expect(snap.val()).toEqual(initial);
          done();
        });
      });
    }));

  it('Can define and use an deep index', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const ref = getRandomNode() as Reference;

      const initial = {
        alex: { deep: { nuggets: 60 } },
        rob: { deep: { nuggets: 56 } },
        vassili: { deep: { nuggets: 55.5 } },
        tony: { deep: { nuggets: 52 } },
        greg: { deep: { nuggets: 52 } }
      };

      const expectedOrder = ['greg', 'tony', 'vassili'];
      const expectedPrevNames = [null, 'greg', 'tony'];

      const valueOrder = [];
      const addedOrder = [];
      const addedPrevNames = [];

      const orderedRef = ref.orderByChild('deep/nuggets').limitToFirst(3);

      // come before value event
      orderedRef.on('child_added', (snap, prevName) => {
        addedOrder.push(snap.key);
        addedPrevNames.push(prevName);
      });

      orderedRef.once('value', snap => {
        snap.forEach(childSnap => {
          valueOrder.push(childSnap.key);
        });
      });

      ref.set(initial, err => {
        expect(err).toBeNull();
        expect(addedOrder).toEqual(expectedOrder);
        expect(valueOrder).toEqual(expectedOrder);
        expect(addedPrevNames).toEqual(expectedPrevNames);
        done();
      });
    }));
});
