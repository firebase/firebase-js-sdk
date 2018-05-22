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
import { Query } from '../../../src/core/query';
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { TargetId } from '../../../src/core/types';
import { EagerGarbageCollector } from '../../../src/local/eager_garbage_collector';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { Persistence } from '../../../src/local/persistence';
import { QueryData, QueryPurpose } from '../../../src/local/query_data';
import { addEqualityMatcher } from '../../util/equality_matcher';
import {
  filter,
  key,
  path,
  resumeTokenForSnapshot,
  version
} from '../../util/helpers';

import * as persistenceHelpers from './persistence_test_helpers';
import { TestGarbageCollector } from './test_garbage_collector';
import { TestQueryCache } from './test_query_cache';

let persistence: Persistence;
let cache: TestQueryCache;

describe('MemoryQueryCache', () => {
  beforeEach(() => {
    return persistenceHelpers.testMemoryPersistence().then(p => {
      persistence = p;
    });
  });

  genericQueryCacheTests();
});

describe('IndexedDbQueryCache', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping IndexedDbQueryCache tests.');
    return;
  }

  beforeEach(() => {
    return persistenceHelpers.testIndexedDbPersistence().then(p => {
      persistence = p;
    });
  });

  afterEach(() => persistence.shutdown(/* deleteData= */ true));

  genericQueryCacheTests();
});

/**
 * Defines the set of tests to run against both query cache implementations.
 */
function genericQueryCacheTests(): void {
  addEqualityMatcher();

  const QUERY_ROOMS = Query.atPath(path('rooms'));
  const QUERY_HALLS = Query.atPath(path('halls'));
  const QUERY_GARAGES = Query.atPath(path('garages'));

  /**
   * Creates a new QueryData object from the the given parameters, synthesizing
   * a resume token from the snapshot version.
   */
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
      snapshotVersion,
      resumeToken
    );
  }

  beforeEach(async () => {
    cache = new TestQueryCache(persistence, persistence.getQueryCache());
    await cache.start();
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

    cache.addMatchingKeys([key1, key2], 1);
    cache.addMatchingKeys([key3], 2);
    expect(await cache.containsKey(key1)).to.equal(true);
    expect(await cache.containsKey(key2)).to.equal(true);
    expect(await cache.containsKey(key3)).to.equal(true);

    cache.removeMatchingKeysForTargetId(1);
    expect(await cache.containsKey(key1)).to.equal(false);
    expect(await cache.containsKey(key2)).to.equal(false);
    expect(await cache.containsKey(key3)).to.equal(true);

    cache.removeMatchingKeysForTargetId(2);
    expect(await cache.containsKey(key1)).to.equal(false);
    expect(await cache.containsKey(key2)).to.equal(false);
    expect(await cache.containsKey(key3)).to.equal(false);
  });

  it('emits garbage collection events for removes', async () => {
    const eagerGc = new EagerGarbageCollector();
    const testGc = new TestGarbageCollector(persistence, eagerGc);
    eagerGc.addGarbageSource(cache.cache);
    expect(await testGc.collectGarbage()).to.deep.equal([]);

    const rooms = testQueryData(QUERY_ROOMS, 1, 1);
    await cache.addQueryData(rooms);

    const room1 = key('rooms/bar');
    const room2 = key('rooms/foo');
    await cache.addMatchingKeys([room1, room2], rooms.targetId);

    const halls = testQueryData(QUERY_HALLS, 2, 1);
    await cache.addQueryData(halls);

    const hall1 = key('halls/bar');
    const hall2 = key('halls/foo');
    await cache.addMatchingKeys([hall1, hall2], halls.targetId);

    expect(await testGc.collectGarbage()).to.deep.equal([]);

    cache.removeMatchingKeys([room1], rooms.targetId);
    expect(await testGc.collectGarbage()).to.deep.equal([room1]);

    cache.removeQueryData(rooms);
    expect(await testGc.collectGarbage()).to.deep.equal([room2]);

    cache.removeMatchingKeysForTargetId(halls.targetId);
    expect(await testGc.collectGarbage()).to.deep.equal([hall1, hall2]);
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

    cache.addMatchingKeys([key1], 2);
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
    await otherCache.start();
    expect(await otherCache.allocateTargetId()).to.deep.equal(50);
  });

  it('can get / set lastRemoteSnapshotVersion', async () => {
    expect(await cache.getLastRemoteSnapshotVersion()).to.deep.equal(
      SnapshotVersion.MIN
    );

    // Can set the snapshot version.
    return cache
      .setLastRemoteSnapshotVersion(version(42))
      .then(async () => {
        expect(await cache.getLastRemoteSnapshotVersion()).to.deep.equal(
          version(42)
        );
      })
      .then(() => {
        // Verify snapshot version persists restarts.
        const otherCache = new TestQueryCache(
          persistence,
          persistence.getQueryCache()
        );
        return otherCache.start().then(async () => {
          expect(await otherCache.getLastRemoteSnapshotVersion()).to.deep.equal(
            version(42)
          );
        });
      });
  });
}
