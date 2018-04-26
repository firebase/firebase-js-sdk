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
import { User } from '../../../src/auth/user';
import { Query } from '../../../src/core/query';
import { BatchId } from '../../../src/core/types';
import { EagerGarbageCollector } from '../../../src/local/eager_garbage_collector';
import { IndexedDbMutationQueue } from '../../../src/local/indexeddb_mutation_queue';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { DbMutationBatch } from '../../../src/local/indexeddb_schema';
import { Persistence } from '../../../src/local/persistence';
import { SimpleDbTransaction } from '../../../src/local/simple_db';
import {
  BATCHID_UNKNOWN,
  MutationBatch
} from '../../../src/model/mutation_batch';
import { emptyByteString } from '../../../src/platform/platform';
import {
  expectEqualArrays,
  expectSetToEqual,
  key,
  patchMutation,
  path,
  setMutation
} from '../../util/helpers';

import * as persistenceHelpers from './persistence_test_helpers';
import { TestMutationQueue } from './test_mutation_queue';
import { addEqualityMatcher } from '../../util/equality_matcher';

let persistence: Persistence;
let mutationQueue: TestMutationQueue;

describe('MemoryMutationQueue', () => {
  beforeEach(() => {
    return persistenceHelpers.testMemoryPersistence().then(p => {
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

  describe('loadNextBatchIdFromDb', () => {
    function loadNextBatchId(): Promise<BatchId> {
      return persistence.runTransaction('loadNextBatchIdFromDb', txn => {
        return IndexedDbMutationQueue.loadNextBatchIdFromDb(txn).next(
          batchId => {
            return batchId;
          }
        );
      });
    }

    function addDummyBatch(userId: string, batchId: BatchId): Promise<void> {
      return persistence.runTransaction('addDummyBatch', transaction => {
        const txn = transaction as SimpleDbTransaction;
        const store = txn.store<[string, number], DbMutationBatch>(
          DbMutationBatch.store
        );
        const localWriteTime = Date.now();
        return store.put(
          new DbMutationBatch(userId, batchId, localWriteTime, [])
        );
      });
    }

    it('returns zero when no mutations.', async () => {
      const batchId = await loadNextBatchId();
      expect(batchId).to.equal(0);
    });

    it('finds next id after single mutation batch', async () => {
      await addDummyBatch('foo', 6);
      expect(await loadNextBatchId()).to.equal(7);
    });

    it('finds max across users', async () => {
      await addDummyBatch('fo', 5);
      await addDummyBatch('food', 3);

      await addDummyBatch('foo', 6);
      await addDummyBatch('foo', 2);
      await addDummyBatch('foo', 1);

      expect(await loadNextBatchId()).to.equal(7);
    });
  });
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
    return mutationQueue.start();
  });

  afterEach(() => persistence.shutdown(true));

  it('can count batches', async () => {
    expect(await mutationQueue.countBatches()).to.equal(0);
    expect(await mutationQueue.checkEmpty()).to.equal(true);

    const batch1 = await addMutationBatch();
    expect(await mutationQueue.countBatches()).to.equal(1);
    expect(await mutationQueue.checkEmpty()).to.equal(false);

    const batch2 = await addMutationBatch();
    expect(await mutationQueue.countBatches()).to.equal(2);

    await mutationQueue.removeMutationBatches([batch2]);
    expect(await mutationQueue.countBatches()).to.equal(1);

    await mutationQueue.removeMutationBatches([batch1]);
    expect(await mutationQueue.countBatches()).to.equal(0);
  });

  it('can acknowledge batches through batchId', async () => {
    // Initial state of an empty queue
    expect(await mutationQueue.getHighestAcknowledgedBatchId()).to.equal(
      BATCHID_UNKNOWN
    );

    // Adding mutation batches should not change the highest acked batchID.
    const batch1 = await addMutationBatch();
    const batch2 = await addMutationBatch();
    const batch3 = await addMutationBatch();
    expect(batch1.batchId).to.be.greaterThan(BATCHID_UNKNOWN);
    expect(batch2.batchId).to.be.greaterThan(batch1.batchId);
    expect(batch3.batchId).to.be.greaterThan(batch2.batchId);

    expect(await mutationQueue.getHighestAcknowledgedBatchId()).to.equal(
      BATCHID_UNKNOWN
    );

    mutationQueue.acknowledgeBatch(batch1, emptyByteString());
    expect(await mutationQueue.getHighestAcknowledgedBatchId()).to.equal(
      batch1.batchId
    );

    mutationQueue.acknowledgeBatch(batch2, emptyByteString());
    expect(await mutationQueue.getHighestAcknowledgedBatchId()).to.equal(
      batch2.batchId
    );

    await mutationQueue.removeMutationBatches([batch1]);
    expect(await mutationQueue.getHighestAcknowledgedBatchId()).to.equal(
      batch2.batchId
    );

    await mutationQueue.removeMutationBatches([batch2]);
    expect(await mutationQueue.getHighestAcknowledgedBatchId()).to.equal(
      batch2.batchId
    );

    // Batch 3 never acknowledged.
    await mutationQueue.removeMutationBatches([batch3]);
    expect(await mutationQueue.getHighestAcknowledgedBatchId()).to.equal(
      batch2.batchId
    );
  });

  it('can acknowledge then remove', async () => {
    const batch1 = await addMutationBatch();
    expect(await mutationQueue.countBatches()).to.equal(1);
    expect(await mutationQueue.getHighestAcknowledgedBatchId()).to.equal(
      BATCHID_UNKNOWN
    );

    await mutationQueue.acknowledgeBatch(batch1, emptyByteString());
    await mutationQueue.removeMutationBatches([batch1]);

    expect(await mutationQueue.countBatches()).to.equal(0);
    expect(await mutationQueue.getHighestAcknowledgedBatchId()).to.equal(
      batch1.batchId
    );
  });

  it('getHighestAcknowledgedBatchId() never exceeds getNextBatchId()', async () => {
    const batch1 = await addMutationBatch();
    const batch2 = await addMutationBatch();
    await mutationQueue.acknowledgeBatch(batch1, emptyByteString());
    await mutationQueue.acknowledgeBatch(batch2, emptyByteString());
    expect(await mutationQueue.getHighestAcknowledgedBatchId()).to.equal(
      batch2.batchId
    );

    await mutationQueue.removeMutationBatches([batch1, batch2]);
    expect(await mutationQueue.getHighestAcknowledgedBatchId()).to.equal(
      batch2.batchId
    );

    // Restart the queue so that nextBatchID will be reset.
    mutationQueue = new TestMutationQueue(
      persistence,
      persistence.getMutationQueue(new User('user'))
    );
    await mutationQueue.start();

    // Verify that on restart with an empty queue, nextBatchID falls to a
    // lower value.
    expect(await mutationQueue.getNextBatchId()).to.be.lessThan(batch2.batchId);

    // As a result highestAcknowledgedBatchID must also reset lower.
    expect(await mutationQueue.getHighestAcknowledgedBatchId()).to.equal(
      BATCHID_UNKNOWN
    );

    // The mutation queue will reset the next batchID after all mutations
    // are removed so adding another mutation will cause a collision.
    const newBatch = await addMutationBatch();
    expect(newBatch.batchId).to.equal(batch1.batchId);

    // Restart the queue with one unacknowledged batch in it.
    mutationQueue = new TestMutationQueue(
      persistence,
      persistence.getMutationQueue(new User('user'))
    );
    await mutationQueue.start();

    expect(await mutationQueue.getNextBatchId()).to.equal(newBatch.batchId + 1);

    // highestAcknowledgedBatchID must still be BATCHID_UNKNOWN.
    expect(await mutationQueue.getHighestAcknowledgedBatchId()).to.equal(
      BATCHID_UNKNOWN
    );
  });

  it('can lookup mutation batch', async () => {
    // Searching on an empty queue should not find a non-existent batch
    let notFound = await mutationQueue.lookupMutationBatch(42);
    expect(notFound).to.be.null;

    const batches = await createBatches(10);
    const removed = await makeHolesInBatches([2, 6, 7], batches);

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

    // This is an array of successors assuming the removals below will happen:
    const afters = [batches[3], batches[8], batches[8]];
    const removed = await makeHolesInBatches([2, 6, 7], batches);

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
      const next = afters[i];
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

  it('getNextMutationBatchAfterBatchId() skips acknowledged batches', async () => {
    const batches = await createBatches(3);
    expect(
      await mutationQueue.getNextMutationBatchAfterBatchId(BATCHID_UNKNOWN)
    ).to.deep.equal(batches[0]);

    await mutationQueue.acknowledgeBatch(batches[0], emptyByteString());
    expect(
      await mutationQueue.getNextMutationBatchAfterBatchId(BATCHID_UNKNOWN)
    ).to.deep.equal(batches[1]);
    expect(
      await mutationQueue.getNextMutationBatchAfterBatchId(batches[0].batchId)
    ).to.deep.equal(batches[1]);
    expect(
      await mutationQueue.getNextMutationBatchAfterBatchId(batches[1].batchId)
    ).to.deep.equal(batches[2]);
  });

  it('can getAllMutationBatchesThroughBatchId()', async () => {
    const batches = await createBatches(10);
    await makeHolesInBatches([2, 6, 7], batches);

    let found = [],
      expected = [];

    found = await mutationQueue.getAllMutationBatchesThroughBatchId(
      batches[0].batchId - 1
    );
    expectEqualArrays(found, []);

    for (let i = 0; i < batches.length; i++) {
      found = await mutationQueue.getAllMutationBatchesThroughBatchId(
        batches[i].batchId
      );
      expected = batches.slice(0, i + 1);
      expectEqualArrays(found, expected, 'for index ' + i);
    }
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
    expect(matches.length).to.deep.equal(expected.length);
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

  it('can emits garbage events while removing mutation batches', async () => {
    const gc = new EagerGarbageCollector();
    gc.addGarbageSource(mutationQueue.queue);
    const batches = [
      await addMutationBatch('foo/bar'),
      await addMutationBatch('foo/ba'),
      await addMutationBatch('foo/bar2'),
      await addMutationBatch('foo/bar'),
      await addMutationBatch('foo/bar/suffix/baz'),
      await addMutationBatch('foo/baz')
    ];

    await mutationQueue.removeMutationBatches([batches[0]]);
    expectSetToEqual(await mutationQueue.collectGarbage(gc), []);

    await mutationQueue.removeMutationBatches([batches[1]]);
    expectSetToEqual(await mutationQueue.collectGarbage(gc), [key('foo/ba')]);

    await mutationQueue.removeMutationBatches([batches[5]]);
    expectSetToEqual(await mutationQueue.collectGarbage(gc), [key('foo/baz')]);

    await mutationQueue.removeMutationBatches([batches[2], batches[3]]);
    expectSetToEqual(await mutationQueue.collectGarbage(gc), [
      key('foo/bar'),
      key('foo/bar2')
    ]);

    batches.push(await addMutationBatch('foo/bar/suffix/baz'));
    expectSetToEqual(await mutationQueue.collectGarbage(gc), []);

    await mutationQueue.removeMutationBatches([batches[4], batches[6]]);
    expectSetToEqual(await mutationQueue.collectGarbage(gc), [
      key('foo/bar/suffix/baz')
    ]);

    gc.removeGarbageSource(mutationQueue.queue);
  });

  it('can save the last stream token', async () => {
    const streamToken1 = 'token1';
    const streamToken2 = 'token2';

    await mutationQueue.setLastStreamToken(streamToken1);

    const batch1 = await addMutationBatch();

    expect(await mutationQueue.getLastStreamToken()).to.deep.equal(
      streamToken1
    );

    await mutationQueue.acknowledgeBatch(batch1, streamToken2);

    expect(await mutationQueue.getHighestAcknowledgedBatchId()).to.deep.equal(
      batch1.batchId
    );
    expect(await mutationQueue.getLastStreamToken()).to.deep.equal(
      streamToken2
    );
  });

  it('can removeMutationBatches()', async () => {
    const batches = await createBatches(10);
    const last = batches[batches.length - 1];

    await mutationQueue.removeMutationBatches([batches[0]]);
    batches.splice(0, 1);
    expect(await mutationQueue.countBatches()).to.equal(9);

    let found;

    found = await mutationQueue.getAllMutationBatchesThroughBatchId(
      last.batchId
    );
    expectEqualArrays(found, batches);
    expect(found.length).to.equal(9);

    await mutationQueue.removeMutationBatches([
      batches[0],
      batches[1],
      batches[2]
    ]);
    batches.splice(0, 3);
    expect(await mutationQueue.countBatches()).to.equal(6);

    found = await mutationQueue.getAllMutationBatchesThroughBatchId(
      last.batchId
    );
    expectEqualArrays(found, batches);
    expect(found.length).to.equal(6);

    await mutationQueue.removeMutationBatches([batches[batches.length - 1]]);
    batches.splice(batches.length - 1, 1);
    expect(await mutationQueue.countBatches()).to.equal(5);

    found = await mutationQueue.getAllMutationBatchesThroughBatchId(
      last.batchId
    );
    expectEqualArrays(found, batches);
    expect(found.length).to.equal(5);

    await mutationQueue.removeMutationBatches([batches[3]]);
    batches.splice(3, 1);
    expect(await mutationQueue.countBatches()).to.equal(4);

    await mutationQueue.removeMutationBatches([batches[1]]);
    batches.splice(1, 1);
    expect(await mutationQueue.countBatches()).to.equal(3);

    found = await mutationQueue.getAllMutationBatchesThroughBatchId(
      last.batchId
    );
    expectEqualArrays(found, batches);
    expect(found.length).to.equal(3);
    expect(await mutationQueue.checkEmpty()).to.equal(false);

    await mutationQueue.removeMutationBatches(batches);
    found = await mutationQueue.getAllMutationBatchesThroughBatchId(
      last.batchId
    );
    expectEqualArrays(found, []);
    expect(found.length).to.equal(0);
    expect(await mutationQueue.checkEmpty()).to.equal(true);
  });
}

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
  const batches = [];
  for (let i = 0; i < count; i++) {
    const batch = await addMutationBatch();
    batches.push(batch);
  }
  return batches;
}

/**
 * Removes entries from from the given a batches and returns them.
 *
 * @param holes An array of indexes in the batches array; in increasing order.
 * Indexes are relative to the original state of the batches array, not any
 * intermediate state that might occur.
 * @param batches The array to mutate, removing entries from it.
 * @return A new array containing all the entries that were removed from
 * batches.
 */
async function makeHolesInBatches(
  holes: number[],
  batches: MutationBatch[]
): Promise<MutationBatch[]> {
  const removed = [];
  for (let i = 0; i < holes.length; i++) {
    const index = holes[i] - i;
    const batch = batches[index];
    await mutationQueue.removeMutationBatches([batch]);

    batches.splice(index, 1);
    removed.push(batch);
  }
  return removed;
}
