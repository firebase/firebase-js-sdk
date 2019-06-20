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

import { Query } from '../../../src/core/query';
import { Code } from '../../../src/util/error';
import { deletedDoc, doc, filter, path } from '../../util/helpers';

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
      const query = Query.atPath(path('collection'));
      const docA = doc('collection/a', 1000, { key: 'a' });
      return (
        spec()
          .userListens(query)
          .watchAcksFull(query, 1000, docA)
          .expectEvents(query, { added: [docA] })
          .userUnlistens(query)
          // should get no events.
          .userListens(query)
      );
    }
  );

  specTest('Contents of query update when new data is received.', [], () => {
    const query = Query.atPath(path('collection'));
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'b' });
    return spec()
      .userListens(query)
      .watchAcksFull(query, 1000, docA)
      .expectEvents(query, { added: [docA] })
      .watchSends({ affects: [query] }, docB)
      .watchSnapshots(2000)
      .expectEvents(query, { added: [docB] });
  });

  specTest("Doesn't raise events for empty target", [], () => {
    const query1 = Query.atPath(path('collection1'));
    const query2 = Query.atPath(path('collection2'));
    const query3 = Query.atPath(path('collection3'));
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
    const query1 = Query.atPath(path('collection'));
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
    const query1 = Query.atPath(path('collection'));
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
      const query1 = Query.atPath(path('collection'));
      const query2 = Query.atPath(path('collection')).withLimit(10);
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
    const query = Query.atPath(path('collection'));
    const missingDoc = deletedDoc('collection/a', 1000);
    return (
      spec()
        .userListens(query)
        .watchAcks(query)
        // To indicate the document doesn't exist, watch sends a DocumentDelete
        // message as if the document previously existed and now is being
        // deleted/removed from the target.
        .watchSends({ removed: [query] }, missingDoc)
        .watchSnapshots(1000)
        .watchCurrents(query, 'resume-token-2000')
        .watchSnapshots(2000)
        .expectEvents(query, { fromCache: false })
    );
  });

  specTest(
    'Will process removals without waiting for a consistent snapshot',
    [],
    () => {
      const query = Query.atPath(path('collection'));

      return spec()
        .userListens(query)
        .watchAcks(query)
        .watchRemoves(
          query,
          new RpcError(Code.RESOURCE_EXHAUSTED, 'Resource exhausted')
        )
        .expectEvents(query, { errorCode: Code.RESOURCE_EXHAUSTED });
    }
  );

  specTest('Will re-issue listen for errored target', [], () => {
    const query = Query.atPath(path('collection'));

    return spec()
      .withGCEnabled(false)
      .userListens(query)
      .watchAcks(query)
      .watchRemoves(
        query,
        new RpcError(Code.RESOURCE_EXHAUSTED, 'Resource exhausted')
      )
      .expectEvents(query, { errorCode: Code.RESOURCE_EXHAUSTED })
      .userListens(query)
      .watchAcksFull(query, 1000)
      .expectEvents(query, {});
  });

  // It can happen that we need to process watch messages for previously failed
  // targets, because target failures are handled out of band.
  // This test verifies that the code does not crash in this case.
  specTest('Will gracefully process failed targets', [], () => {
    const query1 = Query.atPath(path('collection1'));
    const query2 = Query.atPath(path('collection2'));
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
      const query = Query.atPath(path('collection'));
      const docAv1 = doc('collection/a', 1000, { v: 'v1000' });
      const docAv2 = doc('collection/a', 2000, { v: 'v2000' });

      return (
        spec()
          // Disable GC so the cache persists across listens.
          .withGCEnabled(false)
          .userListens(query)
          .watchAcksFull(query, 1000, docAv1)
          .expectEvents(query, { added: [docAv1] })
          .watchSends({ affects: [query] }, docAv2)
          .watchSnapshots(2000)
          .expectEvents(query, { modified: [docAv2] })
          // Remove and re-add listener.
          .userUnlistens(query)
          .watchRemoves(query)
          .userListens(query, 'resume-token-1000')
          .expectEvents(query, { added: [docAv2], fromCache: true })
          // watch sends old snapshot.
          .watchAcksFull(query, 1000, docAv1)
          // no error and no events

          // should get events once stream is caught up.
          .watchSends({ affects: [query] }, docAv2)
          .watchSnapshots(2000)
          .expectEvents(query, { fromCache: false })
      );
    }
  );

  // This would only happen when we use a resume token, but omitted for brevity.
  specTest(
    'Will gracefully handle watch stream reverting snapshots (with restart)',
    ['durable-persistence'],
    () => {
      const query = Query.atPath(path('collection'));
      const docAv1 = doc('collection/a', 1000, { v: 'v1000' });
      const docAv2 = doc('collection/a', 2000, { v: 'v2000' });

      return (
        spec()
          // Disable GC so the cache persists across listens.
          .withGCEnabled(false)
          .userListens(query)
          .watchAcksFull(query, 1000, docAv1)
          .expectEvents(query, { added: [docAv1] })
          .watchSends({ affects: [query] }, docAv2)
          .watchSnapshots(2000)
          .expectEvents(query, { modified: [docAv2] })
          // restart the client and re-listen.
          .restart()
          .userListens(query, 'resume-token-1000')
          .expectEvents(query, { added: [docAv2], fromCache: true })
          // watch sends old snapshot.
          .watchAcksFull(query, 1000, docAv1)
          // no error and no events

          // should get events once stream is caught up.
          .watchSends({ affects: [query] }, docAv2)
          .watchSnapshots(2000)
          .expectEvents(query, { fromCache: false })
      );
    }
  );

  specTest('Individual documents cannot revert', [], () => {
    const allQuery = Query.atPath(path('collection'));
    const visibleQuery = Query.atPath(path('collection')).addFilter(
      filter('visible', '==', true)
    );
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
    const allQuery = Query.atPath(path('collection'));
    const visibleQuery = Query.atPath(path('collection')).addFilter(
      filter('visible', '==', true)
    );
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
    const query1 = Query.atPath(path('collection'));
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

  specTest('Deleted documents in cache are fixed', [], () => {
    const allQuery = Query.atPath(path('collection'));
    const setupQuery = allQuery.addFilter(filter('key', '==', 'a'));

    const docAv1 = doc('collection/a', 1000, { key: 'a' });
    const docDeleted = deletedDoc('collection/a', 2000);

    return (
      spec()
        // Presuppose an initial state where the remote document cache has a
        // broken synthesized delete at a timestamp later than the true version
        // of the document. This requires both adding and later removing the
        // document in order to force the watch change aggregator to propagate
        // the deletion.
        .withGCEnabled(false)
        .userListens(setupQuery)
        .watchAcksFull(setupQuery, 1000, docAv1)
        .expectEvents(setupQuery, { added: [docAv1], fromCache: false })
        .watchSends({ removed: [setupQuery] }, docDeleted)
        .watchSnapshots(2000, [setupQuery], 'resume-token-2000')
        .watchSnapshots(2000)
        .expectEvents(setupQuery, { removed: [docAv1], fromCache: false })
        .userUnlistens(setupQuery)
        .watchRemoves(setupQuery)

        // Now when the client listens expect the cached NoDocument to be
        // discarded because the global snapshot version exceeds what came
        // before.
        .userListens(allQuery)
        .watchAcksFull(allQuery, 3000, docAv1)
        .expectEvents(allQuery, { added: [docAv1], fromCache: false })
    );
  });

  specTest('Listens are reestablished after network disconnect', [], () => {
    const expectRequestCount = (requestCounts: {
      [type: string]: number;
    }): number => requestCounts.addTarget + requestCounts.removeTarget;

    const query = Query.atPath(path('collection'));
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'b' });
    return spec()
      .userListens(query)
      .expectWatchStreamRequestCount(
        expectRequestCount({ addTarget: 1, removeTarget: 0 })
      )
      .watchAcksFull(query, 1000, docA)
      .expectEvents(query, { added: [docA] })
      .disableNetwork()
      .expectEvents(query, { fromCache: true })
      .enableNetwork()
      .restoreListen(query, 'resume-token-1000')
      .expectWatchStreamRequestCount(
        expectRequestCount({ addTarget: 2, removeTarget: 0 })
      )
      .watchAcksFull(query, 2000, docB)
      .expectEvents(query, { added: [docB] });
  });

  specTest('Synthesizes deletes for missing document', [], () => {
    const collQuery = Query.atPath(path('collection'));
    const docQuery = Query.atPath(path('collection/a'));
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
    const query = Query.atPath(path('collection'));
    const docA = doc('collection/a', 1000, { key: 'a' });
    const deletedDocA = deletedDoc('collection/a', 2000);
    return spec()
      .withGCEnabled(false)
      .userListens(query)
      .watchAcksFull(query, 1000, docA)
      .expectEvents(query, { added: [docA] })
      .userUnlistens(query)
      .watchRemoves(query)
      .userListens(query, 'resume-token-1000')
      .expectEvents(query, { added: [docA], fromCache: true })
      .watchAcks(query)
      .watchSends({ removed: [query] }, deletedDocA)
      .watchCurrents(query, 'resume-token-2000')
      .watchSnapshots(2000)
      .expectEvents(query, { removed: [docA] });
  });

  specTest('Ignores update from inactive target', [], () => {
    const query = Query.atPath(path('collection'));
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'b' });
    return spec()
      .withGCEnabled(false)
      .userListens(query)
      .watchAcksFull(query, 1000, docA)
      .expectEvents(query, { added: [docA] })
      .userUnlistens(query)
      .watchSends({ affects: [query] }, docB)
      .watchSnapshots(2000)
      .watchRemoves(query)
      .userListens(query, 'resume-token-1000')
      .expectEvents(query, { added: [docA], fromCache: true });
  });

  specTest(
    'Does not synthesize deletes for previously acked documents',
    [],
    () => {
      const query = Query.atPath(path('collection/a'));
      const docA = doc('collection/a', 1000, { key: 'a' });
      return (
        spec()
          .withGCEnabled(false)
          .userListens(query)
          .watchAcks(query)
          .watchSends({ affects: [query] }, docA)
          .watchSnapshots(1000)
          .expectEvents(query, { added: [docA], fromCache: true })
          .watchCurrents(query, 'resume-token-2000')
          .watchSnapshots(2000)
          // The snapshot is empty, but we have received 'docA' in a previous
          // snapshot and don't synthesize a document delete.
          .expectEvents(query, { fromCache: false })
          .userUnlistens(query)
          .userListens(query, 'resume-token-2000')
          .expectEvents(query, { added: [docA], fromCache: true })
      );
    }
  );

  specTest('Query is rejected and re-listened to', [], () => {
    const query = Query.atPath(path('collection'));

    return spec()
      .withGCEnabled(false)
      .userListens(query)
      .watchRemoves(
        query,
        new RpcError(Code.RESOURCE_EXHAUSTED, 'Resource exhausted')
      )
      .expectEvents(query, { errorCode: Code.RESOURCE_EXHAUSTED })
      .userListens(query)
      .watchAcksFull(query, 1000)
      .expectEvents(query, {});
  });

  specTest('Persists resume token sent with target', [], () => {
    const query = Query.atPath(path('collection'));
    const docA = doc('collection/a', 2000, { key: 'a' });
    return spec()
      .withGCEnabled(false)
      .userListens(query)
      .watchAcksFull(query, 1000)
      .expectEvents(query, {})
      .watchSends({ affects: [query] }, docA)
      .watchSnapshots(2000, [query], 'resume-token-2000')
      .watchSnapshots(2000)
      .expectEvents(query, { added: [docA] })
      .userUnlistens(query)
      .watchRemoves(query)
      .userListens(query, 'resume-token-2000')
      .expectEvents(query, { added: [docA], fromCache: true })
      .watchAcksFull(query, 3000)
      .expectEvents(query, {});
  });

  specTest('Array-contains queries support resuming', [], () => {
    const query = Query.atPath(path('collection')).addFilter(
      filter('array', 'array-contains', 42)
    );
    const docA = doc('collection/a', 2000, { foo: 'bar', array: [1, 42, 3] });
    return spec()
      .withGCEnabled(false)
      .userListens(query)
      .watchAcksFull(query, 1000)
      .expectEvents(query, {})
      .watchSends({ affects: [query] }, docA)
      .watchSnapshots(2000, [query], 'resume-token-2000')
      .watchSnapshots(2000)
      .expectEvents(query, { added: [docA] })
      .userUnlistens(query)
      .watchRemoves(query)
      .userListens(query, 'resume-token-2000')
      .expectEvents(query, { added: [docA], fromCache: true })
      .watchAcksFull(query, 3000)
      .expectEvents(query, {});
  });

  specTest('Persists global resume tokens on unlisten', [], () => {
    const query = Query.atPath(path('collection'));
    const docA = doc('collection/a', 1000, { key: 'a' });

    return (
      spec()
        .withGCEnabled(false)
        .userListens(query)
        .watchAcksFull(query, 1000, docA)
        .expectEvents(query, { added: [docA] })

        // Some time later, watch sends an updated resume token and the user stops
        // listening.
        .watchSnapshots(2000, [], 'resume-token-2000')
        .userUnlistens(query)
        .watchRemoves(query)

        .userListens(query, 'resume-token-2000')
        .expectEvents(query, { added: [docA], fromCache: true })
        .watchAcks(query)
        .watchCurrents(query, 'resume-token-3000')
        .watchSnapshots(3000)
        .expectEvents(query, { fromCache: false })
    );
  });

  specTest(
    'Omits global resume tokens for a short while',
    ['durable-persistence'],
    () => {
      const query = Query.atPath(path('collection'));
      const docA = doc('collection/a', 1000, { key: 'a' });

      return (
        spec()
          .withGCEnabled(false)
          .userListens(query)
          .watchAcksFull(query, 1000, docA)
          .expectEvents(query, { added: [docA] })

          // One millisecond later, watch sends an updated resume token but the
          // user doesn't manage to unlisten before restart.
          .watchSnapshots(2000, [], 'resume-token-2000')
          .restart()

          .userListens(query, 'resume-token-1000')
          .expectEvents(query, { added: [docA], fromCache: true })
          .watchAcks(query)
          .watchCurrents(query, 'resume-token-3000')
          .watchSnapshots(3000)
          .expectEvents(query, { fromCache: false })
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

      const query = Query.atPath(path('collection'));
      const docA = doc('collection/a', initialVersion, { key: 'a' });

      return (
        spec()
          .withGCEnabled(false)
          .userListens(query)
          .watchAcksFull(query, initialVersion, docA)
          .expectEvents(query, { added: [docA] })

          // 5 minutes later, watch sends an updated resume token but the user
          // doesn't manage to unlisten before restart.
          .watchSnapshots(minutesLater, [], 'resume-token-minutes-later')
          .restart()

          .userListens(query, 'resume-token-minutes-later')
          .expectEvents(query, { added: [docA], fromCache: true })
          .watchAcks(query)
          .watchCurrents(query, 'resume-token-even-later')
          .watchSnapshots(evenLater)
          .expectEvents(query, { fromCache: false })
      );
    }
  );

  specTest('Query is executed by primary client', ['multi-client'], () => {
    const query = Query.atPath(path('collection'));
    const docA = doc('collection/a', 1000, { key: 'a' });

    return client(0)
      .becomeVisible()
      .client(1)
      .userListens(query)
      .client(0)
      .expectListen(query)
      .watchAcks(query)
      .watchSends({ affects: [query] }, docA)
      .watchSnapshots(1000)
      .client(1)
      .expectEvents(query, { added: [docA], fromCache: true })
      .client(0)
      .watchCurrents(query, 'resume-token-2000')
      .watchSnapshots(2000)
      .client(1)
      .expectEvents(query, { fromCache: false });
  });

  specTest(
    'Query is shared between primary and secondary client',
    ['multi-client'],
    () => {
      const query = Query.atPath(path('collection'));
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docB = doc('collection/b', 2000, { key: 'a' });

      return client(0)
        .becomeVisible()
        .userListens(query)
        .watchAcksFull(query, 1000, docA)
        .expectEvents(query, { added: [docA] })
        .client(1)
        .userListens(query)
        .expectEvents(query, { added: [docA] })
        .client(2)
        .userListens(query)
        .expectEvents(query, { added: [docA] })
        .client(0)
        .watchSends({ affects: [query] }, docB)
        .watchSnapshots(2000)
        .expectEvents(query, { added: [docB] })
        .client(1)
        .expectEvents(query, { added: [docB] })
        .client(2)
        .expectEvents(query, { added: [docB] });
    }
  );

  specTest('Query is joined by primary client', ['multi-client'], () => {
    const query = Query.atPath(path('collection'));
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'b' });
    const docC = doc('collection/c', 3000, { key: 'c' });

    return client(0)
      .expectPrimaryState(true)
      .client(1)
      .userListens(query)
      .client(0)
      .expectListen(query)
      .watchAcksFull(query, 100, docA)
      .client(1)
      .expectEvents(query, { added: [docA] })
      .client(0)
      .watchSends({ affects: [query] }, docB)
      .watchSnapshots(2000)
      .userListens(query)
      .expectEvents(query, { added: [docA, docB] })
      .watchSends({ affects: [query] }, docC)
      .watchSnapshots(3000)
      .expectEvents(query, { added: [docC] })
      .client(1)
      .expectEvents(query, { added: [docB] })
      .expectEvents(query, { added: [docC] });
  });

  specTest(
    'Query only raises events in participating clients',
    ['multi-client'],
    () => {
      const query = Query.atPath(path('collection'));
      const docA = doc('collection/a', 1000, { key: 'a' });

      return client(0)
        .becomeVisible()
        .client(1)
        .client(2)
        .userListens(query)
        .client(3)
        .userListens(query)
        .client(0) // No events
        .expectListen(query)
        .watchAcksFull(query, 1000, docA)
        .client(1) // No events
        .client(2)
        .expectEvents(query, { added: [docA] })
        .client(3)
        .expectEvents(query, { added: [docA] });
    }
  );

  specTest('Query is unlistened to by primary client', ['multi-client'], () => {
    const query = Query.atPath(path('collection'));
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'a' });

    return client(0)
      .becomeVisible()
      .userListens(query)
      .watchAcksFull(query, 1000, docA)
      .expectEvents(query, { added: [docA] })
      .client(1)
      .userListens(query)
      .expectEvents(query, { added: [docA] })
      .client(0)
      .userUnlistens(query)
      .expectListen(query)
      .watchSends({ affects: [query] }, docB)
      .watchSnapshots(2000)
      .client(1)
      .expectEvents(query, { added: [docB] })
      .userUnlistens(query)
      .client(0)
      .expectUnlisten(query);
  });

  specTest('Query is resumed by secondary client', ['multi-client'], () => {
    const query = Query.atPath(path('collection'));
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'a' });

    return client(0, /* withGcEnabled= */ false)
      .becomeVisible()
      .client(1)
      .userListens(query)
      .client(0)
      .expectListen(query)
      .watchAcksFull(query, 1000, docA)
      .client(1)
      .expectEvents(query, { added: [docA] })
      .userUnlistens(query)
      .client(0)
      .expectUnlisten(query)
      .watchRemoves(query)
      .client(1)
      .userListens(query)
      .expectEvents(query, { added: [docA], fromCache: true })
      .client(0)
      .expectListen(query, 'resume-token-1000')
      .watchAcksFull(query, 2000, docB)
      .client(1)
      .expectEvents(query, { added: [docB] });
  });

  specTest('Query is rejected by primary client', ['multi-client'], () => {
    const query = Query.atPath(path('collection'));

    return client(0)
      .becomeVisible()
      .client(1)
      .userListens(query)
      .client(0)
      .expectListen(query)
      .watchRemoves(
        query,
        new RpcError(Code.RESOURCE_EXHAUSTED, 'Resource exhausted')
      )
      .client(1)
      .expectEvents(query, { errorCode: Code.RESOURCE_EXHAUSTED });
  });

  specTest(
    'Query is rejected and re-listened to by secondary client',
    ['multi-client'],
    () => {
      const query = Query.atPath(path('collection'));

      return client(0)
        .becomeVisible()
        .client(1)
        .userListens(query)
        .client(0)
        .expectListen(query)
        .watchRemoves(
          query,
          new RpcError(Code.RESOURCE_EXHAUSTED, 'Resource exhausted')
        )
        .client(1)
        .expectEvents(query, { errorCode: Code.RESOURCE_EXHAUSTED })
        .userListens(query)
        .client(0)
        .expectListen(query)
        .watchAcksFull(query, 1000)
        .client(1)
        .expectEvents(query, {});
    }
  );

  specTest(
    "Secondary client uses primary client's online state",
    ['multi-client'],
    () => {
      const query = Query.atPath(path('collection'));

      return client(0)
        .becomeVisible()
        .client(1)
        .userListens(query)
        .client(0)
        .expectListen(query)
        .watchAcksFull(query, 1000)
        .client(1)
        .expectEvents(query, {})
        .client(0)
        .disableNetwork()
        .client(1)
        .expectEvents(query, { fromCache: true })
        .client(0)
        .enableNetwork()
        .expectListen(query, 'resume-token-1000')
        .watchAcksFull(query, 2000)
        .client(1)
        .expectEvents(query, {});
    }
  );

  specTest('New client uses existing online state', ['multi-client'], () => {
    const query1 = Query.atPath(path('collection'));
    const query2 = Query.atPath(path('collection'));

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
      const query = Query.atPath(path('collection'));

      return client(0)
        .userListens(query)
        .watchAcksFull(query, 1000)
        .expectEvents(query, {})
        .client(1)
        .userListens(query)
        .expectEvents(query, {})
        .client(0)
        .disableNetwork()
        .expectEvents(query, { fromCache: true })
        .client(1)
        .expectEvents(query, { fromCache: true })
        .client(2)
        .expectListen(query, 'resume-token-1000')
        .expectPrimaryState(true)
        .watchAcksFull(query, 2000)
        .client(0)
        .expectEvents(query, {})
        .client(1)
        .expectEvents(query, {});
    }
  );

  specTest(
    "Secondary client's online state is ignored",
    ['multi-client'],
    () => {
      const query = Query.atPath(path('collection'));
      const docA = doc('collection/a', 2000, { key: 'a' });

      return (
        client(0)
          .becomeVisible()
          .client(1)
          .userListens(query)
          .client(0)
          .expectListen(query)
          .watchAcksFull(query, 1000)
          .client(1)
          .expectEvents(query, {})
          .disableNetwork() // Ignored since this is the secondary client.
          .client(0)
          .watchSends({ affects: [query] }, docA)
          .watchSnapshots(2000)
          .client(1)
          .expectEvents(query, { added: [docA] })
          .client(0)
          .disableNetwork()
          // Client remains primary since all clients are offline.
          .expectPrimaryState(true)
          .client(1)
          .expectEvents(query, { fromCache: true })
          .expectPrimaryState(false)
      );
    }
  );

  specTest(
    "Offline state doesn't persist if primary is shut down",
    ['multi-client'],
    () => {
      const query = Query.atPath(path('collection'));

      return client(0)
        .userListens(query)
        .disableNetwork()
        .expectEvents(query, { fromCache: true })
        .shutdown()
        .client(1)
        .userListens(query); // No event since the online state is 'Unknown'.
    }
  );

  specTest(
    'Listen is re-listened to after primary tab failover',
    ['multi-client'],
    () => {
      const query = Query.atPath(path('collection'));
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docB = doc('collection/b', 2000, { key: 'b' });

      return client(0)
        .expectPrimaryState(true)
        .client(1)
        .userListens(query)
        .client(0)
        .expectListen(query)
        .watchAcksFull(query, 1000, docA)
        .client(1)
        .expectEvents(query, { added: [docA] })
        .client(2)
        .userListens(query)
        .expectEvents(query, { added: [docA] })
        .client(0)
        .shutdown()
        .client(1)
        .runTimer(TimerId.ClientMetadataRefresh)
        .expectPrimaryState(true)
        .expectListen(query, 'resume-token-1000')
        .watchAcksFull(query, 2000, docB)
        .expectEvents(query, { added: [docB] })
        .client(2)
        .expectEvents(query, { added: [docB] });
    }
  );

  specTest('Listen is established in new primary tab', ['multi-client'], () => {
    const query = Query.atPath(path('collection'));
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'b' });

    // Client 0 and Client 2 listen to the same query. When client 0 shuts
    // down, client 1 becomes primary and takes ownership of a query it
    // did not previously listen to.
    return client(0)
      .expectPrimaryState(true)
      .userListens(query)
      .watchAcksFull(query, 1000, docA)
      .expectEvents(query, { added: [docA] })
      .client(1) // Start up and initialize the second client.
      .client(2)
      .userListens(query)
      .expectEvents(query, { added: [docA] })
      .client(0)
      .shutdown()
      .client(1)
      .runTimer(TimerId.ClientMetadataRefresh)
      .expectPrimaryState(true)
      .expectListen(query, 'resume-token-1000')
      .watchAcksFull(query, 2000, docB)
      .client(2)
      .expectEvents(query, { added: [docB] });
  });

  specTest('Query recovers after primary takeover', ['multi-client'], () => {
    const query = Query.atPath(path('collection'));
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'b' });
    const docC = doc('collection/c', 3000, { key: 'c' });

    return (
      client(0)
        .expectPrimaryState(true)
        .userListens(query)
        .watchAcksFull(query, 1000, docA)
        .expectEvents(query, { added: [docA] })
        .client(1)
        .userListens(query)
        .expectEvents(query, { added: [docA] })
        .stealPrimaryLease()
        .expectListen(query, 'resume-token-1000')
        .watchAcksFull(query, 2000, docB)
        .expectEvents(query, { added: [docB] })
        .client(0)
        // Client 0 ignores all events until it transitions to secondary
        .client(1)
        .watchSends({ affects: [query] }, docC)
        .watchSnapshots(3000)
        .expectEvents(query, { added: [docC] })
        .client(0)
        .runTimer(TimerId.ClientMetadataRefresh)
        // Client 0 recovers from its lease loss and applies the updates from
        // client 1
        .expectPrimaryState(false)
        .expectEvents(query, { added: [docB, docC] })
    );
  });

  specTest('Query bounces between primaries', ['multi-client'], () => {
    const query = Query.atPath(path('collection'));
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'b' });
    const docC = doc('collection/c', 3000, { key: 'c' });

    // Client 0 listens to a query. Client 1 is the primary when the query is
    // first listened to, then the query switches to client 0 and back to client
    // 1.
    return client(1)
      .expectPrimaryState(true)
      .client(0)
      .userListens(query)
      .client(1)
      .expectListen(query)
      .watchAcksFull(query, 1000, docA)
      .client(0)
      .expectEvents(query, { added: [docA] })
      .client(2)
      .stealPrimaryLease()
      .expectListen(query, 'resume-token-1000')
      .client(1)
      .runTimer(TimerId.ClientMetadataRefresh)
      .expectPrimaryState(false)
      .client(2)
      .watchAcksFull(query, 2000, docB)
      .client(0)
      .expectEvents(query, { added: [docB] })
      .client(1)
      .stealPrimaryLease()
      .expectListen(query, 'resume-token-2000')
      .watchAcksFull(query, 2000, docC)
      .client(0)
      .expectEvents(query, { added: [docC] });
  });

  specTest(
    'Unresponsive primary ignores watch update',
    ['multi-client'],
    () => {
      const query = Query.atPath(path('collection'));
      const docA = doc('collection/a', 1000, { key: 'a' });

      return (
        client(0)
          .expectPrimaryState(true)
          .client(1)
          .userListens(query)
          .client(0)
          .expectListen(query)
          .client(1)
          .stealPrimaryLease()
          .client(0)
          // Send a watch update to client 0, who is longer primary (but doesn't
          // know it yet). The watch update gets ignored.
          .watchAcksFull(query, 1000, docA)
          .client(1)
          .expectListen(query)
          .watchAcksFull(query, 1000, docA)
          .expectEvents(query, { added: [docA] })
      );
    }
  );

  specTest(
    'Listen is established in newly started primary',
    ['multi-client'],
    () => {
      const query = Query.atPath(path('collection'));
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docB = doc('collection/b', 2000, { key: 'b' });

      // Client 0 executes a query on behalf of Client 1. When client 0 shuts
      // down, client 2 starts up and becomes primary, taking ownership of the
      // existing query.
      return client(0)
        .expectPrimaryState(true)
        .client(1)
        .userListens(query)
        .client(0)
        .expectListen(query)
        .watchAcksFull(query, 1000, docA)
        .client(1)
        .expectEvents(query, { added: [docA] })
        .client(0)
        .shutdown()
        .client(2)
        .expectPrimaryState(true)
        .expectListen(query, 'resume-token-1000')
        .watchAcksFull(query, 2000, docB)
        .client(1)
        .expectEvents(query, { added: [docB] });
    }
  );

  specTest(
    'Previous primary immediately regains primary lease',
    ['multi-client'],
    () => {
      const query = Query.atPath(path('collection'));
      const docA = doc('collection/a', 2000, { key: 'a' });

      return (
        client(0)
          .userListens(query)
          .watchAcksFull(query, 1000)
          .expectEvents(query, {})
          .client(1)
          .stealPrimaryLease()
          .expectListen(query, 'resume-token-1000')
          .watchAcksFull(query, 2000, docA)
          .shutdown()
          .client(0)
          .expectPrimaryState(true)
          // The primary tab only discovers that it has lost its lease when it
          // is already eligible to obtain it again.
          .runTimer(TimerId.ClientMetadataRefresh)
          .expectPrimaryState(true)
          .expectListen(query, 'resume-token-2000')
          .expectEvents(query, { added: [docA] })
      );
    }
  );
});
