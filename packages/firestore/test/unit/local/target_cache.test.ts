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
import { Query } from '../../../src/core/query';
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { TargetId } from '../../../src/core/types';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { Persistence } from '../../../src/local/persistence';
import { TargetData, TargetPurpose } from '../../../src/local/target_data';
import { addEqualityMatcher } from '../../util/equality_matcher';
import {
  filter,
  key,
  path,
  resumeTokenForSnapshot,
  version
} from '../../util/helpers';

import { Timestamp } from '../../../src/api/timestamp';
import { Target } from '../../../src/core/target';
import * as persistenceHelpers from './persistence_test_helpers';
import { TestTargetCache } from './test_target_cache';

describe('MemoryTargetCache', () => {
  genericTargetCacheTests(persistenceHelpers.testMemoryEagerPersistence);
});

describe('IndexedDbTargetCache', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping IndexedDbTargetCache tests.');
    return;
  }

  let persistencePromise: Promise<Persistence>;
  beforeEach(async () => {
    persistencePromise = persistenceHelpers.testIndexedDbPersistence();
  });

  genericTargetCacheTests(() => persistencePromise);

  it('persists metadata across restarts', async () => {
    const db1 = await persistencePromise;

    const targetCache1 = new TestTargetCache(db1, db1.getTargetCache());
    expect(await targetCache1.getHighestSequenceNumber()).to.equal(0);

    const originalSequenceNumber = 1234;
    const targetId = 5;
    const snapshotVersion = SnapshotVersion.fromTimestamp(new Timestamp(1, 2));
    const lastLimboFreeSnapshotVersion = SnapshotVersion.fromTimestamp(
      new Timestamp(3, 4)
    );
    const target = Query.atPath(path('rooms')).toTarget();
    const targetData = new TargetData(
      target,
      targetId,
      TargetPurpose.Listen,
      originalSequenceNumber,
      snapshotVersion,
      lastLimboFreeSnapshotVersion
    );

    await targetCache1.addTargetData(targetData);
    // Snapshot version needs to be set separately
    await targetCache1.setTargetsMetadata(
      originalSequenceNumber,
      snapshotVersion
    );
    await db1.shutdown();

    const db2 = await persistenceHelpers.testIndexedDbPersistence({
      dontPurgeData: true
    });
    const targetCache2 = new TestTargetCache(db2, db2.getTargetCache());
    expect(await targetCache2.getHighestSequenceNumber()).to.equal(
      originalSequenceNumber
    );
    const actualTargetData = await targetCache2.getTargetData(target);
    expect(targetData).to.deep.equal(actualTargetData);

    const actualSnapshotVersion = await targetCache2.getLastRemoteSnapshotVersion();
    expect(snapshotVersion.isEqual(actualSnapshotVersion)).to.be.true;
    await db2.shutdown();
    await persistenceHelpers.clearTestPersistence();
  });
});

/**
 * Defines the set of tests to run against both target cache implementations.
 */
function genericTargetCacheTests(
  persistencePromise: () => Promise<Persistence>
): void {
  addEqualityMatcher();
  let cache: TestTargetCache;

  const QUERY_ROOMS = Query.atPath(path('rooms')).toTarget();
  const QUERY_HALLS = Query.atPath(path('halls')).toTarget();
  const QUERY_GARAGES = Query.atPath(path('garages')).toTarget();

  /**
   * Creates a new TargetData object from the the given parameters, synthesizing
   * a resume token from the snapshot version.
   */
  let previousSequenceNumber = 0;
  function testTargetData(
    target: Target,
    targetId: TargetId,
    testVersion?: number
  ): TargetData {
    if (testVersion === undefined) {
      testVersion = 0;
    }
    const snapshotVersion = version(testVersion);
    const resumeToken = resumeTokenForSnapshot(snapshotVersion);
    return new TargetData(
      target,
      targetId,
      TargetPurpose.Listen,
      ++previousSequenceNumber,
      snapshotVersion,
      /* lastLimboFreeSnapshotVersion= */ SnapshotVersion.min(),
      resumeToken
    );
  }

  let persistence: Persistence;
  beforeEach(async () => {
    persistence = await persistencePromise();
    cache = new TestTargetCache(persistence, persistence.getTargetCache());
  });

  afterEach(async () => {
    if (persistence.started) {
      await persistence.shutdown();
      await persistenceHelpers.clearTestPersistence();
    }
  });

  it('returns null for target not in cache', () => {
    return cache.getTargetData(QUERY_ROOMS).then(targetData => {
      expect(targetData).to.equal(null);
    });
  });

  it('can set and read a target', async () => {
    const targetData = testTargetData(QUERY_ROOMS, 1, 1);
    await cache.addTargetData(targetData);
    const read = await cache.getTargetData(targetData.target);
    expect(read).to.deep.equal(targetData);
  });

  it('handles canonical ID collisions', async () => {
    // Type information is currently lost in our canonicalID implementations so
    // this currently an easy way to force colliding canonicalIDs
    const q1 = Query.atPath(path('a'))
      .addFilter(filter('foo', '==', 1))
      .toTarget();
    const q2 = Query.atPath(path('a'))
      .addFilter(filter('foo', '==', '1'))
      .toTarget();
    expect(q1.canonicalId()).to.equal(q2.canonicalId());

    const data1 = testTargetData(q1, 1, 1);
    await cache.addTargetData(data1);

    // Using the other query should not return the query cache entry despite
    // equal canonicalIDs.
    expect(await cache.getTargetData(q2)).to.equal(null);
    expect(await cache.getTargetData(q1)).to.deep.equal(data1);
    expect(await cache.getTargetCount()).to.equal(1);

    const data2 = testTargetData(q2, 2, 1);
    await cache.addTargetData(data2);
    expect(await cache.getTargetCount()).to.equal(2);

    expect(await cache.getTargetData(q1)).to.deep.equal(data1);
    expect(await cache.getTargetData(q2)).to.deep.equal(data2);

    await cache.removeTargetData(data1);
    expect(await cache.getTargetData(q1)).to.equal(null);
    expect(await cache.getTargetData(q2)).to.deep.equal(data2);
    expect(await cache.getTargetCount()).to.equal(1);

    await cache.removeTargetData(data2);
    expect(await cache.getTargetData(q1)).to.equal(null);
    expect(await cache.getTargetData(q2)).to.equal(null);
    expect(await cache.getTargetCount()).to.equal(0);
  });

  it('can set target to new value', async () => {
    await cache.addTargetData(testTargetData(QUERY_ROOMS, 1, 1));
    const updated = testTargetData(QUERY_ROOMS, 1, 2);
    await cache.updateTargetData(updated);
    const retrieved = await cache.getTargetData(updated.target);
    expect(retrieved).to.deep.equal(updated);
  });

  it('can remove a target', async () => {
    const targetData = testTargetData(QUERY_ROOMS, 1, 1);
    await cache.addTargetData(targetData);
    await cache.removeTargetData(targetData);
    const read = await cache.getTargetData(QUERY_ROOMS);
    expect(read).to.equal(null);
  });

  it('can remove matching keys when a target is removed', async () => {
    const rooms = testTargetData(QUERY_ROOMS, 1, 1);
    await cache.addTargetData(rooms);

    const key1 = key('rooms/foo');
    const key2 = key('rooms/bar');

    expect(await cache.containsKey(key1)).to.equal(false);

    await cache.addMatchingKeys([key1], rooms.targetId);
    await cache.addMatchingKeys([key2], rooms.targetId);

    expect(await cache.containsKey(key1)).to.equal(true);
    expect(await cache.containsKey(key2)).to.equal(true);

    await cache.removeTargetData(rooms);
    expect(await cache.containsKey(key1)).to.equal(false);
    expect(await cache.containsKey(key2)).to.equal(false);
  });

  it('adds or removes matching keys', async () => {
    const k = key('foo/bar');
    expect(await cache.containsKey(k)).to.equal(false);

    await cache.addMatchingKeys([k], 1);
    expect(await cache.containsKey(k)).to.equal(true);

    await cache.addMatchingKeys([k], 2);
    expect(await cache.containsKey(k)).to.equal(true);

    await cache.removeMatchingKeys([k], 1);
    expect(await cache.containsKey(k)).to.equal(true);

    await cache.removeMatchingKeys([k], 2);
    expect(await cache.containsKey(k)).to.equal(false);
  });

  it('can remove matching keys for a targetId', async () => {
    const key1 = key('foo/bar');
    const key2 = key('foo/baz');
    const key3 = key('foo/blah');

    await cache.addMatchingKeys([key1, key2], 1);
    await cache.addMatchingKeys([key3], 2);
    expect(await cache.containsKey(key1)).to.equal(true);
    expect(await cache.containsKey(key2)).to.equal(true);
    expect(await cache.containsKey(key3)).to.equal(true);

    await cache.removeMatchingKeysForTargetId(1);
    expect(await cache.containsKey(key1)).to.equal(false);
    expect(await cache.containsKey(key2)).to.equal(false);
    expect(await cache.containsKey(key3)).to.equal(true);

    await cache.removeMatchingKeysForTargetId(2);
    expect(await cache.containsKey(key1)).to.equal(false);
    expect(await cache.containsKey(key2)).to.equal(false);
    expect(await cache.containsKey(key3)).to.equal(false);
  });

  it('can get matching keys for targetId', async () => {
    const key1 = key('foo/bar');
    const key2 = key('foo/baz');
    const key3 = key('foo/blah');

    await cache.addMatchingKeys([key1, key2], 1);
    await cache.addMatchingKeys([key3], 2);

    expect(await cache.getMatchingKeysForTargetId(1)).to.deep.equal([
      key1,
      key2
    ]);
    expect(await cache.getMatchingKeysForTargetId(2)).to.deep.equal([key3]);

    await cache.addMatchingKeys([key1], 2);
    expect(await cache.getMatchingKeysForTargetId(1)).to.deep.equal([
      key1,
      key2
    ]);
    expect(await cache.getMatchingKeysForTargetId(2)).to.deep.equal([
      key1,
      key3
    ]);
  });

  it('can allocate target ID', async () => {
    expect(await cache.allocateTargetId()).to.deep.equal(2);
    const targetData1 = testTargetData(QUERY_ROOMS, 2);

    await cache.addTargetData(targetData1);
    const key1 = key('rooms/bar');
    const key2 = key('rooms/foo');
    await cache.addMatchingKeys([key1, key2], 2);

    expect(await cache.allocateTargetId()).to.deep.equal(4);

    const targetData2 = testTargetData(QUERY_HALLS, 4);
    await cache.addTargetData(targetData2);
    const key3 = key('halls/foo');
    await cache.addMatchingKeys([key3], 4);

    expect(await cache.allocateTargetId()).to.deep.equal(6);

    await cache.removeTargetData(targetData2);

    // Target IDs never come down.
    expect(await cache.allocateTargetId()).to.deep.equal(8);

    // A target with an empty result set still counts.
    const targetData3 = testTargetData(QUERY_GARAGES, 42);
    await cache.addTargetData(targetData3);
    expect(await cache.allocateTargetId()).to.deep.equal(44);

    await cache.removeTargetData(targetData1);
    expect(await cache.allocateTargetId()).to.deep.equal(46);

    await cache.removeTargetData(targetData3);
    expect(await cache.allocateTargetId()).to.deep.equal(48);

    // Verify that the highestTargetId persists restarts.
    const otherCache = new TestTargetCache(
      persistence,
      persistence.getTargetCache()
    );
    expect(await otherCache.allocateTargetId()).to.deep.equal(50);
  });

  it('can get / set targets metadata', async () => {
    expect(await cache.getLastRemoteSnapshotVersion()).to.deep.equal(
      SnapshotVersion.min()
    );

    // Can set the snapshot version.
    return cache
      .setTargetsMetadata(/* highestListenSequenceNumber= */ 0, version(42))
      .then(async () => {
        expect(await cache.getLastRemoteSnapshotVersion()).to.deep.equal(
          version(42)
        );
      })
      .then(async () => {
        // Verify snapshot version persists restarts.
        const otherCache = new TestTargetCache(
          persistence,
          persistence.getTargetCache()
        );
        expect(await otherCache.getLastRemoteSnapshotVersion()).to.deep.equal(
          version(42)
        );
      });
  });

  it('sets the highest sequence number', async () => {
    const target1 = new TargetData(QUERY_ROOMS, 1, TargetPurpose.Listen, 10);
    await cache.addTargetData(target1);
    const target2 = new TargetData(QUERY_HALLS, 2, TargetPurpose.Listen, 20);
    await cache.addTargetData(target2);
    expect(await cache.getHighestSequenceNumber()).to.equal(20);

    // Sequence numbers can never come down
    await cache.removeTargetData(target2);
    expect(await cache.getHighestSequenceNumber()).to.equal(20);

    const target3 = new TargetData(QUERY_GARAGES, 3, TargetPurpose.Listen, 100);
    await cache.addTargetData(target3);
    expect(await cache.getHighestSequenceNumber()).to.equal(100);

    await cache.removeTargetData(target1);
    expect(await cache.getHighestSequenceNumber()).to.equal(100);
    await cache.removeTargetData(target3);
    expect(await cache.getHighestSequenceNumber()).to.equal(100);
  });
}
