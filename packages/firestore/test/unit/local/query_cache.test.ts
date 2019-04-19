/**
 * @license
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
import { Query } from '../../../src/core/query';
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { TargetId } from '../../../src/core/types';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { Persistence } from '../../../src/local/persistence';
import { QueryData, QueryPurpose } from '../../../src/local/query_data';
import { ReferenceSet } from '../../../src/local/reference_set';
import { addEqualityMatcher } from '../../util/equality_matcher';
import {
  filter,
  key,
  path,
  resumeTokenForSnapshot,
  version
} from '../../util/helpers';

import { Timestamp } from '../../../src/api/timestamp';
import * as persistenceHelpers from './persistence_test_helpers';
import { TestQueryCache } from './test_query_cache';

describe('MemoryQueryCache', () => {
  genericQueryCacheTests(persistenceHelpers.testMemoryEagerPersistence);
});

describe('IndexedDbQueryCache', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping IndexedDbQueryCache tests.');
    return;
  }

  let persistencePromise: Promise<Persistence>;
  beforeEach(async () => {
    persistencePromise = persistenceHelpers.testIndexedDbPersistence();
  });

  genericQueryCacheTests(() => persistencePromise);

  it('persists metadata across restarts', async () => {
    const db1 = await persistencePromise;

    const queryCache1 = new TestQueryCache(db1, db1.getQueryCache());
    expect(await queryCache1.getHighestSequenceNumber()).to.equal(0);

    const originalSequenceNumber = 1234;
    const targetId = 5;
    const snapshotVersion = SnapshotVersion.fromTimestamp(new Timestamp(1, 2));
    const query = Query.atPath(path('rooms'));
    await queryCache1.addQueryData(
      new QueryData(
        query,
        targetId,
        QueryPurpose.Listen,
        originalSequenceNumber,
        snapshotVersion
      )
    );
    // Snapshot version needs to be set separately
    await queryCache1.setTargetsMetadata(
      originalSequenceNumber,
      snapshotVersion
    );
    await db1.shutdown();

    const db2 = await persistenceHelpers.testIndexedDbPersistence({
      dontPurgeData: true
    });
    const queryCache2 = new TestQueryCache(db2, db2.getQueryCache());
    expect(await queryCache2.getHighestSequenceNumber()).to.equal(
      originalSequenceNumber
    );
    const actualSnapshotVersion = await queryCache2.getLastRemoteSnapshotVersion();
    expect(snapshotVersion.isEqual(actualSnapshotVersion)).to.be.true;
    await db2.shutdown();
    await IndexedDbPersistence.clearPersistence(persistenceHelpers.TEST_PERSISTENCE_PREFIX);
  });
});

/**
 * Defines the set of tests to run against both query cache implementations.
 */
function genericQueryCacheTests(
  persistencePromise: () => Promise<Persistence>
): void {
  addEqualityMatcher();
  let cache: TestQueryCache;

  const QUERY_ROOMS = Query.atPath(path('rooms'));
  const QUERY_HALLS = Query.atPath(path('halls'));
  const QUERY_GARAGES = Query.atPath(path('garages'));

  /**
   * Creates a new QueryData object from the the given parameters, synthesizing
   * a resume token from the snapshot version.
   */
  let previousSequenceNumber = 0;
  function testQueryData(
    query: Query,
    targetId: TargetId,
    version?: number
  ): QueryData {
    if (version === undefined) {
      version = 0;
    }
    const snapshotVersion = SnapshotVersion.fromMicroseconds(version);
    const resumeToken = resumeTokenForSnapshot(snapshotVersion);
    return new QueryData(
      query,
      targetId,
      QueryPurpose.Listen,
      ++previousSequenceNumber,
      snapshotVersion,
      resumeToken
    );
  }

  let persistence: Persistence;
  beforeEach(async () => {
    persistence = await persistencePromise();
    persistence.referenceDelegate.setInMemoryPins(new ReferenceSet());
    cache = new TestQueryCache(persistence, persistence.getQueryCache());
  });

  afterEach(async () => {
    if (persistence.started) {
      await persistence.shutdown();
      await IndexedDbPersistence.clearPersistence(persistenceHelpers.TEST_PERSISTENCE_PREFIX);
    }
  });

  it('returns null for query not in cache', () => {
    return cache.getQueryData(QUERY_ROOMS).then(queryData => {
      expect(queryData).to.equal(null);
    });
  });

  it('can set and read a query', async () => {
    const queryData = testQueryData(QUERY_ROOMS, 1, 1);
    await cache.addQueryData(queryData);
    const read = await cache.getQueryData(queryData.query);
    expect(read).to.deep.equal(queryData);
  });

  it('handles canonical ID collisions', async () => {
    // Type information is currently lost in our canonicalID implementations so
    // this currently an easy way to force colliding canonicalIDs
    const q1 = Query.atPath(path('a')).addFilter(filter('foo', '==', 1));
    const q2 = Query.atPath(path('a')).addFilter(filter('foo', '==', '1'));
    expect(q1.canonicalId()).to.equal(q2.canonicalId());

    const data1 = testQueryData(q1, 1, 1);
    await cache.addQueryData(data1);

    // Using the other query should not return the query cache entry despite
    // equal canonicalIDs.
    expect(await cache.getQueryData(q2)).to.equal(null);
    expect(await cache.getQueryData(q1)).to.deep.equal(data1);
    expect(await cache.getQueryCount()).to.equal(1);

    const data2 = testQueryData(q2, 2, 1);
    await cache.addQueryData(data2);
    expect(await cache.getQueryCount()).to.equal(2);

    expect(await cache.getQueryData(q1)).to.deep.equal(data1);
    expect(await cache.getQueryData(q2)).to.deep.equal(data2);

    await cache.removeQueryData(data1);
    expect(await cache.getQueryData(q1)).to.equal(null);
    expect(await cache.getQueryData(q2)).to.deep.equal(data2);
    expect(await cache.getQueryCount()).to.equal(1);

    await cache.removeQueryData(data2);
    expect(await cache.getQueryData(q1)).to.equal(null);
    expect(await cache.getQueryData(q2)).to.equal(null);
    expect(await cache.getQueryCount()).to.equal(0);
  });

  it('can set query to new value', async () => {
    await cache.addQueryData(testQueryData(QUERY_ROOMS, 1, 1));
    const updated = testQueryData(QUERY_ROOMS, 1, 2);
    await cache.updateQueryData(updated);
    const retrieved = await cache.getQueryData(updated.query);
    expect(retrieved).to.deep.equal(updated);
  });

  it('can remove a query', async () => {
    const queryData = testQueryData(QUERY_ROOMS, 1, 1);
    await cache.addQueryData(queryData);
    await cache.removeQueryData(queryData);
    const read = await cache.getQueryData(QUERY_ROOMS);
    expect(read).to.equal(null);
  });

  it('can remove matching keys when a query is removed', async () => {
    const rooms = testQueryData(QUERY_ROOMS, 1, 1);
    await cache.addQueryData(rooms);

    const key1 = key('rooms/foo');
    const key2 = key('rooms/bar');

    expect(await cache.containsKey(key1)).to.equal(false);

    await cache.addMatchingKeys([key1], rooms.targetId);
    await cache.addMatchingKeys([key2], rooms.targetId);

    expect(await cache.containsKey(key1)).to.equal(true);
    expect(await cache.containsKey(key2)).to.equal(true);

    await cache.removeQueryData(rooms);
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
    const queryData1 = testQueryData(QUERY_ROOMS, 2);

    await cache.addQueryData(queryData1);
    const key1 = key('rooms/bar');
    const key2 = key('rooms/foo');
    await cache.addMatchingKeys([key1, key2], 2);

    expect(await cache.allocateTargetId()).to.deep.equal(4);

    const queryData2 = testQueryData(QUERY_HALLS, 4);
    await cache.addQueryData(queryData2);
    const key3 = key('halls/foo');
    await cache.addMatchingKeys([key3], 4);

    expect(await cache.allocateTargetId()).to.deep.equal(6);

    await cache.removeQueryData(queryData2);

    // Target IDs never come down.
    expect(await cache.allocateTargetId()).to.deep.equal(8);

    // A query with an empty result set still counts.
    const queryData3 = testQueryData(QUERY_GARAGES, 42);
    await cache.addQueryData(queryData3);
    expect(await cache.allocateTargetId()).to.deep.equal(44);

    await cache.removeQueryData(queryData1);
    expect(await cache.allocateTargetId()).to.deep.equal(46);

    await cache.removeQueryData(queryData3);
    expect(await cache.allocateTargetId()).to.deep.equal(48);

    // Verify that the highestTargetId persists restarts.
    const otherCache = new TestQueryCache(
      persistence,
      persistence.getQueryCache()
    );
    expect(await otherCache.allocateTargetId()).to.deep.equal(50);
  });

  it('can get / set targets metadata', async () => {
    expect(await cache.getLastRemoteSnapshotVersion()).to.deep.equal(
      SnapshotVersion.MIN
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
        const otherCache = new TestQueryCache(
          persistence,
          persistence.getQueryCache()
        );
        expect(await otherCache.getLastRemoteSnapshotVersion()).to.deep.equal(
          version(42)
        );
      });
  });

  it('sets the highest sequence number', async () => {
    const query1 = new QueryData(QUERY_ROOMS, 1, QueryPurpose.Listen, 10);
    await cache.addQueryData(query1);
    const query2 = new QueryData(QUERY_HALLS, 2, QueryPurpose.Listen, 20);
    await cache.addQueryData(query2);
    expect(await cache.getHighestSequenceNumber()).to.equal(20);

    // Sequence numbers can never come down
    await cache.removeQueryData(query2);
    expect(await cache.getHighestSequenceNumber()).to.equal(20);

    const query3 = new QueryData(QUERY_GARAGES, 3, QueryPurpose.Listen, 100);
    await cache.addQueryData(query3);
    expect(await cache.getHighestSequenceNumber()).to.equal(100);

    await cache.removeQueryData(query1);
    expect(await cache.getHighestSequenceNumber()).to.equal(100);
    await cache.removeQueryData(query3);
    expect(await cache.getHighestSequenceNumber()).to.equal(100);
  });
}
