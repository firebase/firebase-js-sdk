/**
 * @license
 * Copyright 2019 Google LLC
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

import { Database } from '../src/api/Database';
import { Reference } from '../src/api/Reference';

import { getRandomNode } from './helpers/util';

describe('ServerValue tests', () => {
  it('resolves timestamps locally', async () => {
    const node = getRandomNode() as Reference;
    const start = Date.now();
    const values: number[] = [];
    node.on('value', snap => {
      expect(typeof snap.val()).to.equal('number');
      values.push(snap.val() as number);
    });
    await node.set(Database.ServerValue.TIMESTAMP);
    node.off('value');

    // By the time the write is acknowledged, we should have a local and
    // server version of the timestamp.
    expect(values.length).to.equal(2);
    values.forEach(serverTime => {
      const delta = Math.abs(serverTime - start);
      expect(delta).to.be.lessThan(1000);
    });
  });

  it('handles increments without listeners', async () => {
    // Ensure that increments don't explode when the SyncTree must return a null
    // node (i.e. ChildrenNode.EMPTY_NODE) because there is not yet any synced
    // data.
    const node = getRandomNode() as Reference;
    await node.set(Database.ServerValue.increment(1));
  });

  describe('handles increments', () => {
    for (const mode of ['offline', 'online']) {
      const maybeAwait = async (p: Promise<any>) => {
        if (mode === 'online') {
          await p;
        }
      };

      it(mode, async () => {
        const node = getRandomNode() as Reference;
        if (mode === 'offline') {
          node.database.goOffline();
        }

        const addOne = Database.ServerValue.increment(1);

        const values: any = [];
        const expected: any = [];
        node.on('value', snap => values.push(snap.val()));

        // null -> increment(x) = x
        maybeAwait(node.set(addOne));
        expected.push(1);

        // x -> increment(y) = x + y
        maybeAwait(node.set(5));
        maybeAwait(node.set(addOne));
        expected.push(5);
        expected.push(6);

        // str -> increment(x) = x
        maybeAwait(node.set('hello'));
        maybeAwait(node.set(addOne));
        expected.push('hello');
        expected.push(1);

        // obj -> increment(x) = x
        maybeAwait(node.set({ 'hello': 'world' }));
        maybeAwait(node.set(addOne));
        expected.push({ 'hello': 'world' });
        expected.push(1);

        node.off('value');
        expect(values).to.deep.equal(expected);
        node.database.goOnline();
      });
    }
  });

  it('handles sparse updates', async () => {
    const node = getRandomNode() as Reference;

    let value: any = null;
    let events = 0;
    node.on('value', snap => {
      value = snap.val();
      events++;
    });

    await node.update({
      'child/increment': Database.ServerValue.increment(1),
      'literal': 5
    });
    expect(value).to.deep.equal({
      'literal': 5,
      'child': {
        'increment': 1
      }
    });

    await node.update({
      'child/increment': Database.ServerValue.increment(41)
    });
    expect(value).to.deep.equal({
      'literal': 5,
      'child': {
        'increment': 42
      }
    });

    node.off('value');

    expect(events).to.equal(2);
  });

  it('handles races', async () => {
    const node = getRandomNode() as Reference;
    const all: Array<Promise<any>> = [];
    const racers = 100;

    for (let i = 0; i < racers; i++) {
      all.push(node.set(Database.ServerValue.increment(1)));
    }
    await Promise.all(all);

    const snap = await node.once('value');
    expect(snap.val()).to.equal(racers);
  });
});
