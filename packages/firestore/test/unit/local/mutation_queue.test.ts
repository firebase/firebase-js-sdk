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
import { User } from '../../../src/auth/user';
import { Query } from '../../../src/core/query';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { Persistence } from '../../../src/local/persistence';
import { documentKeySet } from '../../../src/model/collections';
import { MutationBatch } from '../../../src/model/mutation_batch';
import {
  expectEqualArrays,
  key,
  patchMutation,
  path,
  setMutation
} from '../../util/helpers';

import { addEqualityMatcher } from '../../util/equality_matcher';
import * as persistenceHelpers from './persistence_test_helpers';
import { TestMutationQueue } from './test_mutation_queue';

let persistence: Persistence;
let mutationQueue: TestMutationQueue;
describe('MemoryMutationQueue', () => {
  beforeEach(() => {
    return persistenceHelpers.testMemoryEagerPersistence().then(p => {
      persistence = p;
    });
  });

  genericMutationQueueTests();
});

describe('IndexedDbMutationQueue', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping IndexedDbMutationQueue tests.');
    return;
  }

  beforeEach(() => {
    return persistenceHelpers.testIndexedDbPersistence().then(p => {
      persistence = p;
    });
  });

  genericMutationQueueTests();
});

/**
 * Defines the set of tests to run against both mutation queue
 * implementations.
 */
function genericMutationQueueTests(): void {
  addEqualityMatcher();

  beforeEach(() => {
    mutationQueue = new TestMutationQueue(
      persistence,
      persistence.getMutationQueue(new User('user'))
    );
  });

  afterEach(async () => {
    await persistence.shutdown();
    await persistenceHelpers.clearTestPersistence();
  });

  /**
   * Creates a new MutationBatch with the next batch ID and a set of dummy
   * mutations.
   */
  function addMutationBatch(key?: string): Promise<MutationBatch> {
    let keyStr = key;
    if (keyStr === undefined) {
      keyStr = 'foo/bar';
    }
    const mutation = setMutation(keyStr, { a: 1 });
    return mutationQueue.addMutationBatch([mutation]);
  }

  /**
   * Creates an array of batches containing count dummy MutationBatches. Each
   * has a different batchID.
   */
  async function createBatches(count: number): Promise<MutationBatch[]> {
    const batches: MutationBatch[] = [];
    for (let i = 0; i < count; i++) {
      const batch = await addMutationBatch();
      batches.push(batch);
    }
    return batches;
  }

  /**
   * Removes the first n entries from the given batches and returns them.
   *
   * @param n The number of batches to remove.
   * @param batches The array to mutate, removing entries from it.
   * @return A new array containing all the entries that were removed from
   * batches.
   */
  async function removeFirstBatches(
    n: number,
    batches: MutationBatch[]
  ): Promise<MutationBatch[]> {
    const removed: MutationBatch[] = [];
    for (let i = 0; i < n; i++) {
      const batch = batches[0];
      await mutationQueue.removeMutationBatch(batch);
      batches.shift();
      removed.push(batch);
    }
    return removed;
  }

  it('can count batches', async () => {
    expect(await mutationQueue.countBatches()).to.equal(0);
    expect(await mutationQueue.checkEmpty()).to.equal(true);

    const batch1 = await addMutationBatch();
    expect(await mutationQueue.countBatches()).to.equal(1);
    expect(await mutationQueue.checkEmpty()).to.equal(false);

    const batch2 = await addMutationBatch();
    expect(await mutationQueue.countBatches()).to.equal(2);

    await mutationQueue.removeMutationBatch(batch1);
    expect(await mutationQueue.countBatches()).to.equal(1);

    await mutationQueue.removeMutationBatch(batch2);
    expect(await mutationQueue.countBatches()).to.equal(0);
  });

  it('can lookup mutation batch', async () => {
    // Searching on an empty queue should not find a non-existent batch
    let notFound = await mutationQueue.lookupMutationBatch(42);
    expect(notFound).to.be.null;

    const batches = await createBatches(10);
    const removed = await removeFirstBatches(3, batches);

    // After removing, a batch should not be found
    for (const batch of removed) {
      const notFound = await mutationQueue.lookupMutationBatch(batch.batchId);
      expect(notFound).to.be.null;
    }

    // Remaining entries should still be found
    for (const batch of batches) {
      const found = await mutationQueue.lookupMutationBatch(batch.batchId);
      expect(found!.batchId).to.equal(batch.batchId);
    }

    // Even on a nonempty queue searching should not find a non-existent batch
    notFound = await mutationQueue.lookupMutationBatch(42);
    expect(notFound).to.be.null;
  });

  it('can getNextMutationBatchAfterBatchId()', async () => {
    const batches = await createBatches(10);
    const removed = await removeFirstBatches(3, batches);

    for (let i = 0; i < batches.length - 1; i++) {
      const current = batches[i];
      const next = batches[i + 1];
      const found = await mutationQueue.getNextMutationBatchAfterBatchId(
        current.batchId
      );
      expect(found!.batchId).to.equal(next.batchId);
    }

    for (let i = 0; i < removed.length; i++) {
      const current = removed[i];
      const next = batches[0];
      const found = await mutationQueue.getNextMutationBatchAfterBatchId(
        current.batchId
      );
      expect(found!.batchId).to.equal(next.batchId);
    }

    const first = batches[0];
    const found = await mutationQueue.getNextMutationBatchAfterBatchId(
      first.batchId - 42
    );
    expect(found!.batchId).to.equal(first.batchId);

    const last = batches[batches.length - 1];
    const notFound = await mutationQueue.getNextMutationBatchAfterBatchId(
      last.batchId
    );
    expect(notFound).to.be.null;
  });

  it('can getAllMutationBatchesAffectingDocumentKey()', async () => {
    const mutations = [
      setMutation('fob/bar', { a: 1 }),
      setMutation('foo/bar', { a: 1 }),
      patchMutation('foo/bar', { b: 1 }),
      setMutation('foo/bar/suffix/key', { a: 1 }),
      setMutation('foo/baz', { a: 1 }),
      setMutation('food/bar', { a: 1 })
    ];
    // Store all the mutations.
    const batches: MutationBatch[] = [];
    for (const mutation of mutations) {
      const batch = await mutationQueue.addMutationBatch([mutation]);
      batches.push(batch);
    }
    const expected = [batches[1], batches[2]];
    const matches = await mutationQueue.getAllMutationBatchesAffectingDocumentKey(
      key('foo/bar')
    );
    expectEqualArrays(matches, expected);
  });

  it('can getAllMutationBatchesAffectingDocumentKeys()', async () => {
    const mutations = [
      setMutation('fob/bar', { a: 1 }),
      setMutation('foo/bar', { a: 1 }),
      patchMutation('foo/bar', { b: 1 }),
      setMutation('foo/bar/suffix/key', { a: 1 }),
      setMutation('foo/baz', { a: 1 }),
      setMutation('food/bar', { a: 1 })
    ];
    // Store all the mutations.
    const batches: MutationBatch[] = [];
    for (const mutation of mutations) {
      const batch = await mutationQueue.addMutationBatch([mutation]);
      batches.push(batch);
    }
    const expected = [batches[1], batches[2], batches[4]];
    const matches = await mutationQueue.getAllMutationBatchesAffectingDocumentKeys(
      documentKeySet().add(key('foo/bar')).add(key('foo/baz'))
    );
    expectEqualArrays(matches, expected);
  });

  it('can getAllMutationBatchesAffectingQuery()', async () => {
    const mutations = [
      setMutation('fob/bar', { a: 1 }),
      setMutation('foo/bar', { a: 1 }),
      patchMutation('foo/bar', { b: 1 }),
      setMutation('foo/bar/suffix/key', { a: 1 }),
      setMutation('foo/baz', { a: 1 }),
      setMutation('food/bar', { a: 1 })
    ];
    // Store all the mutations.
    const batches: MutationBatch[] = [];
    for (const mutation of mutations) {
      const batch = await mutationQueue.addMutationBatch([mutation]);
      batches.push(batch);
    }
    const expected = [batches[1], batches[2], batches[4]];
    const query = Query.atPath(path('foo'));
    const matches = await mutationQueue.getAllMutationBatchesAffectingQuery(
      query
    );
    expectEqualArrays(matches, expected);
  });

  it('can getAllMutationBatchesAffectingQuery() with compound batches', async () => {
    const value = { a: 1 };
    const batch1 = await mutationQueue.addMutationBatch([
      setMutation('foo/bar', value),
      setMutation('foo/bar/baz/quux', value)
    ]);
    const batch2 = await mutationQueue.addMutationBatch([
      setMutation('foo/bar', value),
      setMutation('foo/baz', value)
    ]);
    const expected = [batch1, batch2];
    const query = Query.atPath(path('foo'));
    const matches = await mutationQueue.getAllMutationBatchesAffectingQuery(
      query
    );
    expectEqualArrays(matches, expected);
  });

  it('can removeMutationBatch()', async () => {
    const batches = await createBatches(10);

    await mutationQueue.removeMutationBatch(batches[0]);
    batches.splice(0, 1);
    expect(await mutationQueue.countBatches()).to.equal(9);

    let found;

    found = await mutationQueue.getAllMutationBatches();
    expectEqualArrays(found, batches);
    expect(found.length).to.equal(9);

    await mutationQueue.removeMutationBatch(batches[0]);
    await mutationQueue.removeMutationBatch(batches[1]);
    await mutationQueue.removeMutationBatch(batches[2]);
    batches.splice(0, 3);
    expect(await mutationQueue.countBatches()).to.equal(6);

    found = await mutationQueue.getAllMutationBatches();
    expectEqualArrays(found, batches);
    expect(found.length).to.equal(6);

    await mutationQueue.removeMutationBatch(batches[0]);
    batches.shift();
    expect(await mutationQueue.countBatches()).to.equal(5);

    found = await mutationQueue.getAllMutationBatches();
    expectEqualArrays(found, batches);
    expect(found.length).to.equal(5);

    await mutationQueue.removeMutationBatch(batches[0]);
    batches.shift();
    expect(await mutationQueue.countBatches()).to.equal(4);

    await mutationQueue.removeMutationBatch(batches[0]);
    batches.shift();
    expect(await mutationQueue.countBatches()).to.equal(3);

    found = await mutationQueue.getAllMutationBatches();
    expectEqualArrays(found, batches);
    expect(found.length).to.equal(3);
    expect(await mutationQueue.checkEmpty()).to.equal(false);

    for (const batch of batches) {
      await mutationQueue.removeMutationBatch(batch);
    }
    found = await mutationQueue.getAllMutationBatches();
    expectEqualArrays(found, []);
    expect(found.length).to.equal(0);
    expect(await mutationQueue.checkEmpty()).to.equal(true);
  });
}
