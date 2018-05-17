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
  keys,
  path,
  resumeTokenForSnapshot,
  version
} from '../../util/helpers';

import * as persistenceHelpers from './persistence_test_helpers';
import { TestGarbageCollector } from './test_garbage_collector';
import { TestQueryCache } from './test_query_cache';
import { DocumentKeySet } from '../../../src/model/collections';
import { TargetChange } from '../../../src/remote/remote_event';
import { emptyByteString } from '../../../src/platform/platform';
import { DocumentKey } from '../../../src/model/document_key';

let persistence: Persistence;
let cache: TestQueryCache;

function targetChange(
  snapshotVersion: SnapshotVersion,
  added: DocumentKey[] = [],
  modified: DocumentKey[] = [],
  removed: DocumentKey[] = []
): TargetChange {
  return {
    snapshotVersion,
    resumeToken: emptyByteString(),
    current: true,
    addedDocuments: keys(...added.map(key => key.toString())),
    modifiedDocuments: keys(...modified.map(key => key.toString())),
    removedDocuments: keys(...removed.map(key => key.toString()))
  };
}

function extractKeys(keys: DocumentKeySet): string[] {
  return keys.toArray().map(key => key.toString());
}

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
    expect(cache.count()).to.equal(1);

    const data2 = testQueryData(q2, 2, 1);
    await cache.addQueryData(data2);
    expect(cache.count()).to.equal(2);

    expect(await cache.getQueryData(q1)).to.deep.equal(data1);
    expect(await cache.getQueryData(q2)).to.deep.equal(data2);

    await cache.removeQueryData(data1);
    expect(await cache.getQueryData(q1)).to.equal(null);
    expect(await cache.getQueryData(q2)).to.deep.equal(data2);
    expect(cache.count()).to.equal(1);

    await cache.removeQueryData(data2);
    expect(await cache.getQueryData(q1)).to.equal(null);
    expect(await cache.getQueryData(q2)).to.equal(null);
    expect(cache.count()).to.equal(0);
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

    await cache.applyTargetChange(
      rooms.targetId,
      targetChange(rooms.snapshotVersion, [key1])
    );
    await cache.applyTargetChange(
      rooms.targetId,
      targetChange(rooms.snapshotVersion, [key2])
    );

    expect(await cache.containsKey(key1)).to.equal(true);
    expect(await cache.containsKey(key2)).to.equal(true);

    await cache.removeQueryData(rooms);
    expect(await cache.containsKey(key1)).to.equal(false);
    expect(await cache.containsKey(key2)).to.equal(false);
  });

  it('adds or removes matching keys', async () => {
    const k = key('foo/bar');
    const v = version(0);

    expect(await cache.containsKey(k)).to.equal(false);

    await cache.applyTargetChange(1, targetChange(v, [k]));
    expect(await cache.containsKey(k)).to.equal(true);

    await cache.applyTargetChange(2, targetChange(v, [k]));
    expect(await cache.containsKey(k)).to.equal(true);

    await cache.applyTargetChange(1, targetChange(v, [], [], [k]));
    expect(await cache.containsKey(k)).to.equal(true);

    await cache.applyTargetChange(2, targetChange(v, [], [], [k]));
    expect(await cache.containsKey(k)).to.equal(false);
  });

  it('can remove matching keys for a targetId', async () => {
    const key1 = key('foo/bar');
    const key2 = key('foo/baz');
    const key3 = key('foo/blah');
    const ver = version(0);

    await cache.applyTargetChange(1, targetChange(ver, [key1, key2]));
    await cache.applyTargetChange(2, targetChange(ver, [key3]));

    expect(await cache.containsKey(key1)).to.equal(true);
    expect(await cache.containsKey(key2)).to.equal(true);
    expect(await cache.containsKey(key3)).to.equal(true);

    await cache.applyTargetChange(1, targetChange(ver, [], [], [key1, key2]));

    expect(await cache.containsKey(key1)).to.equal(false);
    expect(await cache.containsKey(key2)).to.equal(false);
    expect(await cache.containsKey(key3)).to.equal(true);

    await cache.applyTargetChange(2, targetChange(ver, [], [], [key3]));

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
    await cache.applyTargetChange(
      rooms.targetId,
      targetChange(rooms.snapshotVersion, [room1, room2])
    );
    const halls = testQueryData(QUERY_HALLS, 2, 1);
    await cache.addQueryData(halls);

    const hall1 = key('halls/bar');
    const hall2 = key('halls/foo');
    await cache.applyTargetChange(
      halls.targetId,
      targetChange(rooms.snapshotVersion, [hall1, hall2])
    );
    expect(await testGc.collectGarbage()).to.deep.equal([]);

    await cache.applyTargetChange(
      rooms.targetId,
      targetChange(rooms.snapshotVersion, [], [], [room1])
    );
    expect(await testGc.collectGarbage()).to.deep.equal([room1]);

    await cache.applyTargetChange(
      rooms.targetId,
      targetChange(rooms.snapshotVersion, [], [], [room2])
    );
    await cache.removeQueryData(rooms);
    expect(await testGc.collectGarbage()).to.deep.equal([room2]);

    await cache.applyTargetChange(
      halls.targetId,
      targetChange(halls.snapshotVersion, [], [], [hall1, hall2])
    );
    expect(await testGc.collectGarbage()).to.deep.equal([hall1, hall2]);
  });

  it('can get matching keys for targetId', async () => {
    const key1 = key('foo/bar');
    const key2 = key('foo/baz');
    const key3 = key('foo/blah');
    const ver = version(0);

    await cache.applyTargetChange(1, targetChange(ver, [key1, key2]));
    await cache.applyTargetChange(2, targetChange(ver, [key3]));
    expect(await cache.getMatchingKeysForTargetId(1)).to.deep.equal([
      key1,
      key2
    ]);
    expect(await cache.getMatchingKeysForTargetId(2)).to.deep.equal([key3]);

    await cache.applyTargetChange(2, targetChange(ver, [key1, key3]));
    expect(await cache.getMatchingKeysForTargetId(1)).to.deep.equal([
      key1,
      key2
    ]);
    expect(await cache.getMatchingKeysForTargetId(2)).to.deep.equal([
      key1,
      key3
    ]);
  });

  it('can get / set highestTargetId', async () => {
    const ver = version(0);

    expect(cache.getHighestTargetId()).to.deep.equal(0);
    const queryData1 = testQueryData(QUERY_ROOMS, 1);

    await cache.addQueryData(queryData1);
    const key1 = key('rooms/bar');
    const key2 = key('rooms/foo');
    await cache.applyTargetChange(1, targetChange(ver, [key1, key2]));
    const queryData2 = testQueryData(QUERY_HALLS, 2);
    await cache.addQueryData(queryData2);
    const key3 = key('halls/foo');
    await cache.applyTargetChange(2, targetChange(ver, [key3]));
    expect(cache.getHighestTargetId()).to.deep.equal(2);

    await cache.removeQueryData(queryData2);

    // Target IDs never come down.
    expect(cache.getHighestTargetId()).to.deep.equal(2);

    // A query with an empty result set still counts.
    const queryData3 = testQueryData(QUERY_GARAGES, 42);
    await cache.addQueryData(queryData3);
    expect(cache.getHighestTargetId()).to.deep.equal(42);

    await cache.removeQueryData(queryData1);
    expect(cache.getHighestTargetId()).to.deep.equal(42);

    await cache.removeQueryData(queryData3);
    expect(cache.getHighestTargetId()).to.deep.equal(42);

    // Verify that the highestTargetId persists restarts.
    const otherCache = new TestQueryCache(
      persistence,
      persistence.getQueryCache()
    );
    await otherCache.start();
    expect(otherCache.getHighestTargetId()).to.deep.equal(42);
  });

  it('can get / set lastRemoteSnapshotVersion', () => {
    expect(cache.getLastRemoteSnapshotVersion()).to.deep.equal(
      SnapshotVersion.MIN
    );

    // Can set the snapshot version.
    return cache
      .setLastRemoteSnapshotVersion(version(42))
      .then(() => {
        expect(cache.getLastRemoteSnapshotVersion()).to.deep.equal(version(42));
      })
      .then(() => {
        // Verify snapshot version persists restarts.
        const otherCache = new TestQueryCache(
          persistence,
          persistence.getQueryCache()
        );
        return otherCache.start().then(() => {
          expect(otherCache.getLastRemoteSnapshotVersion()).to.deep.equal(
            version(42)
          );
        });
      });
  });

  it('get changes for single version', async () => {
    await cache.applyTargetChange(
      0,
      targetChange(
        version(3),
        [key('coll/a'), key('coll/b')],
        [key('coll/c')],
        [key('coll/d')]
      )
    );
    const changes = await cache.getChangedKeysForTargetId(0);
    expect(extractKeys(changes)).to.have.members([
      'coll/a',
      'coll/b',
      'coll/c',
      'coll/d'
    ]);
  });

  it('get changes for multiple versions', async () => {
    await cache.applyTargetChange(0, targetChange(version(1), [key('coll/a')]));
    await cache.applyTargetChange(
      0,
      targetChange(version(2), [], [key('coll/b')])
    );
    await cache.applyTargetChange(
      0,
      targetChange(version(3), [], [], [key('coll/c')])
    );

    let changes = await cache.getChangedKeysForTargetId(0, version(1));
    expect(extractKeys(changes)).to.have.members([
      'coll/a',
      'coll/b',
      'coll/c'
    ]);

    changes = await cache.getChangedKeysForTargetId(0, version(2));
    expect(extractKeys(changes)).to.have.members(['coll/b', 'coll/c']);

    changes = await cache.getChangedKeysForTargetId(0, version(3));
    expect(extractKeys(changes)).to.have.members(['coll/c']);
  });

  it('get changes with multiple targets', async () => {
    await cache.applyTargetChange(0, targetChange(version(0), [key('coll/a')]));
    await cache.applyTargetChange(1, targetChange(version(0), [key('coll/b')]));
    const changes = await cache.getChangedKeysForTargetId(0, version(0));

    expect(extractKeys(changes)).to.have.members(['coll/a']);
  });
}
