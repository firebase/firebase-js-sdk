/**
 * @license
 * Copyright 2026 Google LLC
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

import { deleteApp, FirebaseApp } from '@firebase/app';
import { expect } from 'chai';

import {
  DataSnapshot,
  Query,
  getDatabase,
  goOffline,
  onChildAdded,
  orderByChild,
  orderByValue,
  query,
  ref,
  set
} from '../src';

import { createTestApp } from './exp/integration.test';

/**
 * Exercises the snapshots handed to child event listeners (`onChildAdded` and
 * friends) for queries that use an explicit `orderBy*()`.
 *
 * These run entirely against the local cache: `goOffline()` is called before
 * any write, so listeners fire from the locally applied `set()` and no
 * emulator or network access is needed. Because the client is offline the
 * promise returned by `set()` stays pending until a server ack that never
 * arrives, so it is deliberately not awaited.
 */
describe('Child event snapshots', () => {
  let app: FirebaseApp;

  beforeEach(() => {
    app = createTestApp();
  });

  afterEach(async () => {
    if (app) {
      await deleteApp(app);
    }
  });

  /**
   * Resolves with the first snapshot delivered to a child_added listener on
   * `q`, then unsubscribes.
   *
   * The listener is torn down from `finally` rather than from inside the
   * callback: `onChildAdded` dispatches synchronously when the location is
   * already cached, and in that case the callback runs before `unsubscribe`
   * has been bound.
   *
   * A cancelled listener rejects rather than leaving the promise pending, so
   * a failure surfaces as the underlying error instead of a test timeout.
   */
  async function firstChildAdded(q: Query): Promise<DataSnapshot> {
    let unsubscribe: (() => void) | undefined;
    try {
      return await new Promise<DataSnapshot>((resolve, reject) => {
        unsubscribe = onChildAdded(
          q,
          snapshot => resolve(snapshot),
          error => reject(error)
        );
      });
    } finally {
      unsubscribe?.();
    }
  }

  /** Applies a write to the local cache without waiting for a server ack. */
  function writeLocally(location: ReturnType<typeof ref>, value: unknown) {
    // The returned promise only settles once the client reconnects, and is
    // rejected when the app is torn down in `afterEach`. Neither is
    // interesting here, so the result is intentionally discarded.
    set(location, value).catch(() => {});
  }

  it('supports forEach() on child_added snapshots from an orderByChild() query', async () => {
    const db = getDatabase(app);
    goOffline(db);

    const itemsRef = ref(db, 'items');
    const snapshotPromise = firstChildAdded(
      query(itemsRef, orderByChild('createdAt'))
    );

    writeLocally(itemsRef, {
      item1: { createdAt: 1741445778252, name: 'first' }
    });

    const snapshot = await snapshotPromise;

    const seen: Array<[string | null, unknown]> = [];
    expect(() =>
      snapshot.forEach(child => {
        seen.push([child.key, child.val()]);
      })
    ).to.not.throw();
    expect(seen).to.deep.equal([
      ['createdAt', 1741445778252],
      ['name', 'first']
    ]);
  });

  it('supports forEach() on child_added snapshots from an orderByValue() query', async () => {
    const db = getDatabase(app);
    goOffline(db);

    const scoresRef = ref(db, 'scores');
    const snapshotPromise = firstChildAdded(query(scoresRef, orderByValue()));

    writeLocally(scoresRef, { player1: { a: 1, b: 2 } });

    const snapshot = await snapshotPromise;

    const keys: Array<string | null> = [];
    expect(() =>
      snapshot.forEach(child => {
        keys.push(child.key);
      })
    ).to.not.throw();
    expect(keys).to.deep.equal(['a', 'b']);
  });

  it('orders the children of a child_added snapshot by key, not by the query index', async () => {
    const db = getDatabase(app);
    goOffline(db);

    const itemsRef = ref(db, 'ordered');
    const snapshotPromise = firstChildAdded(
      query(itemsRef, orderByChild('createdAt'))
    );

    // `zebra` sorts last by key, which is the ordering a snapshot of `item1`
    // should use -- the query's `createdAt` index applies to the children of
    // `ordered`, not to the fields of `item1`.
    writeLocally(itemsRef, { item1: { createdAt: 3, apple: 1, zebra: 2 } });

    const snapshot = await snapshotPromise;

    const keys: Array<string | null> = [];
    snapshot.forEach(child => {
      keys.push(child.key);
    });
    expect(keys).to.deep.equal(['apple', 'createdAt', 'zebra']);
  });
});
