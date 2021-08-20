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

import { expect } from 'chai';

import { Reference } from '../src/api/Reference';

import { getRandomNode, getRootNode } from './helpers/util';

/**
 * This test suite is super flakey, random test fail at random times for
 * no predicatble reason. Skipping for now but adding todo to come back
 * later and fix this
 */
// TODO: Fix the flakey test suite
describe.skip('Promise Tests', () => {
  it('wraps Query.once', () => {
    return (getRandomNode() as Reference).once('value').then(snap => {
      expect(snap.val()).to.equal(null);
    });
  });

  it('wraps Firebase.set', () => {
    const ref = getRandomNode() as Reference;
    return ref
      .set(5)
      .then(() => {
        return ref.once('value');
      })
      .then(read => {
        expect(read.val()).to.equal(5);
      });
  });

  it('wraps Firebase.push when no value is passed', () => {
    const ref = getRandomNode() as Reference;
    const pushed = ref.push();
    return pushed
      .then(childRef => {
        expect(pushed.ref.parent.toString()).to.equal(ref.toString());
        expect(pushed.toString()).to.equal(childRef.toString());
        return pushed.once('value');
      })
      .then(snap => {
        expect(snap.val()).to.equal(null);
        expect(snap.ref.toString()).to.equal(pushed.toString());
      });
  });

  it('wraps Firebase.push when a value is passed', () => {
    const ref = getRandomNode() as Reference;
    const pushed = ref.push(6);
    return pushed
      .then(childRef => {
        expect(pushed.ref.parent.toString()).to.equal(ref.toString());
        expect(pushed.toString()).to.equal(childRef.toString());
        return pushed.once('value');
      })
      .then(snap => {
        expect(snap.val()).to.equal(6);
        expect(snap.ref.toString()).to.equal(pushed.toString());
      });
  });

  it('wraps Firebase.remove', () => {
    const ref = getRandomNode() as Reference;
    return ref
      .set({ a: 'b' })
      .then(() => {
        const p = ref.child('a').remove();
        expect(typeof p.then === 'function').to.equal(true);
        return p;
      })
      .then(() => {
        return ref.once('value');
      })
      .then(snap => {
        expect(snap.val()).to.equal(null);
      });
  });

  it('wraps Firebase.update', () => {
    const ref = getRandomNode() as Reference;
    return ref
      .set({ a: 'b' })
      .then(() => {
        const p = ref.update({ c: 'd' });
        expect(typeof p.then === 'function').to.equal(true);
        return p;
      })
      .then(() => {
        return ref.once('value');
      })
      .then(snap => {
        expect(snap.val()).to.deep.equal({ a: 'b', c: 'd' });
      });
  });

  it('wraps Fireabse.setPriority', () => {
    const ref = getRandomNode() as Reference;
    return ref
      .set({ a: 'b' })
      .then(() => {
        const p = ref.child('a').setPriority(5);
        expect(typeof p.then === 'function').to.equal(true);
        return p;
      })
      .then(() => {
        return ref.once('value');
      })
      .then(snap => {
        expect(snap.child('a').getPriority()).to.equal(5);
      });
  });

  it('wraps Firebase.setWithPriority', () => {
    const ref = getRandomNode() as Reference;
    return ref
      .setWithPriority('hi', 5)
      .then(() => {
        return ref.once('value');
      })
      .then(snap => {
        expect(snap.getPriority()).to.equal(5);
        expect(snap.val()).to.equal('hi');
      });
  });

  it('wraps Firebase.transaction', () => {
    const ref = getRandomNode() as Reference;
    return ref
      .transaction(() => {
        return 5;
      })
      .then(result => {
        expect(result.committed).to.equal(true);
        expect(result.snapshot.val()).to.equal(5);
        return ref.transaction(() => {
          return undefined;
        });
      })
      .then(result => {
        expect(result.committed).to.equal(false);
      });
  });

  it('exposes catch in the return of Firebase.push', () => {
    // Catch is a pain in the bum to provide safely because "catch" is a reserved word and ES3 and below require
    // you to use quotes to define it, but the closure linter really doesn't want you to do that either.
    const ref = getRandomNode() as Reference;
    const pushed = ref.push(6);

    expect(typeof ref.then === 'function').to.equal(false);
    expect(typeof ref.catch === 'function').to.equal(false);
    expect(typeof pushed.then === 'function').to.equal(true);
    expect(typeof pushed.catch === 'function').to.equal(true);
    return pushed;
  });

  it('wraps onDisconnect.remove', () => {
    const refs = getRandomNode(2) as Reference[];
    const writer = refs[0];
    const reader = refs[1];
    const refInfo = getRootNode(0, '.info/connected');

    refInfo.once('value', snapshot => {
      expect(snapshot.val()).to.equal(true);
    });

    return writer
      .child('here today')
      .set('gone tomorrow')
      .then(() => {
        const p = writer.child('here today').onDisconnect().remove();
        expect(typeof p.then === 'function').to.equal(true);
        return p;
      })
      .then(() => {
        writer.database.goOffline();
        writer.database.goOnline();
        return reader.once('value');
      })
      .then(snap => {
        expect(snap.val()).to.equal(null);
      });
  });

  it('wraps onDisconnect.update', () => {
    const refs = getRandomNode(2) as Reference[];
    const writer = refs[0];
    const reader = refs[1];
    return writer
      .set({ foo: 'baz' })
      .then(() => {
        const p = writer.onDisconnect().update({ foo: 'bar' });
        expect(typeof p.then === 'function').to.equal(true);
        return p;
      })
      .then(() => {
        writer.database.goOffline();
        writer.database.goOnline();
        return reader.once('value');
      })
      .then(snap => {
        expect(snap.val()).to.deep.equal({ foo: 'bar' });
      });
  });

  it('wraps onDisconnect.set', () => {
    const refs = getRandomNode(2) as Reference[];
    const writer = refs[0];
    const reader = refs[1];
    return writer
      .child('hello')
      .onDisconnect()
      .set('world')
      .then(() => {
        writer.database.goOffline();
        writer.database.goOnline();
        return reader.once('value');
      })
      .then(snap => {
        expect(snap.val()).to.deep.equal({ hello: 'world' });
      });
  });

  it('wraps onDisconnect.setWithPriority', () => {
    const refs = getRandomNode(2) as Reference[];
    const writer = refs[0];
    const reader = refs[1];
    return writer
      .child('meaning of life')
      .onDisconnect()
      .setWithPriority('ultimate question', 42)
      .then(() => {
        writer.database.goOffline();
        writer.database.goOnline();
        return reader.once('value');
      })
      .then(snap => {
        expect(snap.val()).to.deep.equal({
          'meaning of life': 'ultimate question'
        });
        expect(snap.child('meaning of life').getPriority()).to.equal(42);
      });
  });
});
