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

import { deletedDoc, doc, filter, query } from '../../util/helpers';

import { bundleWithDocumentAndQuery } from './bundle_spec.test';
import { describeSpec, specTest } from './describe_spec';
import { spec } from './spec_builder';

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
        // Disable GC so the cache persists across listens.
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
          // Disable GC so the cache persists across listens.
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
});
