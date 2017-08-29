/**
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
import {
  canCreateExtraConnections,
  getFreshRepoFromReference,
  getRandomNode,
  getVal
} from './helpers/util';
import { eventTestHelper } from './helpers/events';
import {
  EventAccumulator,
  EventAccumulatorFactory
} from './helpers/EventAccumulator';
import { hijackHash } from '../src/api/test_access';
import firebase from '@firebase/app';
import '../index';

describe('Transaction Tests', function() {
  it('New value is immediately visible.', function() {
    const node = getRandomNode() as Reference;
    node.child('foo').transaction(function() {
      return 42;
    });

    let val = null;
    node.child('foo').on('value', function(snap) {
      val = snap.val();
    });
    expect(val).to.equal(42);
  });

  it.skip('Event is raised for new value.', function() {
    const node = getRandomNode() as Reference;
    const fooNode = node.child('foo');
    const eventHelper = eventTestHelper([[fooNode, ['value', '']]]);

    node.child('foo').transaction(function() {
      return 42;
    });

    expect(eventHelper.waiter()).to.equal(true);
  });

  it('Transaction result can be converted to JSON.', function() {
    const node = getRandomNode() as Reference;

    return node
      .transaction(() => {
        return 42;
      })
      .then(transactionResult => {
        expect(transactionResult.toJSON()).to.deep.equal({
          committed: true,
          snapshot: 42
        });
      });
  });

  it('Non-aborted transaction sets committed to true in callback.', function(
    done
  ) {
    const node = getRandomNode() as Reference;

    node.transaction(
      function() {
        return 42;
      },
      function(error, committed, snapshot) {
        expect(error).to.equal(null);
        expect(committed).to.equal(true);
        expect(snapshot.val()).to.equal(42);
        done();
      }
    );
  });

  it('Aborted transaction sets committed to false in callback.', function(
    done
  ) {
    const node = getRandomNode() as Reference;

    node.transaction(
      function() {},
      function(error, committed, snapshot) {
        expect(error).to.equal(null);
        expect(committed).to.equal(false);
        expect(snapshot.val()).to.be.null;
        done();
      }
    );
  });

  it('Tetris bug test - set data, reconnect, do transaction that aborts once data arrives, verify correct events.', async function() {
    const nodePair = getRandomNode(2) as Reference[];
    let node = nodePair[0];
    let eventsReceived = 0;
    const ea = EventAccumulatorFactory.waitsForCount(2);

    await node.child('foo').set(42);

    node = nodePair[1];
    node.child('foo').on('value', function(snap) {
      if (eventsReceived === 0) {
        expect(snap.val()).to.equal('temp value');
      } else if (eventsReceived === 1) {
        expect(snap.val()).to.equal(42);
      } else {
        // Extra event detected.
        expect(true).to.equal(false);
      }
      eventsReceived++;
      ea.addEvent();
    });

    node.child('foo').transaction(
      function(value) {
        if (value === null) return 'temp value';
        else return;
      },
      function(error, committed, snapshot) {
        expect(error).to.equal(null);
        expect(committed).to.equal(false);
        expect(snapshot.val()).to.equal(42);
      }
    );

    return ea.promise;
  });

  it('Use transaction to create a node, make sure exactly one event is received.', function() {
    const node = getRandomNode() as Reference;
    let events = 0,
      done = false;

    const ea = new EventAccumulator(() => done && events === 1);

    node.child('a').on('value', function() {
      events++;
      ea.addEvent();
      if (events > 1) throw 'Expected 1 event on a, but got two.';
    });

    node.child('a').transaction(
      function() {
        return 42;
      },
      function() {
        done = true;
        ea.addEvent();
      }
    );

    return ea.promise;
  });

  it(
    'Use transaction to update one of two existing child nodes. ' +
      'Make sure events are only raised for the changed node.',
    async function() {
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
        function() {
          return { a: 42, b: 87 };
        },
        function(error, committed, snapshot) {
          expect(error).to.be.null;
          expect(committed).to.equal(true);
          expect(snapshot.val()).to.deep.equal({ a: 42, b: 87 });
        }
      );

      return Promise.all([eventHelper.promise, transaction]);
    }
  );

  it('Transaction is only called once when initializing an empty node.', function() {
    const node = getRandomNode() as Reference;
    let updateCalled = 0;

    const ea = EventAccumulatorFactory.waitsForCount(1);
    node.transaction(function(value) {
      expect(value).to.equal(null);
      updateCalled++;
      ea.addEvent();
      if (updateCalled > 1) throw 'Transaction called too many times.';

      if (value === null) {
        return { a: 5, b: 3 };
      }
    });

    return ea.promise;
  });

  it('Second transaction gets run immediately on previous output and only runs once.', function(
    done
  ) {
    const nodePair = getRandomNode(2) as Reference[];
    let firstRun = false,
      firstDone = false,
      secondRun = false,
      secondDone = false;

    function onComplete() {
      if (firstDone && secondDone) {
        nodePair[1].on('value', function(snap) {
          expect(snap.val()).to.equal(84);
          done();
        });
      }
    }

    nodePair[0].transaction(
      function() {
        expect(firstRun).to.equal(false);
        firstRun = true;
        return 42;
      },
      function(error, committed, snapshot) {
        expect(error).to.equal(null);
        expect(committed).to.equal(true);
        firstDone = true;
        onComplete();
      }
    );
    expect(firstRun).to.equal(true);

    nodePair[0].transaction(
      function(value) {
        expect(secondRun).to.equal(false);
        secondRun = true;
        expect(value).to.equal(42);
        return 84;
      },
      function(error, committed, snapshot) {
        expect(error).to.equal(null);
        expect(committed).to.equal(true);
        secondDone = true;
        onComplete();
      }
    );
    expect(secondRun).to.equal(true);

    expect(getVal(nodePair[0])).to.equal(84);
  });

  it('Set() cancels pending transactions and re-runs affected transactions.', async function() {
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

    node.on('value', function(s) {
      const str = JSON.stringify(s.val());
      nodeSnap = s;
    });
    node.child('foo').on('value', function(s) {
      const str = JSON.stringify(s.val());
      nodeFooSnap = s;
    });

    let firstRun = false,
      secondRun = false,
      thirdRunCount = 0;
    const ea = new EventAccumulator(() => firstDone && thirdDone);
    node.child('foo').transaction(
      function() {
        expect(firstRun).to.equal(false);
        firstRun = true;
        return 42;
      },
      function(error, committed, snapshot) {
        expect(error).to.equal(null);
        expect(committed).to.equal(true);
        expect(snapshot.val()).to.equal(42);
        firstDone = true;
        ea.addEvent();
      }
    );
    expect(nodeFooSnap.val()).to.deep.equal(42);

    node.transaction(
      function() {
        expect(secondRun).to.equal(false);
        secondRun = true;
        return { foo: 84, bar: 1 };
      },
      function(error, committed, snapshot) {
        expect(committed).to.equal(false);
        secondDone = true;
        ea.addEvent();
      }
    );
    expect(secondRun).to.equal(true);
    expect(nodeSnap.val()).to.deep.equal({ foo: 84, bar: 1 });

    node.child('bar').transaction(
      function(val) {
        thirdRunCount++;
        if (thirdRunCount === 1) {
          expect(val).to.equal(1);
          return 'first';
        } else if (thirdRunCount === 2) {
          expect(val).to.equal(null);
          return 'second';
        } else {
          throw new Error('Called too many times!');
        }
      },
      function(error, committed, snapshot) {
        expect(error).to.equal(null);
        expect(committed).to.equal(true);
        expect(snapshot.val()).to.equal('second');
        thirdDone = true;
        ea.addEvent();
      }
    );
    expect(thirdRunCount).to.equal(1);
    expect(nodeSnap.val()).to.deep.equal({ foo: 84, bar: 'first' });

    // This rolls back the second transaction, and triggers a re-run of the third.
    // However, a new value event won't be triggered until the listener is complete,
    // so we're left with the last value event
    node.child('foo').set(0);

    expect(firstDone).to.equal(false);
    expect(secondDone).to.equal(true);
    expect(thirdRunCount).to.equal(2);
    // Note that the set actually raises two events, one overlaid on top of the original transaction value, and a
    // second one with the re-run value from the third transaction

    await ea.promise;

    expect(nodeSnap.val()).to.deep.equal({ foo: 0, bar: 'second' });
  });

  it('transaction(), set(), set() should work.', function(done) {
    const ref = getRandomNode() as Reference;
    ref.transaction(
      function(curr) {
        expect(curr).to.equal(null);
        return 'hi!';
      },
      function(error, committed) {
        expect(error).to.equal(null);
        expect(committed).to.equal(true);
        done();
      }
    );

    ref.set('foo');
    ref.set('bar');
  });

  it('Priority is preserved when setting data.', async function() {
    const node = getRandomNode() as Reference;
    let complete = false;
    let snap;
    node.on('value', function(s) {
      snap = s;
    });
    node.setWithPriority('test', 5);
    expect(snap.getPriority()).to.equal(5);

    let promise = node.transaction(
      function() {
        return 'new value';
      },
      function() {
        complete = true;
      }
    );

    expect(snap.val()).to.equal('new value');
    expect(snap.getPriority()).to.equal(5);

    await promise;
    expect(snap.getPriority()).to.equal(5);
  });

  it('Tetris bug test - Can do transactions from transaction callback.', async function() {
    const nodePair = getRandomNode(2) as Reference[],
      writeDone = false;
    await nodePair[0].child('foo').set(42);

    const node = nodePair[1];

    return new Promise(resolve => {
      node.child('foo').transaction(
        function(val) {
          if (val === null) return 84;
        },
        function() {
          node.child('bar').transaction(function(val) {
            resolve();
            return 168;
          });
        }
      );
    });
  });

  it('Resulting snapshot is passed to onComplete callback.', async function() {
    const nodePair = getRandomNode(2) as Reference[];
    await nodePair[0].transaction(
      function(v) {
        if (v === null) return 'hello!';
      },
      function(error, committed, snapshot) {
        expect(error).to.equal(null);
        expect(committed).to.equal(true);
        expect(snapshot.val()).to.equal('hello!');
      }
    );

    // Do it again for the aborted case.
    await nodePair[0].transaction(
      function(v) {
        if (v === null) return 'hello!';
      },
      function(error, committed, snapshot) {
        expect(committed).to.equal(false);
        expect(snapshot.val()).to.equal('hello!');
      }
    );

    // Do it again on a fresh connection, for the aborted case.
    await nodePair[1].transaction(
      function(v) {
        if (v === null) return 'hello!';
      },
      function(error, committed, snapshot) {
        expect(committed).to.equal(false);
        expect(snapshot.val()).to.equal('hello!');
      }
    );
  });

  it('Transaction aborts after 25 retries.', function(done) {
    const restoreHash = hijackHash(function() {
      return 'duck, duck, goose.';
    });

    const node = getRandomNode() as Reference;
    let tries = 0;
    node.transaction(
      function(curr) {
        expect(tries).to.be.lessThan(25);
        tries++;
        return 'hello!';
      },
      function(error, committed, snapshot) {
        expect(error.message).to.equal('maxretry');
        expect(committed).to.equal(false);
        expect(tries).to.equal(25);
        restoreHash();
        done();
      }
    );
  });

  it('Set should cancel already sent transactions that come back as datastale.', function(
    done
  ) {
    const nodePair = getRandomNode(2) as Reference[];
    let transactionCalls = 0;
    nodePair[0].set(5, function() {
      nodePair[1].transaction(
        function(old) {
          expect(transactionCalls).to.equal(0);
          expect(old).to.equal(null);
          transactionCalls++;
          return 72;
        },
        function(error, committed, snapshot) {
          expect(error.message).to.equal('set');
          expect(committed).to.equal(false);
          done();
        }
      );

      // Transaction should get sent but fail due to stale data, and then aborted because of the below set().
      nodePair[1].set(32);
    });
  });

  it('Update should not cancel unrelated transactions', async function() {
    const node = getRandomNode() as Reference;
    let fooTransactionDone = false;
    let barTransactionDone = false;
    const restoreHash = hijackHash(function() {
      return 'foobar';
    });

    await node.child('foo').set(5);

    // 'foo' gets overwritten in the update so the transaction gets cancelled.
    node.child('foo').transaction(
      function(old) {
        return 72;
      },
      function(error, committed, snapshot) {
        expect(error.message).to.equal('set');
        expect(committed).to.equal(false);
        fooTransactionDone = true;
      }
    );

    // 'bar' does not get touched during the update and the transaction succeeds.
    node.child('bar').transaction(
      function(old) {
        return 72;
      },
      function(error, committed, snapshot) {
        expect(error).to.equal(null);
        expect(committed).to.equal(true);
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

    expect(fooTransactionDone).to.equal(true);
    expect(barTransactionDone).to.equal(false);
    restoreHash();
  });

  it('Test transaction on wacky unicode data.', function(done) {
    const nodePair = getRandomNode(2) as Reference[];
    nodePair[0].set('♜♞♝♛♚♝♞♜', function() {
      nodePair[1].transaction(
        function(current) {
          if (current !== null) expect(current).to.equal('♜♞♝♛♚♝♞♜');
          return '♖♘♗♕♔♗♘♖';
        },
        function(error, committed, snapshot) {
          expect(error).to.equal(null);
          expect(committed).to.equal(true);
          done();
        }
      );
    });
  });

  it('Test immediately aborted transaction.', function(done) {
    const node = getRandomNode() as Reference;
    // without callback.
    node.transaction(function(curr) {
      return;
    });

    // with callback.
    node.transaction(
      function(curr) {
        return;
      },
      function(error, committed, snapshot) {
        expect(committed).to.equal(false);
        done();
      }
    );
  });

  it('Test adding to an array with a transaction.', function(done) {
    const node = getRandomNode() as Reference;
    node.set(['cat', 'horse'], function() {
      node.transaction(
        function(current) {
          if (current) {
            current.push('dog');
          } else {
            current = ['dog'];
          }
          return current;
        },
        function(error, committed, snapshot) {
          expect(error).to.equal(null);
          expect(committed).to.equal(true);
          expect(snapshot.val()).to.deep.equal(['cat', 'horse', 'dog']);
          done();
        }
      );
    });
  });

  it('Merged transactions have correct snapshot in onComplete.', async function() {
    const nodePair = getRandomNode(2) as Reference[],
      node1 = nodePair[0],
      node2 = nodePair[1];
    let transaction1Done, transaction2Done;
    await node1.set({ a: 0 });

    const tx1 = node2.transaction(
      function(val) {
        if (val !== null) {
          expect(val).to.deep.equal({ a: 0 });
        }
        return { a: 1 };
      },
      function(error, committed, snapshot) {
        expect(error).to.equal(null);
        expect(committed).to.equal(true);
        expect(snapshot.key).to.equal(node2.key);
        // Per new behavior, will include the accepted value of the transaction, if it was successful.
        expect(snapshot.val()).to.deep.equal({ a: 1 });
        transaction1Done = true;
      }
    );

    const tx2 = node2.child('a').transaction(
      function(val) {
        if (val !== null) {
          expect(val).to.equal(1); // should run after the first transaction.
        }
        return 2;
      },
      function(error, committed, snapshot) {
        expect(error).to.equal(null);
        expect(committed).to.equal(true);
        expect(snapshot.key).to.equal('a');
        expect(snapshot.val()).to.deep.equal(2);
        transaction2Done = true;
      }
    );

    return Promise.all([tx1, tx2]);
  });

  it('Doing set() in successful transaction callback works. Case 870.', function(
    done
  ) {
    const node = getRandomNode() as Reference;
    let transactionCalled = false;
    let callbackCalled = false;
    node.transaction(
      function(val) {
        expect(transactionCalled).to.not.be.ok;
        transactionCalled = true;
        return 'hi';
      },
      function() {
        expect(callbackCalled).to.not.be.ok;
        callbackCalled = true;
        node.set('transaction done', function() {
          done();
        });
      }
    );
  });

  it('Doing set() in aborted transaction callback works. Case 870.', function(
    done
  ) {
    const nodePair = getRandomNode(2) as Reference[],
      node1 = nodePair[0],
      node2 = nodePair[1];

    node1.set('initial', function() {
      let transactionCalled = false;
      let callbackCalled = false;
      node2.transaction(
        function(val) {
          // Return dummy value until we're called with the actual current value.
          if (val === null) return 'hi';

          expect(transactionCalled).to.not.be.ok;
          transactionCalled = true;
          return;
        },
        function(error, committed, snapshot) {
          expect(callbackCalled).to.not.be.ok;
          callbackCalled = true;
          node2.set('transaction done', function() {
            done();
          });
        }
      );
    });
  });

  it('Pending transactions are canceled on disconnect.', function(done) {
    const ref = getRandomNode() as Reference;

    // wait to be connected and some data set.
    ref.set('initial', function() {
      ref.transaction(
        function(current) {
          return 'new';
        },
        function(error, committed, snapshot) {
          expect(committed).to.equal(false);
          expect(error.message).to.equal('disconnect');
          done();
        }
      );

      // Kill the connection, which should cancel the outstanding transaction, since we don't know if it was
      // committed on the server or not.
      ref.database.goOffline();
      ref.database.goOnline();
    });
  });

  it('Transaction without local events (1)', async function() {
    const ref = getRandomNode() as Reference,
      actions = [];
    let ea = EventAccumulatorFactory.waitsForCount(1);

    ref.on('value', function(s) {
      actions.push('value ' + s.val());
      ea.addEvent();
    });

    await ea.promise;

    ea = new EventAccumulator(() => actions.length >= 4);

    ref.transaction(
      function() {
        return 'hello!';
      },
      function(error, committed, snapshot) {
        expect(error).to.be.null;
        expect(committed).to.equal(true);
        expect(snapshot.val()).to.equal('hello!');

        actions.push('txn completed');
        ea.addEvent();
      },
      /*applyLocally=*/ false
    );

    // Shouldn't have gotten any events yet.
    expect(actions).to.deep.equal(['value null']);
    actions.push('txn run');
    ea.addEvent();

    await ea.promise;

    expect(actions).to.deep.equal([
      'value null',
      'txn run',
      'value hello!',
      'txn completed'
    ]);
  });

  // This test is meant to ensure that with applyLocally=false, while the transaction is outstanding, we continue
  // to get events from other clients.
  it('Transaction without local events (2)', function(done) {
    const refPair = getRandomNode(2) as Reference[],
      ref1 = refPair[0],
      ref2 = refPair[1];
    const restoreHash = hijackHash(function() {
      return 'badhash';
    });
    const SETS = 4;
    let events = [],
      retries = 0,
      setsDone = 0;

    function txn1(next) {
      // Do a transaction on the first connection which will keep retrying (cause we hijacked the hash).
      // Make sure we're getting events for the sets happening on the second connection.
      ref1.transaction(
        function(current) {
          retries++;
          // We should be getting server events while the transaction is outstanding.
          for (let i = 0; i < (current || 0); i++) {
            expect(events[i]).to.equal(i);
          }

          if (current === SETS - 1) {
            restoreHash();
          }
          return 'txn result';
        },
        function(error, committed, snapshot) {
          expect(error).to.equal(null);
          expect(committed).to.equal(true);

          expect(snapshot && snapshot.val()).to.equal('txn result');
          next();
        },
        /*applyLocally=*/ false
      );

      // Meanwhile, do sets from the second connection.
      const doSet = function() {
        ref2.set(setsDone, function() {
          setsDone++;
          if (setsDone < SETS) doSet();
        });
      };
      doSet();
    }

    ref1.set(0, function() {
      ref1.on('value', function(snap) {
        events.push(snap.val());
        if (events.length === 1 && events[0] === 0) {
          txn1(function() {
            // Sanity check stuff.
            expect(setsDone).to.equal(SETS);
            if (retries === 0) throw 'Transaction should have had to retry!';

            // Validate we got the correct events.
            for (let i = 0; i < SETS; i++) {
              expect(events[i]).to.equal(i);
            }
            expect(events[SETS]).to.equal('txn result');

            restoreHash();
            done();
          });
        }
      });
    });
  });

  it('Transaction from value callback.', function(done) {
    const ref = getRandomNode() as Reference;
    const COUNT = 1;
    ref.on('value', function(snap) {
      let shouldCommit = true;
      ref.transaction(
        function(current) {
          if (current == null) {
            return 0;
          } else if (current < COUNT) {
            return current + 1;
          } else {
            shouldCommit = false;
          }

          if (snap.val() === COUNT) {
            done();
          }
        },
        function(error, committed, snap) {
          expect(committed).to.equal(shouldCommit);
        }
      );
    });
  });

  it('Transaction runs on null only once after reconnect (Case 1981).', async function() {
    if (!canCreateExtraConnections()) return;

    const ref = getRandomNode() as Reference;
    await ref.set(42);
    const newRef = getFreshRepoFromReference(ref);
    let run = 0;
    return newRef.transaction(
      function(curr) {
        run++;
        if (run === 1) {
          expect(curr).to.equal(null);
        } else if (run === 2) {
          expect(curr).to.equal(42);
        }
        return 3.14;
      },
      function(error, committed, resultSnapshot) {
        expect(error).to.equal(null);
        expect(committed).to.equal(true);
        expect(run).to.equal(2);
        expect(resultSnapshot.val()).to.equal(3.14);
      }
    );
  });

  // Provided by bk@thinkloop.com, this was failing when we sent puts before listens, but passes now.
  it('makeFriends user test case.', function() {
    const ea = EventAccumulatorFactory.waitsForCount(12);
    if (!canCreateExtraConnections()) return;

    function makeFriends(accountID, friendAccountIDs, firebase) {
      let friendAccountID;

      // add friend relationships
      for (let i in friendAccountIDs) {
        if (friendAccountIDs.hasOwnProperty(i)) {
          friendAccountID = friendAccountIDs[i];
          makeFriend(friendAccountID, accountID, firebase);
          makeFriend(accountID, friendAccountID, firebase);
        }
      }
    }

    function makeFriend(accountID, friendAccountID, firebase) {
      firebase.child(accountID).child(friendAccountID).transaction(
        function(r) {
          if (r == null) {
            r = {
              accountID: accountID,
              friendAccountID: friendAccountID,
              percentCommon: 0
            };
          }

          return r;
        },
        function(error, committed, snapshot) {
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

  it('transaction() respects .priority.', function(done) {
    const ref = getRandomNode() as Reference;
    const values = [];
    ref.on('value', function(s) {
      values.push(s.exportVal());
    });

    ref.transaction(
      function(curr) {
        expect(curr).to.equal(null);
        return { '.value': 5, '.priority': 5 };
      },
      function() {
        ref.transaction(
          function(curr) {
            expect(curr).to.equal(5);
            return { '.value': 10, '.priority': 10 };
          },
          function() {
            expect(values).to.deep.equal([
              { '.value': 5, '.priority': 5 },
              { '.value': 10, '.priority': 10 }
            ]);
            done();
          }
        );
      }
    );
  });

  it('Transaction properly reverts data when you add a deeper listen.', function(
    done
  ) {
    const refPair = getRandomNode(2) as Reference[],
      ref1 = refPair[0],
      ref2 = refPair[1];
    ref1.child('y').set('test', function() {
      ref2.transaction(function(curr) {
        if (curr === null) {
          return { x: 1 };
        }
      });

      ref2.child('y').on('value', function(s) {
        if (s.val() === 'test') {
          done();
        }
      });
    });
  });

  it('Transaction with integer keys', function(done) {
    const ref = getRandomNode() as Reference;
    ref.set({ 1: 1, 5: 5, 10: 10, 20: 20 }, function() {
      ref.transaction(
        function(current) {
          return 42;
        },
        function(error, committed) {
          expect(error).to.be.null;
          expect(committed).to.equal(true);
          done();
        }
      );
    });
  });

  it('Return null from first run of transaction.', function(done) {
    const ref = getRandomNode() as Reference;
    ref.transaction(
      function(c) {
        return null;
      },
      function(error, committed) {
        expect(error).to.equal(null);
        expect(committed).to.equal(true);
        done();
      }
    );
  });

  // https://app.asana.com/0/5673976843758/9259161251948
  it('Bubble-app transaction bug.', function(done) {
    const ref = getRandomNode() as Reference;
    ref.child('a').transaction(function() {
      return 1;
    });
    ref.child('a').transaction(function(current) {
      return current + 42;
    });
    ref.child('b').transaction(function() {
      return 7;
    });
    ref.transaction(
      function(current) {
        if (current && current.a && current.b) {
          return current.a + current.b;
        } else {
          return 'dummy';
        }
      },
      function(error, committed, snap) {
        expect(error).to.equal(null);
        expect(committed).to.equal(true);
        expect(snap.val()).to.deep.equal(50);
        done();
      }
    );
  });

  it('Transaction and priority: Can set priority in transaction on empty node', async function() {
    const ref = getRandomNode() as Reference;

    await ref.transaction(function(current) {
      return { '.value': 42, '.priority': 7 };
    });

    return ref.once('value', function(s) {
      expect(s.exportVal()).to.deep.equal({ '.value': 42, '.priority': 7 });
    });
  });

  it("Transaction and priority: Transaction doesn't change priority.", async function() {
    const ref = getRandomNode() as Reference;

    await ref.set({ '.value': 42, '.priority': 7 });

    await ref.transaction(function(current) {
      return 12;
    });

    const snap = await ref.once('value');

    expect(snap.exportVal()).to.deep.equal({ '.value': 12, '.priority': 7 });
  });

  it('Transaction and priority: Transaction can change priority on non-empty node.', async function() {
    const ref = getRandomNode() as Reference;

    await ref.set({ '.value': 42, '.priority': 7 });

    await ref.transaction(function(current) {
      return { '.value': 43, '.priority': 8 };
    });

    return ref.once('value', function(s) {
      expect(s.exportVal()).to.deep.equal({ '.value': 43, '.priority': 8 });
    });
  });

  it('Transaction and priority: Changing priority on siblings.', async function() {
    const ref = getRandomNode() as Reference;

    await ref.set({
      a: { '.value': 'a', '.priority': 'a' },
      b: { '.value': 'b', '.priority': 'b' }
    });

    const tx1 = ref.child('a').transaction(function(current) {
      return { '.value': 'a2', '.priority': 'a2' };
    });

    const tx2 = ref.child('b').transaction(function(current) {
      return { '.value': 'b2', '.priority': 'b2' };
    });

    await Promise.all([tx1, tx2]);

    return ref.once('value', function(s) {
      expect(s.exportVal()).to.deep.equal({
        a: { '.value': 'a2', '.priority': 'a2' },
        b: { '.value': 'b2', '.priority': 'b2' }
      });
    });
  });

  it('Transaction and priority: Leaving priority on siblings.', async function() {
    const ref = getRandomNode() as Reference;

    await ref.set({
      a: { '.value': 'a', '.priority': 'a' },
      b: { '.value': 'b', '.priority': 'b' }
    });

    const tx1 = ref.child('a').transaction(function(current) {
      return 'a2';
    });

    const tx2 = ref.child('b').transaction(function(current) {
      return 'b2';
    });

    await Promise.all([tx1, tx2]);

    return ref.once('value', function(s) {
      expect(s.exportVal()).to.deep.equal({
        a: { '.value': 'a2', '.priority': 'a' },
        b: { '.value': 'b2', '.priority': 'b' }
      });
    });
  });

  it("transaction() doesn't pick up cached data from previous once().", function(
    done
  ) {
    const refPair = getRandomNode(2) as Reference[];
    const me = refPair[0],
      other = refPair[1];
    me.set('not null', function() {
      me.once('value', function(snapshot) {
        other.set(null, function() {
          me.transaction(
            function(snapshot) {
              if (snapshot === null) {
                return 'it was null!';
              } else {
                return 'it was not null!';
              }
            },
            function(err, committed, snapshot) {
              expect(err).to.equal(null);
              expect(committed).to.equal(true);
              expect(snapshot.val()).to.deep.equal('it was null!');
              done();
            }
          );
        });
      });
    });
  });

  it("transaction() doesn't pick up cached data from previous transaction.", function(
    done
  ) {
    const refPair = getRandomNode(2) as Reference[];
    const me = refPair[0],
      other = refPair[1];
    me.transaction(
      function() {
        return 'not null';
      },
      function(err, committed) {
        expect(err).to.equal(null);
        expect(committed).to.equal(true);
        other.set(null, function() {
          me.transaction(
            function(snapshot) {
              if (snapshot === null) {
                return 'it was null!';
              } else {
                return 'it was not null!';
              }
            },
            function(err, committed, snapshot) {
              expect(err).to.equal(null);
              expect(committed).to.equal(true);
              expect(snapshot.val()).to.deep.equal('it was null!');
              done();
            }
          );
        });
      }
    );
  });

  it('server values: local timestamp should eventually (but not immediately) match the server with txns', function(
    done
  ) {
    const refPair = getRandomNode(2) as Reference[],
      writer = refPair[0],
      reader = refPair[1],
      readSnaps = [],
      writeSnaps = [];

    const evaluateCompletionCriteria = function() {
      if (readSnaps.length === 1 && writeSnaps.length === 2) {
        expect(
          Math.abs(new Date().getTime() - writeSnaps[0].val()) < 10000
        ).to.equal(true);
        expect(
          Math.abs(new Date().getTime() - writeSnaps[0].getPriority()) < 10000
        ).to.equal(true);
        expect(
          Math.abs(new Date().getTime() - writeSnaps[1].val()) < 10000
        ).to.equal(true);
        expect(
          Math.abs(new Date().getTime() - writeSnaps[1].getPriority()) < 10000
        ).to.equal(true);

        expect(writeSnaps[0].val() === writeSnaps[1].val()).to.equal(false);
        expect(
          writeSnaps[0].getPriority() === writeSnaps[1].getPriority()
        ).to.equal(false);
        expect(writeSnaps[1].val() === readSnaps[0].val()).to.equal(true);
        expect(
          writeSnaps[1].getPriority() === readSnaps[0].getPriority()
        ).to.equal(true);
        done();
      }
    };

    // 1st non-null event = actual server timestamp
    reader.on('value', function(snap) {
      if (snap.val() === null) return;
      readSnaps.push(snap);
      evaluateCompletionCriteria();
    });

    // 1st non-null event = local timestamp estimate
    // 2nd non-null event = actual server timestamp
    writer.on('value', function(snap) {
      if (snap.val() === null) return;
      writeSnaps.push(snap);
      evaluateCompletionCriteria();
    });

    // Generate the server value offline to make sure there's a time gap between the client's guess of the timestamp
    // and the server's actual timestamp.
    writer.database.goOffline();

    writer.transaction(function(current) {
      return {
        '.value': (firebase as any).database.ServerValue.TIMESTAMP,
        '.priority': (firebase as any).database.ServerValue.TIMESTAMP
      };
    });

    writer.database.goOnline();
  });

  it("transaction() still works when there's a query listen.", function(done) {
    const ref = getRandomNode() as Reference;

    ref.set(
      {
        a: 1,
        b: 2
      },
      function() {
        ref.limitToFirst(1).on('child_added', function() {});

        ref.child('a').transaction(
          function(current) {
            return current;
          },
          function(error, committed, snapshot) {
            expect(error).to.equal(null);
            expect(committed).to.equal(true);
            if (!error) {
              expect(snapshot.val()).to.deep.equal(1);
            }
            done();
          },
          false
        );
      }
    );
  });

  it("transaction() on queried location doesn't run initially on null (firebase-worker-queue depends on this).", function(
    done
  ) {
    const ref = getRandomNode() as Reference;
    ref.push({ a: 1, b: 2 }, function() {
      ref.startAt().limitToFirst(1).on('child_added', function(snap) {
        snap.ref.transaction(
          function(current) {
            expect(current).to.deep.equal({ a: 1, b: 2 });
            return null;
          },
          function(error, committed, snapshot) {
            expect(error).to.equal(null);
            expect(committed).to.equal(true);
            expect(snapshot.val()).to.equal(null);
            done();
          }
        );
      });
    });
  });

  it('transactions raise correct child_changed events on queries', async function() {
    const ref = getRandomNode() as Reference;

    const value = { foo: { value: 1 } };
    const snapshots = [];

    await ref.set(value);

    const query = ref.endAt(Number.MIN_VALUE);
    query.on('child_added', function(snapshot) {
      snapshots.push(snapshot);
    });

    query.on('child_changed', function(snapshot) {
      snapshots.push(snapshot);
    });

    await ref.child('foo').transaction(
      function(current) {
        return { value: 2 };
      },
      function(error, committed, snapshot) {
        expect(error).to.equal(null);
        expect(committed).to.equal(true);
      },
      false
    );

    expect(snapshots.length).to.equal(2);
    const addedSnapshot = snapshots[0];
    expect(addedSnapshot.key).to.equal('foo');
    expect(addedSnapshot.val()).to.deep.equal({ value: 1 });
    const changedSnapshot = snapshots[1];
    expect(changedSnapshot.key).to.equal('foo');
    expect(changedSnapshot.val()).to.deep.equal({ value: 2 });
  });

  it('transactions can use local merges', function(done) {
    const ref = getRandomNode() as Reference;

    ref.update({ foo: 'bar' });

    ref.child('foo').transaction(
      function(current) {
        expect(current).to.equal('bar');
        return current;
      },
      function(error, committed, snapshot) {
        expect(error).to.equal(null);
        expect(committed).to.equal(true);
        done();
      }
    );
  });

  it('transactions works with merges without the transaction path', function(
    done
  ) {
    const ref = getRandomNode() as Reference;

    ref.update({ foo: 'bar' });

    ref.child('non-foo').transaction(
      function(current) {
        expect(current).to.equal(null);
        return current;
      },
      function(error, committed, snapshot) {
        expect(error).to.equal(null);
        expect(committed).to.equal(true);
        done();
      }
    );
  });

  //See https://app.asana.com/0/15566422264127/23303789496881
  it('out of order remove writes are handled correctly', function(done) {
    const ref = getRandomNode() as Reference;

    ref.set({ foo: 'bar' });
    ref.transaction(
      function() {
        return 'transaction-1';
      },
      function() {}
    );
    ref.transaction(
      function() {
        return 'transaction-2';
      },
      function() {}
    );

    // This will trigger an abort of the transaction which should not cause the client to crash
    ref.update({ qux: 'quu' }, function(error) {
      expect(error).to.equal(null);
      done();
    });
  });
});
