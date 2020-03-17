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
import { getFreshRepoFromReference, getRandomNode } from './helpers/util';
import { Database } from '../src/api/Database';
import { Reference } from '../src/api/Reference';
import { nodeFromJSON } from '../src/core/snap/nodeFromJSON';

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

  it('handles increments without listeners', () => {
    // Ensure that increments don't explode when the SyncTree must return a null
    // node (i.e. ChildrenNode.EMPTY_NODE) because there is not yet any synced
    // data.
    // TODO(b/146657568): Remove getFreshRepoFromReference() call and goOffline()
    // once we have emulator support. We can also await the set() call.
    const node = getFreshRepoFromReference(getRandomNode()) as Reference;
    node.database.goOffline();

    const addOne = Database.ServerValue._increment(1);

    node.set(addOne);
  });

  it('handles increments locally', async () => {
    // TODO(b/146657568): Remove getFreshRepoFromReference() call and goOffline()
    // once we have emulator support. We can also await the set() calls.
    const node = getFreshRepoFromReference(getRandomNode()) as Reference;
    node.database.goOffline();

    const addOne = Database.ServerValue._increment(1);

    const values: any = [];
    const expected: any = [];
    node.on('value', snap => values.push(snap.val()));

    // null -> increment(x) = x
    node.set(addOne);
    expected.push(1);

    // x -> increment(y) = x + y
    node.set(5);
    node.set(addOne);
    expected.push(5);
    expected.push(6);

    // str -> increment(x) = x
    node.set('hello');
    node.set(addOne);
    expected.push('hello');
    expected.push(1);

    // obj -> increment(x) = x
    node.set({ 'hello': 'world' });
    node.set(addOne);
    expected.push({ 'hello': 'world' });
    expected.push(1);

    node.off('value');
    expect(values).to.deep.equal(expected);
  });
});
