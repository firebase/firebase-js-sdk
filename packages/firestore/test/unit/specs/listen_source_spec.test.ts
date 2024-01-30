/**
 * @license
 * Copyright 2024 Google LLC
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

import { LimitType, queryWithLimit } from '../../../src/core/query';
import { deletedDoc, doc, filter, orderBy, query } from '../../util/helpers';

import { bundleWithDocumentAndQuery } from './bundle_spec.test';
import { describeSpec, specTest } from './describe_spec';
import { client, spec } from './spec_builder';

describeSpec('Listens source options:', [], () => {
  specTest(
    'Contents of query are cleared when listen is removed.',
    ['eager-gc'],
    'Explicitly tests eager GC behavior',
    () => {
      const query_ = query('collection');
      const docA = doc('collection/a', 0, { key: 'a' }).setHasLocalMutations();
      return (
        spec()
          .userSets('collection/a', { key: 'a' })
          .userListensToCache(query_)
          .expectEvents(query_, {
            added: [docA],
            hasPendingWrites: true,
            fromCache: true
          })
          .userUnlistensToCache(query_)
          .writeAcks('collection/a', 1000)
          // Cache is empty as docA is GCed.
          .userListensToCache(query_)
          .expectEvents(query_, { added: [], fromCache: true })
      );
    }
  );

  specTest(
    'Documents are cleared when listen is removed.',
    ['eager-gc'],
    '',
    () => {
      const filteredQuery = query('collection', filter('matches', '==', true));
      const unfilteredQuery = query('collection');
      const docA = doc('collection/a', 0, {
        matches: true
      }).setHasLocalMutations();
      const docB = doc('collection/b', 0, {
        matches: true
      }).setHasLocalMutations();
      return (
        spec()
          .userSets('collection/a', { matches: true })
          .userSets('collection/b', { matches: true })
          .userListensToCache(filteredQuery)
          .expectEvents(filteredQuery, {
            added: [docA, docB],
            hasPendingWrites: true,
            fromCache: true
          })
          .writeAcks('collection/a', 1000)
          .writeAcks('collection/b', 2000)
          .userSets('collection/b', { matches: false })
          // DocB doesn't match because of a pending mutation
          .expectEvents(filteredQuery, {
            removed: [docB],
            hasPendingWrites: true,
            fromCache: true
          })
          .userUnlistensToCache(filteredQuery)
          .writeAcks('collection/b', 3000)
          // Should get no events since documents were GCed
          .userListensToCache(unfilteredQuery)
          .expectEvents(unfilteredQuery, { added: [], fromCache: true })
          .userUnlistensToCache(unfilteredQuery)
      );
    }
  );

  specTest("Doesn't include unknown documents in cached result", [], () => {
    const query_ = query('collection');
    const existingDoc = doc('collection/exists', 0, {
      key: 'a'
    }).setHasLocalMutations();
    return spec()
      .userSets('collection/exists', { key: 'a' })
      .userPatches('collection/unknown', { key: 'b' })
      .userListensToCache(query_)
      .expectEvents(query_, {
        added: [existingDoc],
        fromCache: true,
        hasPendingWrites: true
      });
  });

  specTest("Doesn't raise 'hasPendingWrites' for deletes", [], () => {
    const query_ = query('collection');
    const docA = doc('collection/a', 1000, { key: 'a' });

    return (
      spec()
        .ensureManualLruGC()
        // Populate the cache first
        .userListens(query_)
        .watchAcksFull(query_, 1000, docA)
        .expectEvents(query_, { added: [docA] })
        .userUnlistens(query_)
        .watchRemoves(query_)
        // Listen to cache
        .userListensToCache(query_)
        .expectEvents(query_, { added: [docA], fromCache: true })
        .userDeletes('collection/a')
        .expectEvents(query_, { removed: [docA], fromCache: true })
        .writeAcks('collection/a', 2000)
        .watchSends({ affects: [query_] }, deletedDoc('collection/a', 2000))
        .watchSnapshots(2000)
    );
  });

  specTest('onSnapshotsInSync fires for multiple listeners', [], () => {
    const query1 = query('collection');
    const docAv1 = doc('collection/a', 1000, { v: 1 });
    const docAv2Local = doc('collection/a', 1000, {
      v: 2
    }).setHasLocalMutations();
    const docAv3Local = doc('collection/a', 1000, {
      v: 3
    }).setHasLocalMutations();
    const docAv4Local = doc('collection/a', 1000, {
      v: 4
    }).setHasLocalMutations();

    return (
      spec()
        .ensureManualLruGC()
        // Populate the cache first
        .userListens(query1)
        .watchAcksFull(query1, 1000, docAv1)
        .expectEvents(query1, { added: [docAv1] })
        .userUnlistens(query1)
        .watchRemoves(query1)
        // Listen to cache
        .userListensToCache(query1)
        .expectEvents(query1, { added: [docAv1], fromCache: true })
        .userAddsSnapshotsInSyncListener()
        .expectSnapshotsInSyncEvent()
        .userSets('collection/a', { v: 2 })
        .expectEvents(query1, {
          hasPendingWrites: true,
          modified: [docAv2Local],
          fromCache: true
        })
        .expectSnapshotsInSyncEvent()
        .userAddsSnapshotsInSyncListener()
        .expectSnapshotsInSyncEvent()
        .userAddsSnapshotsInSyncListener()
        .expectSnapshotsInSyncEvent()
        .userSets('collection/a', { v: 3 })
        .expectEvents(query1, {
          hasPendingWrites: true,
          modified: [docAv3Local],
          fromCache: true
        })
        .expectSnapshotsInSyncEvent(3)
        .userRemovesSnapshotsInSyncListener()
        .userSets('collection/a', { v: 4 })
        .expectEvents(query1, {
          hasPendingWrites: true,
          modified: [docAv4Local],
          fromCache: true
        })
        .expectSnapshotsInSyncEvent(2)
    );
  });

  specTest('Empty initial snapshot is raised from cache', [], () => {
    const query1 = query('collection');
    return (
      spec()
        .ensureManualLruGC()
        // Populate the cache with the empty query results.
        .userListens(query1)
        .watchAcksFull(query1, 1000)
        .expectEvents(query1, { fromCache: false })
        .userUnlistens(query1)
        .watchRemoves(query1)
        // Listen to the query again and verify that the empty snapshot is
        // raised from cache.
        .userListensToCache(query1, { resumeToken: 'resume-token-1000' })
        .expectEvents(query1, { fromCache: true })
    );
  });

  specTest(
    'Empty-due-to-delete initial snapshot is raised from cache',
    [],
    () => {
      const query1 = query('collection');
      const doc1 = doc('collection/a', 1000, { v: 1 });
      return (
        spec()
          .ensureManualLruGC()
          // Populate the cache with the empty query results.
          .userListens(query1)
          .watchAcksFull(query1, 1000, doc1)
          .expectEvents(query1, { added: [doc1] })
          .userUnlistens(query1)
          .watchRemoves(query1)
          // Delete the only document in the result set locally on the client.
          .userDeletes('collection/a')
          // Listen to the query again and verify that the empty snapshot is
          // raised from cache, even though the write is not yet acknowledged.
          .userListensToCache(query1, { resumeToken: 'resume-token-1000' })
          .expectEvents(query1, { fromCache: true })
      );
    }
  );

  specTest('Newer docs from bundles should overwrite cache', [], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { value: 'a' });
    const docAChanged = doc('collection/a', 2999, { value: 'b' });

    const bundleString = bundleWithDocumentAndQuery({
      key: docA.key,
      readTime: 3000,
      createTime: 1999,
      updateTime: 2999,
      content: { value: 'b' }
    });

    return (
      spec()
        .ensureManualLruGC()
        // Populate the cache first
        .userListens(query1)
        .watchAcksFull(query1, 1000, docA)
        .expectEvents(query1, { added: [docA] })
        .userUnlistens(query1)
        .watchRemoves(query1)
        // Listen to cache
        .userListensToCache(query1)
        .expectEvents(query1, { added: [docA], fromCache: true })
        .loadBundle(bundleString)
        .expectEvents(query1, { modified: [docAChanged], fromCache: true })
    );
  });

  specTest(
    'Newer deleted docs from bundles should delete cached docs',
    [],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { value: 'a' });
      const bundleString = bundleWithDocumentAndQuery({
        key: docA.key,
        readTime: 3000
      });

      return (
        spec()
          .ensureManualLruGC()
          // Populate the cache first
          .userListens(query1)
          .watchAcksFull(query1, 1000, docA)
          .expectEvents(query1, { added: [docA] })
          .userUnlistens(query1)
          .watchRemoves(query1)
          // Listen to cache
          .userListensToCache(query1)
          .expectEvents(query1, { added: [docA], fromCache: true })
          .loadBundle(bundleString)
          .expectEvents(query1, { removed: [docA], fromCache: true })
      );
    }
  );

  specTest('Older deleted docs from bundles should do nothing', [], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { value: 'a' });
    const bundleString = bundleWithDocumentAndQuery({
      key: docA.key,
      readTime: 999
    });

    return (
      spec()
        .ensureManualLruGC()
        // Populate the cache first
        .userListens(query1)
        .watchAcksFull(query1, 1000, docA)
        .expectEvents(query1, { added: [docA] })
        .userUnlistens(query1)
        .watchRemoves(query1)
        // Listen to cache
        .userListensToCache(query1)
        .expectEvents(query1, { added: [docA], fromCache: true })
        // No events are expected here.
        .loadBundle(bundleString)
    );
  });

  specTest(
    'Newer docs from bundles should keep not raise snapshot if there are unacknowledged writes',
    [],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 250, { value: 'a' });
      const bundleString = bundleWithDocumentAndQuery({
        key: docA.key,
        readTime: 1001,
        createTime: 250,
        updateTime: 1001,
        content: { value: 'fromBundle' }
      });

      return (
        spec()
          .ensureManualLruGC()
          // Populate the cache first
          .userListens(query1)
          .watchAcksFull(query1, 250, docA)
          .expectEvents(query1, { added: [docA] })
          .userUnlistens(query1)
          .watchRemoves(query1)
          // Listen to cache
          .userListensToCache(query1)
          .expectEvents(query1, {
            added: [doc('collection/a', 250, { value: 'a' })],
            fromCache: true
          })
          .userPatches('collection/a', { value: 'patched' })
          .expectEvents(query1, {
            modified: [
              doc('collection/a', 250, {
                value: 'patched'
              }).setHasLocalMutations()
            ],
            hasPendingWrites: true,
            fromCache: true
          })
          // Loading the bundle will not raise snapshots, because the
          // mutation has not been acknowledged.
          .loadBundle(bundleString)
      );
    }
  );

  specTest(
    'Newer docs from bundles should raise snapshot only when Watch catches up with acknowledged writes',
    [],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 250, { value: 'a' });
      const bundleBeforeMutationAck = bundleWithDocumentAndQuery({
        key: docA.key,
        readTime: 500,
        createTime: 250,
        updateTime: 500,
        content: { value: 'b' }
      });

      const bundleAfterMutationAck = bundleWithDocumentAndQuery({
        key: docA.key,
        readTime: 1001,
        createTime: 250,
        updateTime: 1001,
        content: { value: 'fromBundle' }
      });
      return (
        spec()
          .ensureManualLruGC()
          // Populate the cache first
          .userListens(query1)
          .watchAcksFull(query1, 250, docA)
          .expectEvents(query1, { added: [docA] })
          .userUnlistens(query1)
          .watchRemoves(query1)
          // Listen to cache
          .userListensToCache(query1)
          .expectEvents(query1, {
            added: [doc('collection/a', 250, { value: 'a' })],
            fromCache: true
          })
          .userPatches('collection/a', { value: 'patched' })
          .expectEvents(query1, {
            modified: [
              doc('collection/a', 250, {
                value: 'patched'
              }).setHasLocalMutations()
            ],
            hasPendingWrites: true,
            fromCache: true
          })
          .writeAcks('collection/a', 1000)
          // loading bundleBeforeMutationAck will not raise snapshots, because its
          // snapshot version is older than the acknowledged mutation.
          .loadBundle(bundleBeforeMutationAck)
          // loading bundleAfterMutationAck will raise a snapshot, because it is after
          // the acknowledged mutation.
          .loadBundle(bundleAfterMutationAck)
          .expectEvents(query1, {
            modified: [doc('collection/a', 1001, { value: 'fromBundle' })],
            fromCache: true
          })
      );
    }
  );

  specTest(
    'Primary client should not invoke watch request while all clients are listening to cache',
    ['multi-client'],
    () => {
      const query1 = query('collection');

      return (
        client(0)
          .becomeVisible()
          .client(1)
          .userListensToCache(query1)
          .expectEvents(query1, { added: [], fromCache: true })
          // Primary client should not invoke watch request for cache listeners
          .client(0)
          .expectListenToCache(query1)
          .expectActiveTargets()
          .client(1)
          .userUnlistensToCache(query1)
          .client(0)
          .expectUnlistenToCache(query1)
      );
    }
  );

  specTest(
    'Local mutations notifies listeners sourced from cache in all tabs',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 0, {
        key: 'a'
      }).setHasLocalMutations();

      return client(0)
        .becomeVisible()
        .userListensToCache(query1)
        .expectEvents(query1, { added: [], fromCache: true })
        .client(1)
        .userListensToCache(query1)
        .expectEvents(query1, { added: [], fromCache: true })
        .client(0)
        .userSets('collection/a', { key: 'a' })
        .expectEvents(query1, {
          hasPendingWrites: true,
          added: [docA],
          fromCache: true
        })
        .client(1)
        .expectEvents(query1, {
          hasPendingWrites: true,
          added: [docA],
          fromCache: true
        });
    }
  );

  specTest(
    'Listeners with different source shares watch changes between primary and secondary clients',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docB = doc('collection/b', 2000, { key: 'a' });

      return (
        client(0)
          .becomeVisible()
          // Listen to server in the primary client
          .userListens(query1)
          .watchAcksFull(query1, 1000, docA)
          .expectEvents(query1, { added: [docA] })
          // Listen to cache in secondary clients
          .client(1)
          .userListensToCache(query1)
          .expectEvents(query1, { added: [docA], fromCache: true })
          .client(2)
          .userListensToCache(query1)
          .expectEvents(query1, { added: [docA], fromCache: true })
          // Updates in the primary client notifies listeners sourcing from cache
          // in secondary clients.
          .client(0)
          .watchSends({ affects: [query1] }, docB)
          .watchSnapshots(2000)
          .expectEvents(query1, { added: [docB] })
          .client(1)
          .expectEvents(query1, { added: [docB] })
          .client(2)
          .expectEvents(query1, { added: [docB] })
          // Un-listen to the server in the primary tab.
          .client(0)
          .userUnlistens(query1)
          // There should be no active watch targets left.
          .expectActiveTargets()
      );
    }
  );

  specTest(
    'Clients can have multiple listeners with different sources',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docB = doc('collection/b', 2000, { key: 'a' });

      return (
        client(0)
          .becomeVisible()
          // Listen to both server and cache in the primary client
          .userListens(query1)
          .watchAcksFull(query1, 1000, docA)
          .expectEvents(query1, { added: [docA] })
          .userListensToCache(query1)
          .expectEvents(query1, { added: [docA] })
          // Listen to both server and cache in the secondary client
          .client(1)
          .userListens(query1)
          .expectEvents(query1, { added: [docA] })
          .userListensToCache(query1)
          .expectEvents(query1, { added: [docA] })
          // Updates in the primary client notifies all listeners
          .client(0)
          .watchSends({ affects: [query1] }, docB)
          .watchSnapshots(2000)
          .expectEvents(query1, { added: [docB] })
          .expectEvents(query1, { added: [docB] })
          .client(1)
          .expectEvents(query1, { added: [docB] })
          .expectEvents(query1, { added: [docB] })
      );
    }
  );

  specTest(
    'Query is executed by primary client even if it only includes listeners sourced from cache',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });

      return (
        client(0)
          .becomeVisible()
          // Listen to cache in primary client
          .userListensToCache(query1)
          .expectEvents(query1, { added: [], fromCache: true })
          // Listen to server in secondary client
          .client(1)
          .userListens(query1)
          // The query is executed in the primary client
          .client(0)
          .expectListen(query1)
          // Updates in the primary client notifies both listeners
          .watchAcks(query1)
          .watchSends({ affects: [query1] }, docA)
          .watchSnapshots(1000)
          .expectEvents(query1, { added: [docA], fromCache: true })
          .client(1)
          .expectEvents(query1, { added: [docA], fromCache: true })
          .client(0)
          .watchCurrents(query1, 'resume-token-2000')
          .watchSnapshots(2000)
          // Listeners in both tabs are in sync
          .expectEvents(query1, { fromCache: false })
          .client(1)
          .expectEvents(query1, { fromCache: false })
      );
    }
  );

  specTest(
    'Query only raises events in participating clients',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });

      return client(0)
        .becomeVisible()
        .client(1)
        .client(2)
        .userListensToCache(query1)
        .expectEvents(query1, { added: [], fromCache: true })
        .client(3)
        .userListens(query1)
        .client(0) // No events
        .expectListen(query1)
        .watchAcksFull(query1, 1000, docA)
        .client(1) // No events
        .client(2)
        .expectEvents(query1, { added: [docA] })
        .client(3)
        .expectEvents(query1, { added: [docA] });
    }
  );

  specTest(
    'Mirror queries being listened in different clients sourced from cache ',
    ['multi-client'],
    () => {
      const fullQuery = query('collection');
      const limit = queryWithLimit(
        query('collection', orderBy('sort', 'asc')),
        2,
        LimitType.First
      );
      const limitToLast = queryWithLimit(
        query('collection', orderBy('sort', 'desc')),
        2,
        LimitType.Last
      );
      const docA = doc('collection/a', 1000, { sort: 0 });
      const docB = doc('collection/b', 1000, { sort: 1 });
      const docC = doc('collection/c', 1000, { sort: 1 });
      const docCV2 = doc('collection/c', 2000, {
        sort: -1
      }).setHasLocalMutations();

      return (
        client(0)
          .becomeVisible()
          // Populate the cache first
          .userListens(fullQuery)
          .watchAcksFull(fullQuery, 1000, docA, docB, docC)
          .expectEvents(fullQuery, { added: [docA, docB, docC] })
          .userUnlistens(fullQuery)
          .watchRemoves(fullQuery)

          // Listen to mirror queries from cache in 2 different tabs
          .userListensToCache(limit)
          .expectEvents(limit, { added: [docA, docB], fromCache: true })
          .client(1)
          .userListensToCache(limitToLast)
          .expectEvents(limitToLast, { added: [docB, docA], fromCache: true })
          // Un-listen to the query in primary tab and do a local mutation
          .client(0)
          .userUnlistensToCache(limit)
          .userSets('collection/c', { sort: -1 })
          // Listener in the other tab should work as expected
          .client(1)
          .expectEvents(limitToLast, {
            hasPendingWrites: true,
            added: [docCV2],
            removed: [docB],
            fromCache: true
          })
      );
    }
  );

  specTest(
    'Mirror queries being listened in the same secondary client sourced from cache',
    ['multi-client'],
    () => {
      const fullQuery = query('collection');
      const limit = queryWithLimit(
        query('collection', orderBy('sort', 'asc')),
        2,
        LimitType.First
      );
      const limitToLast = queryWithLimit(
        query('collection', orderBy('sort', 'desc')),
        2,
        LimitType.Last
      );
      const docA = doc('collection/a', 1000, { sort: 0 });
      const docB = doc('collection/b', 1000, { sort: 1 });
      const docC = doc('collection/c', 1000, { sort: 1 });
      const docCV2 = doc('collection/c', 2000, {
        sort: -1
      }).setHasLocalMutations();

      return (
        client(0)
          .becomeVisible()
          // Populate the cache first
          .userListens(fullQuery)
          .watchAcksFull(fullQuery, 1000, docA, docB, docC)
          .expectEvents(fullQuery, { added: [docA, docB, docC] })
          .userUnlistens(fullQuery)
          .watchRemoves(fullQuery)

          // Listen to mirror queries in a secondary tab
          .client(1)
          .userListensToCache(limit)
          .expectEvents(limit, { added: [docA, docB], fromCache: true })
          .userListensToCache(limitToLast)
          .expectEvents(limitToLast, { added: [docB, docA], fromCache: true })
          // Un-listen to one of the query and do a local mutation
          .userUnlistensToCache(limit)
          .userSets('collection/c', { sort: -1 })
          // The other listener should work as expected
          .expectEvents(limitToLast, {
            hasPendingWrites: true,
            added: [docCV2],
            removed: [docB],
            fromCache: true
          })
      );
    }
  );

  specTest(
    'Mirror queries being listened from different sources while listening to server in primary tab',
    ['multi-client'],
    () => {
      const limit = queryWithLimit(
        query('collection', orderBy('sort', 'asc')),
        2,
        LimitType.First
      );
      const limitToLast = queryWithLimit(
        query('collection', orderBy('sort', 'desc')),
        2,
        LimitType.Last
      );
      const docA = doc('collection/a', 1000, { sort: 0 });
      const docB = doc('collection/b', 1000, { sort: 1 });
      const docC = doc('collection/c', 2000, { sort: -1 });

      return (
        // Listen to server in primary client
        client(0)
          .becomeVisible()
          .userListens(limit)
          .expectListen(limit)
          .watchAcksFull(limit, 1000, docA, docB)
          .expectEvents(limit, { added: [docA, docB] })
          //Listen to cache in secondary client
          .client(1)
          .userListensToCache(limitToLast)
          .expectEvents(limitToLast, { added: [docB, docA], fromCache: true })
          // Watch sends document changes
          .client(0)
          .watchSends({ affects: [limit] }, docC)
          .watchSnapshots(2000)
          .expectEvents(limit, { added: [docC], removed: [docB] })
          // Cache listener gets notified as well.
          .client(1)
          .expectEvents(limitToLast, { added: [docC], removed: [docB] })
      );
    }
  );

  specTest(
    'Mirror queries from different sources while listening to server in secondary tab',
    ['multi-client'],
    () => {
      const limit = queryWithLimit(
        query('collection', orderBy('sort', 'asc')),
        2,
        LimitType.First
      );
      const limitToLast = queryWithLimit(
        query('collection', orderBy('sort', 'desc')),
        2,
        LimitType.Last
      );
      const docA = doc('collection/a', 1000, { sort: 0 });
      const docB = doc('collection/b', 1000, { sort: 1 });
      const docC = doc('collection/c', 2000, { sort: -1 });

      return (
        client(0)
          .becomeVisible()
          // Listen to server in the secondary client
          .client(1)
          .userListens(limit)
          .client(0)
          .expectListen(limit)
          .watchAcksFull(limit, 1000, docA, docB)
          .client(1)
          .expectEvents(limit, { added: [docA, docB] })

          // Listen to cache in primary client
          .client(0)
          .userListensToCache(limitToLast)
          .expectEvents(limitToLast, { added: [docB, docA], fromCache: true })
          // Watch sends document changes
          .watchSends({ affects: [limit] }, docC)
          .watchSnapshots(2000)
          .expectEvents(limitToLast, { added: [docC], removed: [docB] })
          .client(1)
          .expectEvents(limit, { added: [docC], removed: [docB] })
      );
    }
  );

  specTest(
    'Un-listen to listeners from different source',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docB = doc('collection/b', 1000, {
        key: 'b'
      }).setHasLocalMutations();

      return (
        client(0)
          .becomeVisible()
          // Listen to server in primary client
          .userListens(query1)
          .watchAcksFull(query1, 1000, docA)
          .expectEvents(query1, { added: [docA] })
          // Listen to cache in secondary client
          .client(1)
          .userListensToCache(query1)
          .expectEvents(query1, { added: [docA], fromCache: true })
          .client(0)
          .userUnlistens(query1)
          .userSets('collection/b', { key: 'b' })
          // The other listener should work as expected
          .client(1)
          .expectEvents(query1, {
            hasPendingWrites: true,
            added: [docB],
            fromCache: true
          })
          .userUnlistensToCache(query1)
      );
    }
  );
});
