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

import { Code } from '../../../src/util/error';
import { deletedDoc, doc, filter, orderBy, query } from '../../util/helpers';

import { TimerId } from '../../../src/util/async_queue';
import { describeSpec, specTest } from './describe_spec';
import { client, spec } from './spec_builder';
import { RpcError } from './spec_rpc_error';

describeSpec('Listens:', [], () => {
  // Obviously this test won't hold with offline persistence enabled.
  specTest(
    'Contents of query are cleared when listen is removed.',
    ['eager-gc'],
    'Explicitly tests eager GC behavior',
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });
      return (
        spec()
          .userListens(query1)
          .watchAcksFull(query1, 1000, docA)
          .expectEvents(query1, { added: [docA] })
          .userUnlistens(query1)
          // should get no events.
          .userListens(query1)
      );
    }
  );

  specTest(
    'Documents outside of view are cleared when listen is removed.',
    ['eager-gc'],
    '',
    () => {
      const filteredQuery = query('collection', filter('matches', '==', true));
      const unfilteredQuery = query('collection');
      const docA = doc('collection/a', 1000, { matches: true });
      const docB = doc('collection/b', 1000, { matches: true });
      return (
        spec()
          .userSets('collection/a', { matches: false })
          .userListens(filteredQuery)
          .watchAcksFull(filteredQuery, 1000, docA, docB)
          // DocA doesn't match because of a pending mutation
          .expectEvents(filteredQuery, { added: [docB] })
          .userSets('collection/b', { matches: false })
          // DocB doesn't match because of a pending mutation
          .expectEvents(filteredQuery, { removed: [docB] })
          .userUnlistens(filteredQuery)
          // Should get no events since documents are filtered
          .userListens(filteredQuery)
          .userUnlistens(filteredQuery)
          .writeAcks('collection/a', 2000)
          .writeAcks('collection/b', 3000)
          // Should get no events since documents were GCed
          .userListens(unfilteredQuery)
          .userUnlistens(unfilteredQuery)
      );
    }
  );

  specTest('Contents of query update when new data is received.', [], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'b' });
    return spec()
      .userListens(query1)
      .watchAcksFull(query1, 1000, docA)
      .expectEvents(query1, { added: [docA] })
      .watchSends({ affects: [query1] }, docB)
      .watchSnapshots(2000)
      .expectEvents(query1, { added: [docB] });
  });

  specTest("Doesn't raise events for empty target", [], () => {
    const query1 = query('collection1');
    const query2 = query('collection2');
    const query3 = query('collection3');
    const docA = doc('collection2/a', 1000, { key: 'a' });
    return (
      spec()
        .userListens(query1)
        .userListens(query2)
        .userListens(query3)
        .watchAcks(query1)
        .watchCurrents(query1, 'resume-token-1000')
        .watchAcks(query2)
        .watchSends({ affects: [query2] }, docA)
        .watchAcks(query3)
        .watchSnapshots(1000)
        // The event for query3 is filtered since we did not receive any
        // document updates or state changes.
        .expectEvents(query1, {})
        .expectEvents(query2, { added: [docA], fromCache: true })
    );
  });

  specTest("Doesn't include unknown documents in cached result", [], () => {
    const query1 = query('collection');
    const existingDoc = doc(
      'collection/exists',
      0,
      { key: 'a' },
      { hasLocalMutations: true }
    );
    return spec()
      .userSets('collection/exists', { key: 'a' })
      .userPatches('collection/unknown', { key: 'b' })
      .userListens(query1)
      .expectEvents(query1, {
        added: [existingDoc],
        fromCache: true,
        hasPendingWrites: true
      });
  });

  specTest("Doesn't raise 'hasPendingWrites' for deletes", [], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { key: 'a' });

    return spec()
      .userListens(query1)
      .watchAcksFull(query1, 1000, docA)
      .expectEvents(query1, { added: [docA] })
      .userDeletes('collection/a')
      .expectEvents(query1, { removed: [docA] })
      .writeAcks('collection/a', 2000)
      .watchSends({ affects: [query1] }, deletedDoc('collection/a', 2000))
      .watchSnapshots(2000);
  });

  specTest(
    'Ensure correct query results with latency-compensated deletes',
    [],
    () => {
      const query1 = query('collection');
      const query2 = query1.withLimitToFirst(10);
      const docA = doc('collection/a', 1000, { a: true });
      const docB = doc('collection/b', 1000, { b: true });

      return (
        spec()
          .userDeletes('collection/b')
          .userListens(query1)
          .watchAcksFull(query1, 1000, docA, docB)
          // Latency-compensated delete should hide docB.
          .expectEvents(query1, { added: [docA] })
          // Doing a different query should give cache results that still hide
          // docB.
          .userListens(query2)
          .expectEvents(query2, {
            fromCache: true,
            added: [docA]
          })
      );
    }
  );

  specTest('Does not raise event for initial document delete', [], () => {
    const query1 = query('collection');
    const missingDoc = deletedDoc('collection/a', 1000);
    return (
      spec()
        .userListens(query1)
        .watchAcks(query1)
        // To indicate the document doesn't exist, watch sends a DocumentDelete
        // message as if the document previously existed and now is being
        // deleted/removed from the target.
        .watchSends({ removed: [query1] }, missingDoc)
        .watchSnapshots(1000)
        .watchCurrents(query1, 'resume-token-2000')
        .watchSnapshots(2000)
        .expectEvents(query1, { fromCache: false })
    );
  });

  specTest(
    'Will process removals without waiting for a consistent snapshot',
    [],
    () => {
      const query1 = query('collection');

      return spec()
        .userListens(query1)
        .watchAcks(query1)
        .watchRemoves(
          query1,
          new RpcError(Code.RESOURCE_EXHAUSTED, 'Resource exhausted')
        )
        .expectEvents(query1, { errorCode: Code.RESOURCE_EXHAUSTED });
    }
  );

  specTest('Will re-issue listen for errored target', [], () => {
    const query1 = query('collection');

    return spec()
      .withGCEnabled(false)
      .userListens(query1)
      .watchAcks(query1)
      .watchRemoves(
        query1,
        new RpcError(Code.RESOURCE_EXHAUSTED, 'Resource exhausted')
      )
      .expectEvents(query1, { errorCode: Code.RESOURCE_EXHAUSTED })
      .userListens(query1)
      .watchAcksFull(query1, 1000)
      .expectEvents(query1, {});
  });

  // It can happen that we need to process watch messages for previously failed
  // targets, because target failures are handled out of band.
  // This test verifies that the code does not crash in this case.
  specTest('Will gracefully process failed targets', [], () => {
    const query1 = query('collection1');
    const query2 = query('collection2');
    const docA = doc('collection1/a', 1000, { a: true });
    const docB = doc('collection2/a', 1001, { b: true });

    return (
      spec()
        .userListens(query1)
        .userListens(query2)
        .watchAcks(query1)
        .watchAcks(query2)
        .watchSends({ affects: [query1] }, docA)
        .watchSends({ affects: [query2] }, docB)
        .watchRemoves(
          query1,
          new RpcError(Code.RESOURCE_EXHAUSTED, 'Resource exhausted')
        )
        .expectEvents(query1, { errorCode: Code.RESOURCE_EXHAUSTED })
        .watchCurrents(query2, 'resume-token-2000')
        // The watch batch still contains messages for query1, this should
        // be handled gracefully
        .watchSnapshots(2000)
        .expectEvents(query2, { added: [docB] })
    );
  });

  // This would only happen when we use a resume token, but omitted for brevity.
  specTest(
    'Will gracefully handle watch stream reverting snapshots',
    [],
    () => {
      const query1 = query('collection');
      const docAv1 = doc('collection/a', 1000, { v: 'v1000' });
      const docAv2 = doc('collection/a', 2000, { v: 'v2000' });

      return (
        spec()
          // Disable GC so the cache persists across listens.
          .withGCEnabled(false)
          .userListens(query1)
          .watchAcksFull(query1, 1000, docAv1)
          .expectEvents(query1, { added: [docAv1] })
          .watchSends({ affects: [query1] }, docAv2)
          .watchSnapshots(2000)
          .expectEvents(query1, { modified: [docAv2] })
          // Remove and re-add listener.
          .userUnlistens(query1)
          .watchRemoves(query1)
          .userListens(query1, 'resume-token-1000')
          .expectEvents(query1, { added: [docAv2], fromCache: true })
          // watch sends old snapshot.
          .watchAcksFull(query1, 1000, docAv1)
          // no error and no events

          // should get events once stream is caught up.
          .watchSends({ affects: [query1] }, docAv2)
          .watchSnapshots(2000)
          .expectEvents(query1, { fromCache: false })
      );
    }
  );

  // This would only happen when we use a resume token, but omitted for brevity.
  specTest(
    'Will gracefully handle watch stream reverting snapshots (with restart)',
    ['durable-persistence'],
    () => {
      const query1 = query('collection');
      const docAv1 = doc('collection/a', 1000, { v: 'v1000' });
      const docAv2 = doc('collection/a', 2000, { v: 'v2000' });

      return (
        spec()
          // Disable GC so the cache persists across listens.
          .withGCEnabled(false)
          .userListens(query1)
          .watchAcksFull(query1, 1000, docAv1)
          .expectEvents(query1, { added: [docAv1] })
          .watchSends({ affects: [query1] }, docAv2)
          .watchSnapshots(2000)
          .expectEvents(query1, { modified: [docAv2] })
          // restart the client and re-listen.
          .restart()
          .userListens(query1, 'resume-token-1000')
          .expectEvents(query1, { added: [docAv2], fromCache: true })
          // watch sends old snapshot.
          .watchAcksFull(query1, 1000, docAv1)
          // no error and no events

          // should get events once stream is caught up.
          .watchSends({ affects: [query1] }, docAv2)
          .watchSnapshots(2000)
          .expectEvents(query1, { fromCache: false })
      );
    }
  );

  specTest('Individual documents cannot revert', [], () => {
    const allQuery = query('collection');
    const visibleQuery = query('collection', filter('visible', '==', true));
    const docAv1 = doc('collection/a', 1000, { visible: true, v: 'v1000' });
    const docAv2 = doc('collection/a', 2000, { visible: false, v: 'v2000' });
    const docAv3 = doc('collection/a', 3000, { visible: false, v: 'v3000' });

    return (
      spec()
        // Disable GC so the cache persists across listens.
        .withGCEnabled(false)
        .userListens(visibleQuery)
        .watchAcksFull(visibleQuery, 1000, docAv1)
        .expectEvents(visibleQuery, { added: [docAv1] })
        .userUnlistens(visibleQuery)
        .watchRemoves(visibleQuery)
        .userListens(allQuery)
        .expectEvents(allQuery, { added: [docAv1], fromCache: true })
        .watchAcksFull(allQuery, 4000, docAv3)
        .expectEvents(allQuery, { modified: [docAv3], fromCache: false })
        .userUnlistens(allQuery)
        .watchRemoves(allQuery)
        // Supposing we sent a resume token for visibleQuery, watch could catch
        // us up to docAV2 since that's the last relevant change to the query
        // (the document falls out) and send us a snapshot that's ahead of
        // docAv3 (which is already in our cache).
        .userListens(visibleQuery, 'resume-token-1000')
        .watchAcks(visibleQuery)
        .watchSends({ removed: [visibleQuery] }, docAv2)
        .watchCurrents(visibleQuery, 'resume-token-5000')
        .watchSnapshots(5000)
        .expectEvents(visibleQuery, { fromCache: false })
        .userUnlistens(visibleQuery)
        .watchRemoves(visibleQuery)
        // Listen to allQuery again and make sure we still get docAv3.
        .userListens(allQuery, 'resume-token-4000')
        .expectEvents(allQuery, { added: [docAv3], fromCache: true })
        .watchAcksFull(allQuery, 6000)
        .expectEvents(allQuery, { fromCache: false })
    );
  });

  specTest('Individual (deleted) documents cannot revert', [], () => {
    const allQuery = query('collection');
    const visibleQuery = query('collection', filter('visible', '==', true));
    const docAv1 = doc('collection/a', 1000, { visible: true, v: 'v1000' });
    const docAv2 = doc('collection/a', 2000, { visible: false, v: 'v2000' });
    const docAv3 = deletedDoc('collection/a', 3000);

    return (
      spec()
        // Disable GC so the cache persists across listens.
        .withGCEnabled(false)
        .userListens(visibleQuery)
        .watchAcksFull(visibleQuery, 1000, docAv1)
        .expectEvents(visibleQuery, { added: [docAv1] })
        .userUnlistens(visibleQuery)
        .watchRemoves(visibleQuery)
        .userListens(allQuery)
        .expectEvents(allQuery, { added: [docAv1], fromCache: true })
        .watchAcks(allQuery)
        .watchSends({ removed: [allQuery] }, docAv3)
        .watchCurrents(allQuery, 'resume-token-4000')
        .watchSnapshots(4000)
        .expectEvents(allQuery, { removed: [docAv1], fromCache: false })
        .userUnlistens(allQuery)
        .watchRemoves(allQuery)
        // Supposing we sent a resume token for visibleQuery, watch could catch
        // us up to docAV2 since that's the last relevant change to the query
        // (the document falls out) and send us a snapshot that's ahead of
        // docAv3 (which is already in our cache).
        .userListens(visibleQuery, 'resume-token-1000')
        .watchAcks(visibleQuery)
        .watchSends({ removed: [visibleQuery] }, docAv2)
        .watchCurrents(visibleQuery, 'resume-token-5000')
        .watchSnapshots(5000)
        .expectEvents(visibleQuery, { fromCache: false })
        .userUnlistens(visibleQuery)
        .watchRemoves(visibleQuery)
        // Listen to allQuery again and make sure we still get no docs.
        .userListens(allQuery, 'resume-token-4000')
        .watchAcksFull(allQuery, 6000)
        .expectEvents(allQuery, { fromCache: false })
    );
  });

  specTest('Waits until Watch catches up to local deletes ', [], () => {
    const query1 = query('collection');
    const docAv1 = doc('collection/a', 1000, { v: '1' });
    const docAv2 = doc('collection/a', 2000, { v: '2' });
    const docAv3 = doc('collection/a', 3000, { v: '3' });
    const docAv5 = doc('collection/a', 5000, { v: '5' });

    return (
      spec()
        .userListens(query1)
        .watchAcksFull(query1, 1000, docAv1)
        .expectEvents(query1, { added: [docAv1] })
        .userDeletes('collection/a')
        .expectEvents(query1, { removed: [docAv1] })
        // We have a unacknowledged delete and ignore the Watch update.
        .watchSends({ affects: [query1] }, docAv2)
        .watchSnapshots(2000)
        // The write stream acks our delete at version 4000.
        .writeAcks('collection/a', 4000)
        .watchSends({ affects: [query1] }, docAv3)
        .watchSnapshots(3000)
        // Watch now sends us a document past our deleted version.
        .watchSends({ affects: [query1] }, docAv5)
        .watchSnapshots(5000)
        .expectEvents(query1, { added: [docAv5] })
    );
  });

  specTest('Listens are reestablished after network disconnect', [], () => {
    const expectRequestCount = (requestCounts: {
      [type: string]: number;
    }): number => requestCounts.addTarget + requestCounts.removeTarget;

    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'b' });
    return spec()
      .userListens(query1)
      .expectWatchStreamRequestCount(
        expectRequestCount({ addTarget: 1, removeTarget: 0 })
      )
      .watchAcksFull(query1, 1000, docA)
      .expectEvents(query1, { added: [docA] })
      .disableNetwork()
      .expectEvents(query1, { fromCache: true })
      .enableNetwork()
      .restoreListen(query1, 'resume-token-1000')
      .expectWatchStreamRequestCount(
        expectRequestCount({ addTarget: 2, removeTarget: 0 })
      )
      .watchAcksFull(query1, 2000, docB)
      .expectEvents(query1, { added: [docB] });
  });

  specTest('Synthesizes deletes for missing document', [], () => {
    const collQuery = query('collection');
    const docQuery = query('collection/a');
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 1000, { key: 'a' });
    return (
      spec()
        .withGCEnabled(false)
        // Add a collection query with two documents, one of which gets deleted
        // (the second document guarantees that we later raise an event from
        // cache).
        .userListens(collQuery)
        .watchAcksFull(collQuery, 1000, docA, docB)
        .expectEvents(collQuery, { added: [docA, docB] })
        .userUnlistens(collQuery)
        .watchRemoves(collQuery)
        // Verify that DocA and DocB exists
        .userListens(collQuery, 'resume-token-1000')
        .expectEvents(collQuery, { added: [docA, docB], fromCache: true })
        .userUnlistens(collQuery)
        // Now send a document query that produces no results from the server
        .userListens(docQuery)
        .expectEvents(docQuery, { added: [docA], fromCache: true })
        .watchAcks(docQuery)
        .watchCurrents(docQuery, 'resume-token-2000')
        .watchSnapshots(2000)
        // We get an empty event with a synthesized delete
        .expectEvents(docQuery, { removed: [docA] })
        .userUnlistens(docQuery)
        .watchRemoves(docQuery)
        // Re-add the initial collection query. Only Doc B exists now
        .userListens(collQuery, 'resume-token-1000')
        .expectEvents(collQuery, { added: [docB], fromCache: true })
    );
  });

  specTest('Re-opens target without existence filter', [], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { key: 'a' });
    const deletedDocA = deletedDoc('collection/a', 2000);
    return spec()
      .withGCEnabled(false)
      .userListens(query1)
      .watchAcksFull(query1, 1000, docA)
      .expectEvents(query1, { added: [docA] })
      .userUnlistens(query1)
      .watchRemoves(query1)
      .userListens(query1, 'resume-token-1000')
      .expectEvents(query1, { added: [docA], fromCache: true })
      .watchAcks(query1)
      .watchSends({ removed: [query1] }, deletedDocA)
      .watchCurrents(query1, 'resume-token-2000')
      .watchSnapshots(2000)
      .expectEvents(query1, { removed: [docA] });
  });

  specTest('Ignores update from inactive target', [], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'b' });
    return spec()
      .withGCEnabled(false)
      .userListens(query1)
      .watchAcksFull(query1, 1000, docA)
      .expectEvents(query1, { added: [docA] })
      .userUnlistens(query1)
      .watchSends({ affects: [query1] }, docB)
      .watchSnapshots(2000)
      .watchRemoves(query1)
      .userListens(query1, 'resume-token-1000')
      .expectEvents(query1, { added: [docA], fromCache: true });
  });

  specTest(
    'Does not synthesize deletes for previously acked documents',
    [],
    () => {
      const query1 = query('collection/a');
      const docA = doc('collection/a', 1000, { key: 'a' });
      return (
        spec()
          .withGCEnabled(false)
          .userListens(query1)
          .watchAcks(query1)
          .watchSends({ affects: [query1] }, docA)
          .watchSnapshots(1000)
          .expectEvents(query1, { added: [docA], fromCache: true })
          .watchCurrents(query1, 'resume-token-2000')
          .watchSnapshots(2000)
          // The snapshot is empty, but we have received 'docA' in a previous
          // snapshot and don't synthesize a document delete.
          .expectEvents(query1, { fromCache: false })
          .userUnlistens(query1)
          .userListens(query1, 'resume-token-2000')
          .expectEvents(query1, { added: [docA], fromCache: true })
      );
    }
  );

  specTest('Query is rejected and re-listened to', [], () => {
    const query1 = query('collection');

    return spec()
      .withGCEnabled(false)
      .userListens(query1)
      .watchRemoves(
        query1,
        new RpcError(Code.RESOURCE_EXHAUSTED, 'Resource exhausted')
      )
      .expectEvents(query1, { errorCode: Code.RESOURCE_EXHAUSTED })
      .userListens(query1)
      .watchAcksFull(query1, 1000)
      .expectEvents(query1, {});
  });

  specTest('Persists resume token sent with target', [], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 2000, { key: 'a' });
    return spec()
      .withGCEnabled(false)
      .userListens(query1)
      .watchAcksFull(query1, 1000)
      .expectEvents(query1, {})
      .watchSends({ affects: [query1] }, docA)
      .watchSnapshots(2000, [query1], 'resume-token-2000')
      .watchSnapshots(2000)
      .expectEvents(query1, { added: [docA] })
      .userUnlistens(query1)
      .watchRemoves(query1)
      .userListens(query1, 'resume-token-2000')
      .expectEvents(query1, { added: [docA], fromCache: true })
      .watchAcksFull(query1, 3000)
      .expectEvents(query1, {});
  });

  specTest('Array-contains queries support resuming', [], () => {
    const query1 = query('collection', filter('array', 'array-contains', 42));
    const docA = doc('collection/a', 2000, { foo: 'bar', array: [1, 42, 3] });
    return spec()
      .withGCEnabled(false)
      .userListens(query1)
      .watchAcksFull(query1, 1000)
      .expectEvents(query1, {})
      .watchSends({ affects: [query1] }, docA)
      .watchSnapshots(2000, [query1], 'resume-token-2000')
      .watchSnapshots(2000)
      .expectEvents(query1, { added: [docA] })
      .userUnlistens(query1)
      .watchRemoves(query1)
      .userListens(query1, 'resume-token-2000')
      .expectEvents(query1, { added: [docA], fromCache: true })
      .watchAcksFull(query1, 3000)
      .expectEvents(query1, {});
  });

  specTest('Persists global resume tokens on unlisten', [], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { key: 'a' });

    return (
      spec()
        .withGCEnabled(false)
        .userListens(query1)
        .watchAcksFull(query1, 1000, docA)
        .expectEvents(query1, { added: [docA] })

        // Some time later, watch sends an updated resume token and the user stops
        // listening.
        .watchSnapshots(2000, [], 'resume-token-2000')
        .userUnlistens(query1)
        .watchRemoves(query1)

        .userListens(query1, 'resume-token-2000')
        .expectEvents(query1, { added: [docA], fromCache: true })
        .watchAcks(query1)
        .watchCurrents(query1, 'resume-token-3000')
        .watchSnapshots(3000)
        .expectEvents(query1, { fromCache: false })
    );
  });

  specTest(
    'Omits global resume tokens for a short while',
    ['durable-persistence'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });

      return (
        spec()
          .withGCEnabled(false)
          .userListens(query1)
          .watchAcksFull(query1, 1000, docA)
          .expectEvents(query1, { added: [docA] })

          // One millisecond later, watch sends an updated resume token but the
          // user doesn't manage to unlisten before restart.
          .watchSnapshots(2000, [], 'resume-token-2000')
          .restart()

          .userListens(query1, 'resume-token-1000')
          .expectEvents(query1, { added: [docA], fromCache: true })
          .watchAcks(query1)
          .watchCurrents(query1, 'resume-token-3000')
          .watchSnapshots(3000)
          .expectEvents(query1, { fromCache: false })
      );
    }
  );

  specTest(
    'Persists global resume tokens if the snapshot is old enough',
    ['durable-persistence'],
    () => {
      const initialVersion = 1000;
      const minutesLater = 5 * 60 * 1e6 + initialVersion;
      const evenLater = 1000 + minutesLater;

      const query1 = query('collection');
      const docA = doc('collection/a', initialVersion, { key: 'a' });

      return (
        spec()
          .withGCEnabled(false)
          .userListens(query1)
          .watchAcksFull(query1, initialVersion, docA)
          .expectEvents(query1, { added: [docA] })

          // 5 minutes later, watch sends an updated resume token but the user
          // doesn't manage to unlisten before restart.
          .watchSnapshots(minutesLater, [], 'resume-token-minutes-later')
          .restart()

          .userListens(query1, 'resume-token-minutes-later')
          .expectEvents(query1, { added: [docA], fromCache: true })
          .watchAcks(query1)
          .watchCurrents(query1, 'resume-token-even-later')
          .watchSnapshots(evenLater)
          .expectEvents(query1, { fromCache: false })
      );
    }
  );

  specTest('Query is executed by primary client', ['multi-client'], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { key: 'a' });

    return client(0)
      .becomeVisible()
      .client(1)
      .userListens(query1)
      .client(0)
      .expectListen(query1)
      .watchAcks(query1)
      .watchSends({ affects: [query1] }, docA)
      .watchSnapshots(1000)
      .client(1)
      .expectEvents(query1, { added: [docA], fromCache: true })
      .client(0)
      .watchCurrents(query1, 'resume-token-2000')
      .watchSnapshots(2000)
      .client(1)
      .expectEvents(query1, { fromCache: false });
  });

  specTest(
    'Query is shared between primary and secondary client',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docB = doc('collection/b', 2000, { key: 'a' });

      return client(0)
        .becomeVisible()
        .userListens(query1)
        .watchAcksFull(query1, 1000, docA)
        .expectEvents(query1, { added: [docA] })
        .client(1)
        .userListens(query1)
        .expectEvents(query1, { added: [docA] })
        .client(2)
        .userListens(query1)
        .expectEvents(query1, { added: [docA] })
        .client(0)
        .watchSends({ affects: [query1] }, docB)
        .watchSnapshots(2000)
        .expectEvents(query1, { added: [docB] })
        .client(1)
        .expectEvents(query1, { added: [docB] })
        .client(2)
        .expectEvents(query1, { added: [docB] });
    }
  );

  specTest('Query is joined by primary client', ['multi-client'], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'b' });
    const docC = doc('collection/c', 3000, { key: 'c' });

    return client(0)
      .expectPrimaryState(true)
      .client(1)
      .userListens(query1)
      .client(0)
      .expectListen(query1)
      .watchAcksFull(query1, 100, docA)
      .client(1)
      .expectEvents(query1, { added: [docA] })
      .client(0)
      .watchSends({ affects: [query1] }, docB)
      .watchSnapshots(2000)
      .userListens(query1)
      .expectEvents(query1, { added: [docA, docB] })
      .watchSends({ affects: [query1] }, docC)
      .watchSnapshots(3000)
      .expectEvents(query1, { added: [docC] })
      .client(1)
      .expectEvents(query1, { added: [docB] })
      .expectEvents(query1, { added: [docC] });
  });

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
        .userListens(query1)
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

  specTest('Query is unlistened to by primary client', ['multi-client'], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'a' });

    return client(0)
      .becomeVisible()
      .userListens(query1)
      .watchAcksFull(query1, 1000, docA)
      .expectEvents(query1, { added: [docA] })
      .client(1)
      .userListens(query1)
      .expectEvents(query1, { added: [docA] })
      .client(0)
      .userUnlistens(query1)
      .expectListen(query1)
      .watchSends({ affects: [query1] }, docB)
      .watchSnapshots(2000)
      .client(1)
      .expectEvents(query1, { added: [docB] })
      .userUnlistens(query1)
      .client(0)
      .expectUnlisten(query1);
  });

  specTest('Query is resumed by secondary client', ['multi-client'], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'a' });

    return client(0, /* withGcEnabled= */ false)
      .becomeVisible()
      .client(1)
      .userListens(query1)
      .client(0)
      .expectListen(query1)
      .watchAcksFull(query1, 1000, docA)
      .client(1)
      .expectEvents(query1, { added: [docA] })
      .userUnlistens(query1)
      .client(0)
      .expectUnlisten(query1)
      .watchRemoves(query1)
      .client(1)
      .userListens(query1)
      .expectEvents(query1, { added: [docA], fromCache: true })
      .client(0)
      .expectListen(query1, 'resume-token-1000')
      .watchAcksFull(query1, 2000, docB)
      .client(1)
      .expectEvents(query1, { added: [docB] });
  });

  specTest('Query is rejected by primary client', ['multi-client'], () => {
    const query1 = query('collection');

    return client(0)
      .becomeVisible()
      .client(1)
      .userListens(query1)
      .client(0)
      .expectListen(query1)
      .watchRemoves(
        query1,
        new RpcError(Code.RESOURCE_EXHAUSTED, 'Resource exhausted')
      )
      .client(1)
      .expectEvents(query1, { errorCode: Code.RESOURCE_EXHAUSTED });
  });

  specTest(
    'Query is rejected and re-listened to by secondary client',
    ['multi-client'],
    () => {
      const query1 = query('collection');

      return client(0)
        .becomeVisible()
        .client(1)
        .userListens(query1)
        .client(0)
        .expectListen(query1)
        .watchRemoves(
          query1,
          new RpcError(Code.RESOURCE_EXHAUSTED, 'Resource exhausted')
        )
        .client(1)
        .expectEvents(query1, { errorCode: Code.RESOURCE_EXHAUSTED })
        .userListens(query1)
        .client(0)
        .expectListen(query1)
        .watchAcksFull(query1, 1000)
        .client(1)
        .expectEvents(query1, {});
    }
  );

  specTest(
    'Mirror queries from same secondary client',
    ['multi-client'],
    () => {
      const limit = query('collection', orderBy('val', 'asc')).withLimitToFirst(
        2
      );
      const limitToLast = query(
        'collection',
        orderBy('val', 'desc')
      ).withLimitToLast(2);
      const docA = doc('collection/a', 1000, { val: 0 });
      const docB = doc('collection/b', 1000, { val: 1 });
      const docC = doc('collection/c', 2000, { val: 0 });

      return client(0)
        .becomeVisible()
        .client(1)
        .userListens(limit)
        .userListens(limitToLast)
        .client(0)
        .expectListen(limit)
        .expectListen(limitToLast)
        .watchAcksFull(limit, 1000, docA, docB)
        .client(1)
        .expectEvents(limit, { added: [docA, docB] })
        .expectEvents(limitToLast, { added: [docB, docA] })
        .userUnlistens(limit)
        .client(0)
        .expectUnlisten(limit)
        .watchSends({ affects: [limitToLast] }, docC)
        .watchSnapshots(2000)
        .client(1)
        .expectEvents(limitToLast, { added: [docC], removed: [docB] })
        .userUnlistens(limitToLast)
        .client(0)
        .expectUnlisten(limitToLast)
        .expectActiveTargets();
    }
  );

  specTest(
    'Mirror queries from different secondary client',
    ['multi-client'],
    () => {
      const limit = query('collection', orderBy('val', 'asc')).withLimitToFirst(
        2
      );
      const limitToLast = query(
        'collection',
        orderBy('val', 'desc')
      ).withLimitToLast(2);
      const docA = doc('collection/a', 1000, { val: 0 });
      const docB = doc('collection/b', 1000, { val: 1 });
      const docC = doc('collection/c', 2000, { val: 0 });

      return client(0)
        .becomeVisible()
        .client(1)
        .userListens(limit)
        .client(2)
        .userListens(limitToLast)
        .client(0)
        .expectListen(limit)
        .expectListen(limitToLast)
        .watchAcksFull(limit, 1000, docA, docB)
        .client(1)
        .expectEvents(limit, { added: [docA, docB] })
        .client(2)
        .expectEvents(limitToLast, { added: [docB, docA] })
        .userUnlistens(limitToLast)
        .client(0)
        .expectUnlisten(limitToLast)
        .watchSends({ affects: [limit] }, docC)
        .watchSnapshots(2000)
        .client(1)
        .expectEvents(limit, { added: [docC], removed: [docB] });
    }
  );

  specTest(
    'Mirror queries from primary and secondary client',
    ['multi-client'],
    () => {
      const limit = query('collection', orderBy('val', 'asc')).withLimitToFirst(
        2
      );
      const limitToLast = query(
        'collection',
        orderBy('val', 'desc')
      ).withLimitToLast(2);
      const docA = doc('collection/a', 1000, { val: 0 });
      const docB = doc('collection/b', 1000, { val: 1 });
      const docC = doc('collection/c', 2000, { val: 0 });
      const docD = doc('collection/d', 3000, { val: -1 });

      return (
        client(0)
          .becomeVisible()
          .userListens(limit)
          .client(1)
          .userListens(limitToLast)
          .client(0)
          .expectListen(limit)
          .expectListen(limitToLast)
          .watchAcksFull(limit, 1000, docA, docB)
          .expectEvents(limit, { added: [docA, docB] })
          .client(1)
          .expectEvents(limitToLast, { added: [docB, docA] })
          // Secondary tab unlistens from its query
          .userUnlistens(limitToLast)
          .client(0)
          .expectUnlisten(limitToLast)
          .watchSends({ affects: [limit] }, docC)
          .watchSnapshots(2000)
          .expectEvents(limit, { added: [docC], removed: [docB] })
          .client(1)
          // Secondary tab re-listens the query previously unlistened.
          .userListens(limitToLast)
          .expectEvents(limitToLast, { added: [docC, docA] })
          .client(0)
          .expectListen(limitToLast)
          // Primary tab unlistens it's query.
          .userUnlistens(limit)
          .expectUnlisten(limit)
          .watchSends({ affects: [limitToLast] }, docD)
          .watchSnapshots(3000)
          .client(1)
          .expectEvents(limitToLast, { added: [docD], removed: [docC] })
          // Secondary tab unlisten it's query again, both mirror queries
          // are unlistened by now.
          .userUnlistens(limitToLast)
          .client(0)
          // TODO(b/143693491) If we use `expectListen` here, the test would
          // also pass, which is wrong. The reason is `TestRunner` only check
          // the expected Queries against the actual target. In the case of
          // mirror queries, both queries will be able to find an actual target.
          // We need to change `TestRunner` to track the actual client queries
          // in addition to the targets to fix this.
          .expectUnlisten(limitToLast)
          .expectActiveTargets()
      );
    }
  );

  specTest('Can listen/unlisten to mirror queries.', [], () => {
    const limit = query('collection', orderBy('val', 'asc')).withLimitToFirst(
      2
    );
    const limitToLast = query(
      'collection',
      orderBy('val', 'desc')
    ).withLimitToLast(2);
    const docA = doc('collection/a', 1000, { val: 0 });
    const docB = doc('collection/b', 1000, { val: 1 });
    const docC = doc('collection/c', 2000, { val: 0 });

    return (
      spec()
        .userListens(limit)
        .expectListen(limit)
        .userListens(limitToLast)
        .expectListen(limitToLast)
        .watchAcksFull(limit, 1000, docA, docB)
        .expectEvents(limit, { added: [docA, docB] })
        .expectEvents(limitToLast, { added: [docB, docA] })
        .userUnlistens(limitToLast)
        .expectUnlisten(limitToLast)
        .watchSends({ affects: [limit] }, docC)
        .watchCurrents(limit, 'resume-token-2000')
        .watchSnapshots(2000)
        .expectEvents(limit, { added: [docC], removed: [docB] })
        .userListens(limitToLast)
        .expectListen(limitToLast)
        // Note the result is not from cache because the target is kept
        // alive since `limit` is still being listened to.
        .expectEvents(limitToLast, { added: [docC, docA] })
        // Backend fails the query.
        .watchRemoves(
          limit,
          new RpcError(Code.RESOURCE_EXHAUSTED, 'Resource exhausted')
        )
        .expectEvents(limit, { errorCode: Code.RESOURCE_EXHAUSTED })
        .expectEvents(limitToLast, { errorCode: Code.RESOURCE_EXHAUSTED })
        .expectActiveTargets()
    );
  });

  specTest(
    "Secondary client uses primary client's online state",
    ['multi-client'],
    () => {
      const query1 = query('collection');

      return client(0)
        .becomeVisible()
        .client(1)
        .userListens(query1)
        .client(0)
        .expectListen(query1)
        .watchAcksFull(query1, 1000)
        .client(1)
        .expectEvents(query1, {})
        .client(0)
        .disableNetwork()
        .client(1)
        .expectEvents(query1, { fromCache: true })
        .client(0)
        .enableNetwork()
        .expectListen(query1, 'resume-token-1000')
        .watchAcksFull(query1, 2000)
        .client(1)
        .expectEvents(query1, {});
    }
  );

  specTest('New client uses existing online state', ['multi-client'], () => {
    const query1 = query('collection');
    const query2 = query('collection');

    return (
      client(0)
        .userListens(query1)
        .watchAcksFull(query1, 1000)
        .expectEvents(query1, {})
        .client(1)
        // Prevent client 0 from releasing its primary lease.
        .disableNetwork()
        .userListens(query1)
        .expectEvents(query1, {})
        .client(0)
        .disableNetwork()
        .expectEvents(query1, { fromCache: true })
        .client(2)
        .userListens(query1)
        .expectEvents(query1, { fromCache: true })
        .userListens(query2)
        .expectEvents(query2, { fromCache: true })
    );
  });

  specTest(
    'New client becomes primary if no client has its network enabled',
    ['multi-client'],
    () => {
      const query1 = query('collection');

      return client(0)
        .userListens(query1)
        .watchAcksFull(query1, 1000)
        .expectEvents(query1, {})
        .client(1)
        .userListens(query1)
        .expectEvents(query1, {})
        .client(0)
        .disableNetwork()
        .expectEvents(query1, { fromCache: true })
        .client(1)
        .expectEvents(query1, { fromCache: true })
        .client(2)
        .expectListen(query1, 'resume-token-1000')
        .expectPrimaryState(true)
        .watchAcksFull(query1, 2000)
        .client(0)
        .expectEvents(query1, {})
        .client(1)
        .expectEvents(query1, {});
    }
  );

  specTest(
    "Secondary client's online state is ignored",
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 2000, { key: 'a' });

      return (
        client(0)
          .becomeVisible()
          .client(1)
          .userListens(query1)
          .client(0)
          .expectListen(query1)
          .watchAcksFull(query1, 1000)
          .client(1)
          .expectEvents(query1, {})
          .disableNetwork() // Ignored since this is the secondary client.
          .client(0)
          .watchSends({ affects: [query1] }, docA)
          .watchSnapshots(2000)
          .client(1)
          .expectEvents(query1, { added: [docA] })
          .client(0)
          .disableNetwork()
          // Client remains primary since all clients are offline.
          .expectPrimaryState(true)
          .client(1)
          .expectEvents(query1, { fromCache: true })
          .expectPrimaryState(false)
      );
    }
  );

  specTest(
    "Offline state doesn't persist if primary is shut down",
    ['multi-client'],
    () => {
      const query1 = query('collection');

      return client(0)
        .userListens(query1)
        .disableNetwork()
        .expectEvents(query1, { fromCache: true })
        .shutdown()
        .client(1)
        .userListens(query1); // No event since the online state is 'Unknown'.
    }
  );

  specTest(
    'Listen is re-listened to after primary tab failover',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docB = doc('collection/b', 2000, { key: 'b' });

      return client(0)
        .expectPrimaryState(true)
        .client(1)
        .userListens(query1)
        .client(0)
        .expectListen(query1)
        .watchAcksFull(query1, 1000, docA)
        .client(1)
        .expectEvents(query1, { added: [docA] })
        .client(2)
        .userListens(query1)
        .expectEvents(query1, { added: [docA] })
        .client(0)
        .shutdown()
        .client(1)
        .runTimer(TimerId.ClientMetadataRefresh)
        .expectPrimaryState(true)
        .expectListen(query1, 'resume-token-1000')
        .watchAcksFull(query1, 2000, docB)
        .expectEvents(query1, { added: [docB] })
        .client(2)
        .expectEvents(query1, { added: [docB] });
    }
  );

  specTest('Listen is established in new primary tab', ['multi-client'], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'b' });

    // Client 0 and Client 2 listen to the same query. When client 0 shuts
    // down, client 1 becomes primary and takes ownership of a query it
    // did not previously listen to.
    return client(0)
      .expectPrimaryState(true)
      .userListens(query1)
      .watchAcksFull(query1, 1000, docA)
      .expectEvents(query1, { added: [docA] })
      .client(1) // Start up and initialize the second client.
      .client(2)
      .userListens(query1)
      .expectEvents(query1, { added: [docA] })
      .client(0)
      .shutdown()
      .client(1)
      .runTimer(TimerId.ClientMetadataRefresh)
      .expectPrimaryState(true)
      .expectListen(query1, 'resume-token-1000')
      .watchAcksFull(query1, 2000, docB)
      .client(2)
      .expectEvents(query1, { added: [docB] });
  });

  specTest('Query recovers after primary takeover', ['multi-client'], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'b' });
    const docC = doc('collection/c', 3000, { key: 'c' });

    return (
      client(0)
        .expectPrimaryState(true)
        .userListens(query1)
        .watchAcksFull(query1, 1000, docA)
        .expectEvents(query1, { added: [docA] })
        .client(1)
        .userListens(query1)
        .expectEvents(query1, { added: [docA] })
        .stealPrimaryLease()
        .expectListen(query1, 'resume-token-1000')
        .watchAcksFull(query1, 2000, docB)
        .expectEvents(query1, { added: [docB] })
        .client(0)
        // Client 0 ignores all events until it transitions to secondary
        .client(1)
        .watchSends({ affects: [query1] }, docC)
        .watchSnapshots(3000)
        .expectEvents(query1, { added: [docC] })
        .client(0)
        .runTimer(TimerId.ClientMetadataRefresh)
        // Client 0 recovers from its lease loss and applies the updates from
        // client 1
        .expectPrimaryState(false)
        .expectEvents(query1, { added: [docB, docC] })
    );
  });

  specTest('Query bounces between primaries', ['multi-client'], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'b' });
    const docC = doc('collection/c', 3000, { key: 'c' });

    // Client 0 listens to a query. Client 1 is the primary when the query is
    // first listened to, then the query switches to client 0 and back to client
    // 1.
    return client(1)
      .expectPrimaryState(true)
      .client(0)
      .userListens(query1)
      .client(1)
      .expectListen(query1)
      .watchAcksFull(query1, 1000, docA)
      .client(0)
      .expectEvents(query1, { added: [docA] })
      .client(2)
      .stealPrimaryLease()
      .expectListen(query1, 'resume-token-1000')
      .client(1)
      .runTimer(TimerId.ClientMetadataRefresh)
      .expectPrimaryState(false)
      .client(2)
      .watchAcksFull(query1, 2000, docB)
      .client(0)
      .expectEvents(query1, { added: [docB] })
      .client(1)
      .stealPrimaryLease()
      .expectListen(query1, 'resume-token-2000')
      .watchAcksFull(query1, 3000, docC)
      .client(0)
      .expectEvents(query1, { added: [docC] });
  });

  specTest(
    'Unresponsive primary ignores watch update',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });

      return (
        client(0)
          .expectPrimaryState(true)
          .client(1)
          .userListens(query1)
          .client(0)
          .expectListen(query1)
          .client(1)
          .stealPrimaryLease()
          .client(0)
          // Send a watch update to client 0, who is longer primary (but doesn't
          // know it yet). The watch update gets ignored.
          .watchAcksFull(query1, 1000, docA)
          .client(1)
          .expectListen(query1)
          .watchAcksFull(query1, 1000, docA)
          .expectEvents(query1, { added: [docA] })
      );
    }
  );

  specTest(
    'Listen is established in newly started primary',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docB = doc('collection/b', 2000, { key: 'b' });

      // Client 0 executes a query on behalf of Client 1. When client 0 shuts
      // down, client 2 starts up and becomes primary, taking ownership of the
      // existing query.
      return client(0)
        .expectPrimaryState(true)
        .client(1)
        .userListens(query1)
        .client(0)
        .expectListen(query1)
        .watchAcksFull(query1, 1000, docA)
        .client(1)
        .expectEvents(query1, { added: [docA] })
        .client(0)
        .shutdown()
        .client(2)
        .expectPrimaryState(true)
        .expectListen(query1, 'resume-token-1000')
        .watchAcksFull(query1, 2000, docB)
        .client(1)
        .expectEvents(query1, { added: [docB] });
    }
  );

  specTest(
    'Previous primary immediately regains primary lease',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 2000, { key: 'a' });

      return (
        client(0)
          .userListens(query1)
          .watchAcksFull(query1, 1000)
          .expectEvents(query1, {})
          .client(1)
          .stealPrimaryLease()
          .expectListen(query1, 'resume-token-1000')
          .watchAcksFull(query1, 2000, docA)
          .shutdown()
          .client(0)
          .expectPrimaryState(true)
          // The primary tab only discovers that it has lost its lease when it
          // is already eligible to obtain it again.
          .runTimer(TimerId.ClientMetadataRefresh)
          .expectPrimaryState(true)
          .expectListen(query1, 'resume-token-2000')
          .expectEvents(query1, { added: [docA] })
      );
    }
  );

  specTest(
    'onSnapshotsInSync should not fire for doc changes if there are no listeners',
    [],
    () => {
      return spec()
        .userAddsSnapshotsInSyncListener()
        .expectSnapshotsInSyncEvent()
        .userSets('collection/a', { v: 2 });
    }
  );

  specTest(
    'onSnapshotsInSync fires when called even if there are no local listeners',
    [],
    () => {
      return spec()
        .userAddsSnapshotsInSyncListener()
        .expectSnapshotsInSyncEvent()
        .userAddsSnapshotsInSyncListener()
        .expectSnapshotsInSyncEvent();
    }
  );

  specTest('onSnapshotsInSync fires for metadata changes', [], () => {
    const query1 = query('collection');
    const docAv1 = doc('collection/a', 1000, { v: 1 });
    const docAv2Local = doc(
      'collection/a',
      1000,
      { v: 2 },
      { hasLocalMutations: true }
    );
    const docAv2 = doc('collection/a', 2000, { v: 2 });

    return spec()
      .userListens(query1)
      .watchAcksFull(query1, 1000, docAv1)
      .expectEvents(query1, { added: [docAv1] })
      .userAddsSnapshotsInSyncListener()
      .expectSnapshotsInSyncEvent()
      .userSets('collection/a', { v: 2 })
      .expectEvents(query1, {
        hasPendingWrites: true,
        modified: [docAv2Local]
      })
      .expectSnapshotsInSyncEvent()
      .watchSends({ affects: [query1] }, docAv2)
      .watchSnapshots(2000)
      .writeAcks('collection/a', 2000)
      .expectEvents(query1, {
        metadata: [docAv2]
      })
      .expectSnapshotsInSyncEvent();
  });

  specTest(
    'onSnapshotsInSync fires once for multiple event snapshots',
    [],
    () => {
      const query1 = query('collection');
      const query2 = query('collection/a');
      const docAv1 = doc('collection/a', 1000, { v: 1 });
      const docAv2Local = doc(
        'collection/a',
        1000,
        { v: 2 },
        { hasLocalMutations: true }
      );
      const docAv2 = doc('collection/a', 2000, { v: 2 });

      return spec()
        .userListens(query1)
        .watchAcksFull(query1, 1000, docAv1)
        .expectEvents(query1, { added: [docAv1] })
        .userListens(query2)
        .expectEvents(query2, { fromCache: true, added: [docAv1] })
        .watchAcksFull(query2, 1000, docAv1)
        .expectEvents(query2, { fromCache: false })
        .userAddsSnapshotsInSyncListener()
        .expectSnapshotsInSyncEvent()
        .userSets('collection/a', { v: 2 })
        .expectEvents(query1, {
          hasPendingWrites: true,
          modified: [docAv2Local]
        })
        .expectEvents(query2, {
          hasPendingWrites: true,
          modified: [docAv2Local]
        })
        .expectSnapshotsInSyncEvent()
        .watchSends({ affects: [query1, query2] }, docAv2)
        .watchSnapshots(2000)
        .writeAcks('collection/a', 2000)
        .expectEvents(query1, {
          metadata: [docAv2]
        })
        .expectEvents(query2, {
          metadata: [docAv2]
        })
        .expectSnapshotsInSyncEvent();
    }
  );

  specTest('onSnapshotsInSync fires for multiple listeners', [], () => {
    const query1 = query('collection');
    const docAv1 = doc('collection/a', 1000, { v: 1 });
    const docAv2Local = doc(
      'collection/a',
      1000,
      { v: 2 },
      { hasLocalMutations: true }
    );
    const docAv3Local = doc(
      'collection/a',
      1000,
      { v: 3 },
      { hasLocalMutations: true }
    );
    const docAv4Local = doc(
      'collection/a',
      1000,
      { v: 4 },
      { hasLocalMutations: true }
    );

    return spec()
      .userListens(query1)
      .watchAcksFull(query1, 1000, docAv1)
      .expectEvents(query1, { added: [docAv1] })
      .userAddsSnapshotsInSyncListener()
      .expectSnapshotsInSyncEvent()
      .userSets('collection/a', { v: 2 })
      .expectEvents(query1, {
        hasPendingWrites: true,
        modified: [docAv2Local]
      })
      .expectSnapshotsInSyncEvent()
      .userAddsSnapshotsInSyncListener()
      .expectSnapshotsInSyncEvent()
      .userAddsSnapshotsInSyncListener()
      .expectSnapshotsInSyncEvent()
      .userSets('collection/a', { v: 3 })
      .expectEvents(query1, {
        hasPendingWrites: true,
        modified: [docAv3Local]
      })
      .expectSnapshotsInSyncEvent(3)
      .userRemovesSnapshotsInSyncListener()
      .userSets('collection/a', { v: 4 })
      .expectEvents(query1, {
        hasPendingWrites: true,
        modified: [docAv4Local]
      })
      .expectSnapshotsInSyncEvent(2);
  });
});
