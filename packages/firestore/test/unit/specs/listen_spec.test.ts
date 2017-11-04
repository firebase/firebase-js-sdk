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
import { Code } from '../../../src/util/error';
import { doc, filter, path } from '../../util/helpers';

import { describeSpec, specTest } from './describe_spec';
import { spec } from './spec_builder';
import { RpcError } from './spec_rpc_error';

describeSpec('Listens:', [], () => {
  // Obviously this test won't hold with offline persistence enabled.
  specTest('Contents of query are cleared when listen is removed.', [], () => {
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
  });

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
        .watchAcksFull(visibleQuery, 5000, docAv2)
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

  specTest('Listens are reestablished after network disconnect', [], () => {
    const query = Query.atPath(path('collection'));
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'b' });
    return spec()
      .userListens(query)
      .expectNumWatchStreamRequests(1)
      .watchAcksFull(query, 1000, docA)
      .expectEvents(query, { added: [docA] })
      .disableNetwork()
      .enableNetwork()
      .restoreListen(query, 'resume-token-1000')
      .expectNumWatchStreamRequests(2)
      .watchAcksFull(query, 2000, docB)
      .expectEvents(query, { added: [docB] });
  });
});
