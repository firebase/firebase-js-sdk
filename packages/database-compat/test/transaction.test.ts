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

import firebase from '@firebase/app-compat';
import { _TEST_ACCESS_hijackHash as hijackHash } from '@firebase/database';
import { Deferred } from '@firebase/util';

import {
  EventAccumulator,
  EventAccumulatorFactory
} from '../../database/test/helpers/EventAccumulator';
import { Reference } from '../src/api/Reference';

import { eventTestHelper } from './helpers/events';
import {
  canCreateExtraConnections,
  getFreshRepoFromReference,
  getRandomNode,
  getVal
} from './helpers/util';

import '../src/index';

describe('Transaction Tests', () => {
  // Tests that use hijackHash() should set restoreHash to the restore function
  // and be sure to call it (and set restoreHash back to null) before the test
  // exits. In the case that the test fails to do so, we'll log a warning and
  // call restoreHash() manually to ensure subsequent tests aren't affected.
  let restoreHash = null;

  afterEach(() => {
    if (restoreHash) {
      console.warn("Prior test didn't properly call restoreHash()!");
      restoreHash();
      restoreHash = null;
    }
  });

  it('New value is immediately visible.', () => {
    const node = getRandomNode() as Reference;
    node.child('foo').transaction(() => {
      return 42;
    });

    let val = null;
    node.child('foo').on('value', snap => {
      val = snap.val();
    });
    expect(val).toBe(42);
  });

  it('Event is raised for new value.', () => {
    const node = getRandomNode() as Reference;
    const fooNode = node.child('foo');
    const eventHelper = eventTestHelper([[fooNode, ['value', '']]]);

    node.child('foo').transaction(() => {
      return 42;
    });

    expect(eventHelper.waiter()).toBe(true);
  });

  it('Transaction result can be converted to JSON.', () => {
    const node = getRandomNode() as Reference;

    return node
      .transaction(() => {
        return 42;
      })
      .then(transactionResult => {
        expect(transactionResult.toJSON()).toEqual({
          committed: true,
          snapshot: 42
        });
      });
  });

  it('Non-aborted transaction sets committed to true in callback.', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const node = getRandomNode() as Reference;

      node.transaction(
        () => {
          return 42;
        },
        (error, committed, snapshot) => {
          expect(error).toBe(null);
          expect(committed).toBe(true);
          expect(snapshot.val()).toBe(42);
          done();
        }
      );
    }));

  it('Aborted transaction sets committed to false in callback.', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const node = getRandomNode() as Reference;

      node.transaction(
        () => {},
        (error, committed, snapshot) => {
          expect(error).toBe(null);
          expect(committed).toBe(false);
          expect(snapshot.val()).toBeNull();
          done();
        }
      );
    }));

  it('Tetris bug test - set data, reconnect, do transaction that aborts once data arrives, verify correct events.', async () => {
    const nodePair = getRandomNode(2) as Reference[];
    let node = nodePair[0];
    let eventsReceived = 0;
    const ea = EventAccumulatorFactory.waitsForCount(2);

    await node.child('foo').set(42);

    node = nodePair[1];
    node.child('foo').on('value', snap => {
      if (eventsReceived === 0) {
        expect(snap.val()).toBe('temp value');
      } else if (eventsReceived === 1) {
        expect(snap.val()).toBe(42);
      } else {
        // Extra event detected.
        expect(true).toBe(false);
      }
      eventsReceived++;
      ea.addEvent();
    });

    node.child('foo').transaction(
      value => {
        if (value === null) {
          return 'temp value';
        } else {
          return;
        }
      },
      (error, committed, snapshot) => {
        expect(error).toBe(null);
        expect(committed).toBe(false);
        expect(snapshot.val()).toBe(42);
      }
    );

    return ea.promise;
  });

  it('Use transaction to create a node, make sure exactly one event is received.', () => {
    const node = getRandomNode() as Reference;
    let events = 0,
      done = false;

    const ea = new EventAccumulator(() => done && events === 1);

    node.child('a').on('value', () => {
      events++;
      ea.addEvent();
      if (events > 1) {
        throw 'Expected 1 event on a, but got two.';
      }
    });

    node.child('a').transaction(
      () => {
        return 42;
      },
      () => {
        done = true;
        ea.addEvent();
      }
    );

    return ea.promise;
  });

  it(
    'Use transaction to update one of two existing child nodes. ' +
      'Make sure events are only raised for the changed node.',
    async () => {
      const nodePair = getRandomNode(2) as Reference[];
      let node = nodePair[0].child('foo');

      await Promise.all([node.child('a').set(42), node.child('b').set(42)]);

      node = nodePair[1].child('foo');
      const eventHelper = eventTestHelper([
        [node.child('a'), ['value', '']],
        [node.child('b'), ['value', '']]
      ]);

      await eventHelper.promise;

      eventHelper.addExpectedEvents([[node.child('b'), ['value', '']]]);

      const transaction = node.transaction(
        () => {
          return { a: 42, b: 87 };
        },
        (error, committed, snapshot) => {
          expect(error).toBeNull();
          expect(committed).toBe(true);
          expect(snapshot.val()).toEqual({ a: 42, b: 87 });
        }
      );

      return Promise.all([eventHelper.promise, transaction]);
    }
  );

  it('Transaction is only called once when initializing an empty node.', () => {
    const node = getRandomNode() as Reference;
    let updateCalled = 0;

    const ea = EventAccumulatorFactory.waitsForCount(1);
    node.transaction(value => {
      expect(value).toBe(null);
      updateCalled++;
      ea.addEvent();
      if (updateCalled > 1) {
        throw 'Transaction called too many times.';
      }

      if (value === null) {
        return { a: 5, b: 3 };
      }
    });

    return ea.promise;
  });

  it('Second transaction gets run immediately on previous output and only runs once.', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const nodePair = getRandomNode(2) as Reference[];
      let firstRun = false,
        firstDone = false,
        secondRun = false,
        secondDone = false;

      function onComplete() {
        if (firstDone && secondDone) {
          nodePair[1].on('value', snap => {
            expect(snap.val()).toBe(84);
            done();
          });
        }
      }

      nodePair[0].transaction(
        () => {
          expect(firstRun).toBe(false);
          firstRun = true;
          return 42;
        },
        (error, committed, snapshot) => {
          expect(error).toBe(null);
          expect(committed).toBe(true);
          firstDone = true;
          onComplete();
        }
      );
      expect(firstRun).toBe(true);

      nodePair[0].transaction(
        value => {
          expect(secondRun).toBe(false);
          secondRun = true;
          expect(value).toBe(42);
          return 84;
        },
        (error, committed, snapshot) => {
          expect(error).toBe(null);
          expect(committed).toBe(true);
          secondDone = true;
          onComplete();
        }
      );
      expect(secondRun).toBe(true);

      expect(getVal(nodePair[0])).toBe(84);
    }));

  it('Set() cancels pending transactions and re-runs affected transactions.', async () => {
    // We do 3 transactions: 1) At /foo, 2) At /, and 3) At /bar.
    // Only #1 is sent to the server immediately (since 2 depends on 1 and 3 depends on 2).
    // We set /foo to 0.
    //   Transaction #1 should complete as planned (since it was already sent).
    //   Transaction #2 should be aborted by the set.
    //   Transaction #3 should be re-run after #2 is reverted, and then be sent to the server and succeed.
    let firstDone = false,
      secondDone = false,
      thirdDone = false;
    const node = getRandomNode() as Reference;
    let nodeSnap = null;
    let nodeFooSnap = null;

    node.on('value', s => {
      const str = JSON.stringify(s.val());
      nodeSnap = s;
    });
    node.child('foo').on('value', s => {
      const str = JSON.stringify(s.val());
      nodeFooSnap = s;
    });

    let firstRun = false,
      secondRun = false,
      thirdRunCount = 0;
    const ea = new EventAccumulator(() => firstDone && thirdDone);
    node.child('foo').transaction(
      () => {
        expect(firstRun).toBe(false);
        firstRun = true;
        return 42;
      },
      (error, committed, snapshot) => {
        expect(error).toBe(null);
        expect(committed).toBe(true);
        expect(snapshot.val()).toBe(42);
        firstDone = true;
        ea.addEvent();
      }
    );
    expect(nodeFooSnap.val()).toEqual(42);

    node.transaction(
      () => {
        expect(secondRun).toBe(false);
        secondRun = true;
        return { foo: 84, bar: 1 };
      },
      (error, committed, snapshot) => {
        expect(committed).toBe(false);
        secondDone = true;
        ea.addEvent();
      }
    );
    expect(secondRun).toBe(true);
    expect(nodeSnap.val()).toEqual({ foo: 84, bar: 1 });

    node.child('bar').transaction(
      val => {
        thirdRunCount++;
        if (thirdRunCount === 1) {
          expect(val).toBe(1);
          return 'first';
        } else if (thirdRunCount === 2) {
          expect(val).toBe(null);
          return 'second';
        } else {
          throw new Error('Called too many times!');
        }
      },
      (error, committed, snapshot) => {
        expect(error).toBe(null);
        expect(committed).toBe(true);
        expect(snapshot.val()).toBe('second');
        thirdDone = true;
        ea.addEvent();
      }
    );
    expect(thirdRunCount).toBe(1);
    expect(nodeSnap.val()).toEqual({ foo: 84, bar: 'first' });

    // This rolls back the second transaction, and triggers a re-run of the third.
    // However, a new value event won't be triggered until the listener is complete,
    // so we're left with the last value event
    node.child('foo').set(0);

    expect(firstDone).toBe(false);

    // Wait for the `onComplete` callbacks to be invoked. This is no longer
    // happening synchronously, as the underlying database@exp implementation
    // uses promises.
    await ea.promise;

    expect(secondDone).toBe(true);
    expect(thirdRunCount).toBe(2);
    // Note that the set actually raises two events, one overlaid on top of the original transaction value, and a
    // second one with the re-run value from the third transaction
    expect(nodeSnap.val()).toEqual({ foo: 0, bar: 'second' });
  });

  it('transaction(), set(), set() should work.', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const ref = getRandomNode() as Reference;
      ref.transaction(
        curr => {
          expect(curr).toBe(null);
          return 'hi!';
        },
        (error, committed) => {
          expect(error).toBe(null);
          expect(committed).toBe(true);
          done();
        }
      );

      ref.set('foo');
      ref.set('bar');
    }));

  it('Priority is preserved when setting data.', async () => {
    const node = getRandomNode() as Reference;
    let complete = false;
    let snap;
    node.on('value', s => {
      snap = s;
    });
    node.setWithPriority('test', 5);
    expect(snap.getPriority()).toBe(5);

    const promise = node.transaction(
      () => {
        return 'new value';
      },
      () => {
        complete = true;
      }
    );

    expect(snap.val()).toBe('new value');
    expect(snap.getPriority()).toBe(5);

    await promise;
    expect(snap.getPriority()).toBe(5);
  });

  it('Tetris bug test - Can do transactions from transaction callback.', async () => {
    const nodePair = getRandomNode(2) as Reference[],
      writeDone = false;
    await nodePair[0].child('foo').set(42);

    const node = nodePair[1];

    return new Promise(resolve => {
      node.child('foo').transaction(
        val => {
          if (val === null) {
            return 84;
          }
        },
        () => {
          node.child('bar').transaction(val => {
            resolve();
            return 168;
          });
        }
      );
    });
  });

  it('Resulting snapshot is passed to onComplete callback.', async () => {
    const nodePair = getRandomNode(2) as Reference[];
    await nodePair[0].transaction(
      v => {
        if (v === null) {
          return 'hello!';
        }
      },
      (error, committed, snapshot) => {
        expect(error).toBe(null);
        expect(committed).toBe(true);
        expect(snapshot.val()).toBe('hello!');
      }
    );

    // Do it again for the aborted case.
    await nodePair[0].transaction(
      v => {
        if (v === null) {
          return 'hello!';
        }
      },
      (error, committed, snapshot) => {
        expect(committed).toBe(false);
        expect(snapshot.val()).toBe('hello!');
      }
    );

    // Do it again on a fresh connection, for the aborted case.
    await nodePair[1].transaction(
      v => {
        if (v === null) {
          return 'hello!';
        }
      },
      (error, committed, snapshot) => {
        expect(committed).toBe(false);
        expect(snapshot.val()).toBe('hello!');
      }
    );
  });

  it('Transaction aborts after 25 retries.', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      restoreHash = hijackHash(() => {
        return 'duck, duck, goose.';
      });

      const node = getRandomNode() as Reference;
      let tries = 0;
      node.transaction(
        curr => {
          expect(tries).toBeLessThan(25);
          tries++;
          return 'hello!';
        },
        (error, committed, snapshot) => {
          expect(error.message).toBe('maxretry');
          expect(committed).toBe(false);
          expect(tries).toBe(25);
          restoreHash();
          restoreHash = null;
          done();
        }
      );
    }));

  it('Set should cancel already sent transactions that come back as datastale.', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const nodePair = getRandomNode(2) as Reference[];
      let transactionCalls = 0;
      nodePair[0].set(5, () => {
        nodePair[1].transaction(
          old => {
            expect(transactionCalls).toBe(0);
            expect(old).toBe(null);
            transactionCalls++;
            return 72;
          },
          (error, committed, snapshot) => {
            expect(error.message).toBe('set');
            expect(committed).toBe(false);
            done();
          }
        );

        // Transaction should get sent but fail due to stale data, and then aborted because of the below set().
        nodePair[1].set(32);
      });
    }));

  it('Update should not cancel unrelated transactions', async () => {
    const node = getRandomNode() as Reference;
    const fooTransactionDone = false;
    let barTransactionDone = false;
    restoreHash = hijackHash(() => {
      return 'foobar';
    });

    await node.child('foo').set(5);

    const deferred = new Deferred<void>();

    // 'foo' gets overwritten in the update so the transaction gets cancelled.
    node.child('foo').transaction(
      old => {
        return 72;
      },
      (error, committed, snapshot) => {
        expect(error.message).toBe('set');
        expect(committed).toBe(false);
        deferred.resolve();
      }
    );

    // 'bar' does not get touched during the update and the transaction succeeds.
    node.child('bar').transaction(
      old => {
        return 72;
      },
      (error, committed, snapshot) => {
        expect(error).toBe(null);
        expect(committed).toBe(true);
        barTransactionDone = true;
      }
    );

    await node.update({
      foo: 'newValue',
      boo: 'newValue',
      loo: {
        doo: {
          boo: 'newValue'
        }
      }
    });

    await deferred.promise;
    expect(barTransactionDone).toBe(false);
    restoreHash();
    restoreHash = null;
  });

  it('Test transaction on wacky unicode data.', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const nodePair = getRandomNode(2) as Reference[];
      nodePair[0].set('♜♞♝♛♚♝♞♜', () => {
        nodePair[1].transaction(
          current => {
            if (current !== null) {
              expect(current).toBe('♜♞♝♛♚♝♞♜');
            }
            return '♖♘♗♕♔♗♘♖';
          },
          (error, committed, snapshot) => {
            expect(error).toBe(null);
            expect(committed).toBe(true);
            done();
          }
        );
      });
    }));

  it('Test immediately aborted transaction.', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const node = getRandomNode() as Reference;
      // without callback.
      node.transaction(curr => {
        return;
      });

      // with callback.
      node.transaction(
        curr => {
          return;
        },
        (error, committed, snapshot) => {
          expect(committed).toBe(false);
          done();
        }
      );
    }));

  it('Test adding to an array with a transaction.', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const node = getRandomNode() as Reference;
      node.set(['cat', 'horse'], () => {
        node.transaction(
          (current: string[] | null) => {
            if (current) {
              current.push('dog');
            } else {
              current = ['dog'];
            }
            return current;
          },
          (error, committed, snapshot) => {
            expect(error).toBe(null);
            expect(committed).toBe(true);
            expect(snapshot.val()).toEqual(['cat', 'horse', 'dog']);
            done();
          }
        );
      });
    }));

  it('Merged transactions have correct snapshot in onComplete.', async () => {
    const nodePair = getRandomNode(2) as Reference[],
      node1 = nodePair[0],
      node2 = nodePair[1];
    let transaction1Done, transaction2Done;
    await node1.set({ a: 0 });

    const tx1 = node2.transaction(
      val => {
        if (val !== null) {
          expect(val).toEqual({ a: 0 });
        }
        return { a: 1 };
      },
      (error, committed, snapshot) => {
        expect(error).toBe(null);
        expect(committed).toBe(true);
        expect(snapshot.key).toBe(node2.key);
        // Per new behavior, will include the accepted value of the transaction, if it was successful.
        expect(snapshot.val()).toEqual({ a: 1 });
        transaction1Done = true;
      }
    );

    const tx2 = node2.child('a').transaction(
      val => {
        if (val !== null) {
          expect(val).toBe(1); // should run after the first transaction.
        }
        return 2;
      },
      (error, committed, snapshot) => {
        expect(error).toBe(null);
        expect(committed).toBe(true);
        expect(snapshot.key).toBe('a');
        expect(snapshot.val()).toEqual(2);
        transaction2Done = true;
      }
    );

    return Promise.all([tx1, tx2]);
  });

  it('Doing set() in successful transaction callback works. Case 870.', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const node = getRandomNode() as Reference;
      let transactionCalled = false;
      let callbackCalled = false;
      node.transaction(
        val => {
          expect(transactionCalled).toBeFalsy();
          transactionCalled = true;
          return 'hi';
        },
        () => {
          expect(callbackCalled).toBeFalsy();
          callbackCalled = true;
          node.set('transaction done', () => {
            done();
          });
        }
      );
    }));

  it('Doing set() in aborted transaction callback works. Case 870.', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const nodePair = getRandomNode(2) as Reference[],
        node1 = nodePair[0],
        node2 = nodePair[1];

      node1.set('initial', () => {
        let transactionCalled = false;
        let callbackCalled = false;
        node2.transaction(
          val => {
            // Return dummy value until we're called with the actual current value.
            if (val === null) {
              return 'hi';
            }

            expect(transactionCalled).toBeFalsy();
            transactionCalled = true;
            return;
          },
          (error, committed, snapshot) => {
            expect(callbackCalled).toBeFalsy();
            callbackCalled = true;
            node2.set('transaction done', () => {
              done();
            });
          }
        );
      });
    }));

  it('Pending transactions are canceled on disconnect.', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const ref = getRandomNode() as Reference;

      // wait to be connected and some data set.
      ref.set('initial', () => {
        ref.transaction(
          current => {
            return 'new';
          },
          (error, committed, snapshot) => {
            expect(committed).toBe(false);
            expect(error.message).toBe('disconnect');
            done();
          }
        );

        // Kill the connection, which should cancel the outstanding transaction, since we don't know if it was
        // committed on the server or not.
        ref.database.goOffline();
        ref.database.goOnline();
      });
    }));

  it('Transaction without local events (1)', async () => {
    const ref = getRandomNode() as Reference,
      actions = [];
    let ea = EventAccumulatorFactory.waitsForCount(1);

    ref.on('value', s => {
      actions.push('value ' + s.val());
      ea.addEvent();
    });

    await ea.promise;

    ea = new EventAccumulator(() => actions.length >= 4);

    ref.transaction(
      () => {
        return 'hello!';
      },
      (error, committed, snapshot) => {
        expect(error).toBeNull();
        expect(committed).toBe(true);
        expect(snapshot.val()).toBe('hello!');

        actions.push('txn completed');
        ea.addEvent();
      },
      /*applyLocally=*/ false
    );

    // Shouldn't have gotten any events yet.
    expect(actions).toEqual(['value null']);
    actions.push('txn run');
    ea.addEvent();

    await ea.promise;

    expect(actions).toEqual([
      'value null',
      'txn run',
      'value hello!',
      'txn completed'
    ]);
  });

  // This test is meant to ensure that with applyLocally=false, while the transaction is outstanding, we continue
  // to get events from other clients.
  // TODO(mikelehen): Unfortunately this test is currently flaky.  It's inherently a racy test since it's
  // trying to do 4 sets before the transaction retries 25 times (and fails), using two different connections.
  // Disabling for now until we rework the approach.
  it.skip('Transaction without local events (2)', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const refPair = getRandomNode(2) as Reference[],
        ref1 = refPair[0],
        ref2 = refPair[1];
      restoreHash = hijackHash(() => {
        return 'badhash';
      });
      const SETS = 4;
      const events = [];
      let retries = 0;
      let setsDone = 0;

      function txn1(next) {
        // Do a transaction on the first connection which will keep retrying (cause we hijacked the hash).
        // Make sure we're getting events for the sets happening on the second connection.
        ref1.transaction(
          current => {
            retries++;
            if (typeof current === 'number') {
              // We should be getting server events while the transaction is outstanding.
              for (let i = 0; i < (current || 0); i++) {
                expect(events[i]).toBe(i);
              }
            }

            if (current === SETS - 1) {
              restoreHash();
              restoreHash = null;
            }
            return 'txn result';
          },
          (error, committed, snapshot) => {
            expect(error).toBe(null);
            expect(committed).toBe(true);

            expect(snapshot && snapshot.val()).toBe('txn result');
            next();
          },
          /*applyLocally=*/ false
        );

        // Meanwhile, do sets from the second connection.
        const doSet = function () {
          ref2.set(setsDone, () => {
            setsDone++;
            if (setsDone < SETS) {
              doSet();
            }
          });
        };
        doSet();
      }

      ref1.set(0, () => {
        ref1.on('value', snap => {
          events.push(snap.val());
          if (events.length === 1 && events[0] === 0) {
            txn1(() => {
              // Sanity check stuff.
              expect(setsDone).toBe(SETS);
              if (retries === 0) {
                throw 'Transaction should have had to retry!';
              }

              // Validate we got the correct events.
              for (let i = 0; i < SETS; i++) {
                expect(events[i]).toBe(i);
              }
              expect(events[SETS]).toBe('txn result');

              if (restoreHash) {
                restoreHash();
                restoreHash = null;
              }
              done();
            });
          }
        });
      });
    }));

  it('Transaction from value callback.', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const ref = getRandomNode() as Reference;
      const COUNT = 1;
      let transactionsOutstanding = 0;
      ref.on('value', snap => {
        let shouldCommit = true;
        transactionsOutstanding++;
        ref.transaction(
          current => {
            if (current == null) {
              return 0;
            } else if (typeof current === 'number' && current < COUNT) {
              return (current as number) + 1;
            } else {
              shouldCommit = false;
            }
          },
          (error, committed, snap) => {
            expect(committed).toBe(shouldCommit);
            transactionsOutstanding--;
            if (transactionsOutstanding === 0) {
              done();
            }
          }
        );
      });
    }));

  it('Transaction runs on null only once after reconnect (Case 1981).', async () => {
    if (!canCreateExtraConnections()) {
      return;
    }

    const ref = getRandomNode() as Reference;
    await ref.set(42);
    const newRef = getFreshRepoFromReference(ref);
    let run = 0;
    return newRef.transaction(
      curr => {
        run++;
        if (run === 1) {
          expect(curr).toBe(null);
        } else if (run === 2) {
          expect(curr).toBe(42);
        }
        return 3.14;
      },
      (error, committed, resultSnapshot) => {
        expect(error).toBe(null);
        expect(committed).toBe(true);
        expect(run).toBe(2);
        expect(resultSnapshot.val()).toBe(3.14);
      }
    );
  });

  // Provided by bk@thinkloop.com, this was failing when we sent puts before listens, but passes now.
  it('makeFriends user test case.', () => {
    const ea = EventAccumulatorFactory.waitsForCount(12);
    if (!canCreateExtraConnections()) {
      return;
    }

    function makeFriends(accountID, friendAccountIDs, firebase) {
      let friendAccountID;

      // add friend relationships
      for (const i in friendAccountIDs) {
        if (friendAccountIDs.hasOwnProperty(i)) {
          friendAccountID = friendAccountIDs[i];
          makeFriend(friendAccountID, accountID, firebase);
          makeFriend(accountID, friendAccountID, firebase);
        }
      }
    }

    function makeFriend(accountID, friendAccountID, firebase) {
      firebase
        .child(accountID)
        .child(friendAccountID)
        .transaction(
          r => {
            if (r == null) {
              r = {
                accountID,
                friendAccountID,
                percentCommon: 0
              };
            }

            return r;
          },
          (error, committed, snapshot) => {
            if (error) {
              throw error;
            } else if (!committed) {
              throw 'All should be committed!';
            } else {
              count++;
              ea.addEvent();
              snapshot.ref.setPriority(snapshot.val().percentCommon);
            }
          },
          false
        );
    }

    const firebase = getRandomNode() as Reference;
    firebase.database.goOffline();
    firebase.database.goOnline();
    let count = 0;
    makeFriends('a1', ['a2', 'a3'], firebase);
    makeFriends('a2', ['a1', 'a3'], firebase);
    makeFriends('a3', ['a1', 'a2'], firebase);
    return ea.promise;
  });

  it('transaction() respects .priority.', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const ref = getRandomNode() as Reference;
      const values = [];
      ref.on('value', s => {
        values.push(s.exportVal());
      });

      ref.transaction(
        curr => {
          expect(curr).toBe(null);
          return { '.value': 5, '.priority': 5 };
        },
        () => {
          ref.transaction(
            curr => {
              expect(curr).toBe(5);
              return { '.value': 10, '.priority': 10 };
            },
            () => {
              expect(values).toEqual([
                { '.value': 5, '.priority': 5 },
                { '.value': 10, '.priority': 10 }
              ]);
              done();
            }
          );
        }
      );
    }));

  it('Transaction properly reverts data when you add a deeper listen.', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const refPair = getRandomNode(2) as Reference[],
        ref1 = refPair[0],
        ref2 = refPair[1];
      ref1.child('y').set('test', () => {
        ref2.transaction(curr => {
          if (curr === null) {
            return { x: 1 };
          }
        });

        ref2.child('y').on('value', s => {
          if (s.val() === 'test') {
            done();
          }
        });
      });
    }));

  it('Transaction with integer keys', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const ref = getRandomNode() as Reference;
      ref.set({ 1: 1, 5: 5, 10: 10, 20: 20 }, () => {
        ref.transaction(
          current => {
            return 42;
          },
          (error, committed) => {
            expect(error).toBeNull();
            expect(committed).toBe(true);
            done();
          }
        );
      });
    }));

  it('Return null from first run of transaction.', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const ref = getRandomNode() as Reference;
      ref.transaction(
        c => {
          return null;
        },
        (error, committed) => {
          expect(error).toBe(null);
          expect(committed).toBe(true);
          done();
        }
      );
    }));

  // https://app.asana.com/0/5673976843758/9259161251948
  it('Bubble-app transaction bug.', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const ref = getRandomNode() as Reference;
      ref.child('a').transaction(() => {
        return 1;
      });
      ref.child('a').transaction((current: number) => {
        return current + 42;
      });
      ref.child('b').transaction(() => {
        return 7;
      });
      ref.transaction(
        (current: { a?: number; b?: number } | null) => {
          if (current && current.a && current.b) {
            return current.a + current.b;
          } else {
            return 'dummy';
          }
        },
        (error, committed, snap) => {
          expect(error).toBe(null);
          expect(committed).toBe(true);
          expect(snap.val()).toEqual(50);
          done();
        }
      );
    }));

  it('Transaction and priority: Can set priority in transaction on empty node', async () => {
    const ref = getRandomNode() as Reference;

    await ref.transaction(current => {
      return { '.value': 42, '.priority': 7 };
    });

    return ref.once('value', s => {
      expect(s.exportVal()).toEqual({ '.value': 42, '.priority': 7 });
    });
  });

  it("Transaction and priority: Transaction doesn't change priority.", async () => {
    const ref = getRandomNode() as Reference;

    await ref.set({ '.value': 42, '.priority': 7 });

    await ref.transaction(current => {
      return 12;
    });

    const snap = await ref.once('value');

    expect(snap.exportVal()).toEqual({ '.value': 12, '.priority': 7 });
  });

  it('Transaction and priority: Transaction can change priority on non-empty node.', async () => {
    const ref = getRandomNode() as Reference;

    await ref.set({ '.value': 42, '.priority': 7 });

    await ref.transaction(current => {
      return { '.value': 43, '.priority': 8 };
    });

    return ref.once('value', s => {
      expect(s.exportVal()).toEqual({ '.value': 43, '.priority': 8 });
    });
  });

  it('Transaction and priority: Changing priority on siblings.', async () => {
    const ref = getRandomNode() as Reference;

    await ref.set({
      a: { '.value': 'a', '.priority': 'a' },
      b: { '.value': 'b', '.priority': 'b' }
    });

    const tx1 = ref.child('a').transaction(current => {
      return { '.value': 'a2', '.priority': 'a2' };
    });

    const tx2 = ref.child('b').transaction(current => {
      return { '.value': 'b2', '.priority': 'b2' };
    });

    await Promise.all([tx1, tx2]);

    return ref.once('value', s => {
      expect(s.exportVal()).toEqual({
        a: { '.value': 'a2', '.priority': 'a2' },
        b: { '.value': 'b2', '.priority': 'b2' }
      });
    });
  });

  it('Transaction and priority: Leaving priority on siblings.', async () => {
    const ref = getRandomNode() as Reference;

    await ref.set({
      a: { '.value': 'a', '.priority': 'a' },
      b: { '.value': 'b', '.priority': 'b' }
    });

    const tx1 = ref.child('a').transaction(current => {
      return 'a2';
    });

    const tx2 = ref.child('b').transaction(current => {
      return 'b2';
    });

    await Promise.all([tx1, tx2]);

    return ref.once('value', s => {
      expect(s.exportVal()).toEqual({
        a: { '.value': 'a2', '.priority': 'a' },
        b: { '.value': 'b2', '.priority': 'b' }
      });
    });
  });

  it("transaction() doesn't pick up cached data from previous once().", () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const refPair = getRandomNode(2) as Reference[];
      const me = refPair[0],
        other = refPair[1];
      me.set('not null', () => {
        me.once('value', snapshot => {
          other.set(null, () => {
            me.transaction(
              snapshot => {
                if (snapshot === null) {
                  return 'it was null!';
                } else {
                  return 'it was not null!';
                }
              },
              (err, committed, snapshot) => {
                expect(err).toBe(null);
                expect(committed).toBe(true);
                expect(snapshot.val()).toEqual('it was null!');
                done();
              }
            );
          });
        });
      });
    }));

  it("transaction() doesn't pick up cached data from previous transaction.", () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const refPair = getRandomNode(2) as Reference[];
      const me = refPair[0],
        other = refPair[1];
      me.transaction(
        () => {
          return 'not null';
        },
        (err, committed) => {
          expect(err).toBe(null);
          expect(committed).toBe(true);
          other.set(null, () => {
            me.transaction(
              snapshot => {
                if (snapshot === null) {
                  return 'it was null!';
                } else {
                  return 'it was not null!';
                }
              },
              (err, committed, snapshot) => {
                expect(err).toBe(null);
                expect(committed).toBe(true);
                expect(snapshot.val()).toEqual('it was null!');
                done();
              }
            );
          });
        }
      );
    }));

  it('server values: local timestamp should eventually (but not immediately) match the server with txns', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const refPair = getRandomNode(2) as Reference[],
        writer = refPair[0],
        reader = refPair[1],
        readSnaps = [],
        writeSnaps = [];

      const evaluateCompletionCriteria = function () {
        if (readSnaps.length === 1 && writeSnaps.length === 2) {
          expect(
            Math.abs(new Date().getTime() - writeSnaps[0].val()) < 10000
          ).toBe(true);
          expect(
            Math.abs(new Date().getTime() - writeSnaps[0].getPriority()) < 10000
          ).toBe(true);
          expect(
            Math.abs(new Date().getTime() - writeSnaps[1].val()) < 10000
          ).toBe(true);
          expect(
            Math.abs(new Date().getTime() - writeSnaps[1].getPriority()) < 10000
          ).toBe(true);

          expect(writeSnaps[0].val() === writeSnaps[1].val()).toBe(false);
          expect(
            writeSnaps[0].getPriority() === writeSnaps[1].getPriority()
          ).toBe(false);
          expect(writeSnaps[1].val() === readSnaps[0].val()).toBe(true);
          expect(
            writeSnaps[1].getPriority() === readSnaps[0].getPriority()
          ).toBe(true);
          done();
        }
      };

      // 1st non-null event = actual server timestamp
      reader.on('value', snap => {
        if (snap.val() === null) {
          return;
        }
        readSnaps.push(snap);
        evaluateCompletionCriteria();
      });

      // 1st non-null event = local timestamp estimate
      // 2nd non-null event = actual server timestamp
      writer.on('value', snap => {
        if (snap.val() === null) {
          return;
        }
        writeSnaps.push(snap);
        evaluateCompletionCriteria();
      });

      // Generate the server value offline to make sure there's a time gap between the client's guess of the timestamp
      // and the server's actual timestamp.
      writer.database.goOffline();

      writer.transaction(current => {
        return {
          '.value': (firebase as any).database.ServerValue.TIMESTAMP,
          '.priority': (firebase as any).database.ServerValue.TIMESTAMP
        };
      });

      writer.database.goOnline();
    }));

  it("transaction() still works when there's a query listen.", () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const ref = getRandomNode() as Reference;

      ref.set(
        {
          a: 1,
          b: 2
        },
        () => {
          ref.limitToFirst(1).on('child_added', () => {});

          ref.child('a').transaction(
            current => {
              return current;
            },
            (error, committed, snapshot) => {
              expect(error).toBe(null);
              expect(committed).toBe(true);
              if (!error) {
                expect(snapshot.val()).toEqual(1);
              }
              done();
            },
            false
          );
        }
      );
    }));

  it("transaction() on queried location doesn't run initially on null (firebase-worker-queue depends on this).", () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const ref = getRandomNode() as Reference;
      ref.push({ a: 1, b: 2 }, () => {
        ref
          .startAt()
          .limitToFirst(1)
          .on('child_added', snap => {
            snap.ref.transaction(
              current => {
                expect(current).toEqual({ a: 1, b: 2 });
                return null;
              },
              (error, committed, snapshot) => {
                expect(error).toBe(null);
                expect(committed).toBe(true);
                expect(snapshot.val()).toBe(null);
                done();
              }
            );
          });
      });
    }));

  it('transactions raise correct child_changed events on queries', async () => {
    const ref = getRandomNode() as Reference;

    const value = { foo: { value: 1 } };
    const snapshots = [];

    await ref.set(value);

    const query = ref.endAt(Number.MIN_VALUE);
    query.on('child_added', snapshot => {
      snapshots.push(snapshot);
    });

    query.on('child_changed', snapshot => {
      snapshots.push(snapshot);
    });

    await ref.child('foo').transaction(
      current => {
        return { value: 2 };
      },
      (error, committed, snapshot) => {
        expect(error).toBe(null);
        expect(committed).toBe(true);
      },
      false
    );

    expect(snapshots.length).toBe(2);
    const addedSnapshot = snapshots[0];
    expect(addedSnapshot.key).toBe('foo');
    expect(addedSnapshot.val()).toEqual({ value: 1 });
    const changedSnapshot = snapshots[1];
    expect(changedSnapshot.key).toBe('foo');
    expect(changedSnapshot.val()).toEqual({ value: 2 });
  });

  it('transactions can use local merges', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const ref = getRandomNode() as Reference;

      ref.update({ foo: 'bar' });

      ref.child('foo').transaction(
        current => {
          expect(current).toBe('bar');
          return current;
        },
        (error, committed, snapshot) => {
          expect(error).toBe(null);
          expect(committed).toBe(true);
          done();
        }
      );
    }));

  it('transactions works with merges without the transaction path', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const ref = getRandomNode() as Reference;

      ref.update({ foo: 'bar' });

      ref.child('non-foo').transaction(
        current => {
          expect(current).toBe(null);
          return current;
        },
        (error, committed, snapshot) => {
          expect(error).toBe(null);
          expect(committed).toBe(true);
          done();
        }
      );
    }));

  //See https://app.asana.com/0/15566422264127/23303789496881
  it('out of order remove writes are handled correctly', () =>
    new Promise<void>((resolve, reject) => {
      const done = (err?: any) => (err ? reject(err) : resolve());

      const ref = getRandomNode() as Reference;

      ref.set({ foo: 'bar' });
      ref.transaction(
        () => {
          return 'transaction-1';
        },
        () => {}
      );
      ref.transaction(
        () => {
          return 'transaction-2';
        },
        () => {}
      );

      // This will trigger an abort of the transaction which should not cause the client to crash
      ref.update({ qux: 'quu' }, error => {
        expect(error).toBe(null);
        done();
      });
    }));

  it('Can listen to transaction changes', async () => {
    // Repro for https://github.com/firebase/firebase-js-sdk/issues/5195
    let latestValue = 0;

    const ref = getRandomNode() as Reference;

    let deferred = new Deferred<void>();
    ref.on('value', snap => {
      latestValue = snap.val() as number;
      deferred.resolve();
    });

    async function incrementViaTransaction() {
      deferred = new Deferred<void>();
      await ref.transaction(currentData => {
        return (currentData as number) + 1;
      });
      // Wait for the snapshot listener to fire. They are not invoked inline
      // for transactions.
      await deferred.promise;
    }

    expect(latestValue).toBe(0);

    await incrementViaTransaction();
    expect(latestValue).toBe(1);
    await incrementViaTransaction();
    expect(latestValue).toBe(2);
  });
});
