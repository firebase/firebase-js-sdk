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
import { doc, query } from '../../util/helpers';

import { describeSpec, specTest } from './describe_spec';
import { spec } from './spec_builder';

describeSpec('Remote store:', [], () => {
  specTest('Waits for watch to remove targets', [], () => {
    const query1 = query('collection');
    const doc1 = doc('collection/a', 1000, { key: 'a' });
    return spec()
      .ensureManualLruGC()
      .userListens(query1)
      .watchAcks(query1)
      .userUnlistens(query1) // Now we simulate a quick unlisten.
      .userListens(query1) // But add it back before watch acks it.
      .watchSends({ affects: [query1] }, doc1) // Should be ignored.
      .watchCurrents(query1, 'resume-token')
      .watchSnapshots(1000)
      .watchRemoves(query1) // Finally watch decides to ack the removal.
      .watchAcksFull(query1, 1001, doc1) // Now watch should ack the query.
      .expectEvents(query1, { added: [doc1] }); // This should work now.
  });

  specTest('Waits for watch to ack last target add', [], () => {
    const query1 = query('collection');
    const doc1 = doc('collection/a', 1000, { key: 'a' });
    const doc2 = doc('collection/b', 1000, { key: 'b' });
    const doc3 = doc('collection/c', 1000, { key: 'c' });
    const doc4 = doc('collection/d', 1000, { key: 'd' });
    return spec()
      .ensureManualLruGC()
      .userListens(query1)
      .watchAcks(query1)
      .userUnlistens(query1) // Now we simulate a quick unlisten.
      .userListens(query1) // But add it back before watch acks it.
      .userUnlistens(query1) // But do it a few more times...
      .userListens(query1)
      .userUnlistens(query1)
      .userListens(query1)
      .watchSends({ affects: [query1] }, doc1) // Should be ignored.
      .watchCurrents(query1, 'resume-token')
      .watchSnapshots(1000)
      .watchRemoves(query1) // Finally watch decides to ack the FIRST removal.
      .watchAcksFull(query1, 1001, doc2) // Now watch should ack the second listen.
      .watchRemoves(query1) // Finally watch decides to ack the SECOND removal.
      .watchAcksFull(query1, 1001, doc3) // Now watch should ack the second listen.
      .watchRemoves(query1) // Finally watch decides to ack the THIRD removal.
      .watchAcksFull(query1, 1001, doc4) // Now watch should ack the query.
      .expectEvents(query1, { added: [doc4] }); // This should work now.
  });

  specTest('Cleans up watch state correctly', [], () => {
    const query1 = query('collection');
    const doc1 = doc('collection/a', 1000, { key: 'a' });
    return (
      spec()
        .ensureManualLruGC()
        .userListens(query1)
        // Close before we get an ack, this should reset our pending
        // target counts.
        .watchStreamCloses(Code.UNAVAILABLE)
        .expectEvents(query1, { fromCache: true })

        .watchAcksFull(query1, 1001, doc1)
        .expectEvents(query1, { added: [doc1] })
    );
  });

  // TODO(b/72313632): This test is web-only because the Android / iOS spec
  // tests exclude backoff entirely.
  specTest(
    'Handles user changes while offline (b/74749605).',
    ['no-android', 'no-ios'],
    () => {
      const query1 = query('collection');
      return (
        spec()
          .userListens(query1)

          // close the stream (this should trigger retry with backoff; but don't
          // run it in an attempt to reproduce b/74749605).
          .watchStreamCloses(Code.UNAVAILABLE, { runBackoffTimer: false })
          .expectEvents(query1, { fromCache: true })

          // Because we didn't let the backoff timer run and restart the watch
          // stream, there will be no active targets.
          .expectActiveTargets()

          // Change user (will shut down existing streams and start new ones).
          .changeUser('abc')
          // Our query should be sent to the new stream.
          .expectActiveTargets({ query: query1, resumeToken: '' })

          // Close the (newly-created) stream as if it too failed (should trigger
          // retry with backoff, potentially reproducing the crash in b/74749605).
          .watchStreamCloses(Code.UNAVAILABLE)
      );
    }
  );

  // Regression tests for https://github.com/firebase/firebase-js-sdk/issues/9729
  //
  // These tests exercise the watch stream reconnection path with rapid
  // unlisten/listen cycles, validating that pending target request
  // bookkeeping remains correct across stream restarts.

  specTest(
    'Handles unlisten/listen after stream reconnect',
    [],
    () => {
      // Exercises the startWatchStream → onWatchStreamOpen code path after a
      // network drop, followed by a rapid unlisten/listen cycle (the pattern
      // caused by React StrictMode double-invoking effects).
      const query1 = query('collection');
      const doc1 = doc('collection/a', 1000, { key: 'a' });
      const doc1v2 = doc('collection/a', 2000, { key: 'a', updated: true });
      return (
        spec()
          .ensureManualLruGC()
          // Establish an active listen
          .userListens(query1)
          .watchAcksFull(query1, 1000, doc1)
          .expectEvents(query1, { added: [doc1] })

          // Network drops and comes back
          .disableNetwork()
          .expectEvents(query1, { fromCache: true })
          .enableNetwork()
          .restoreListen(query1, 'resume-token-1000')

          // After reconnect, simulate StrictMode: unlisten then re-listen.
          // The re-listen uses the cached resume token from the prior ack.
          .userUnlistens(query1)
          .userListens(query1, { resumeToken: 'resume-token-1000' })
          .expectEvents(query1, {
            added: [doc1],
            fromCache: true
          })

          // Server acks the restore, then the unlisten, then the new listen.
          // Each server response decrements pendingResponses by 1:
          // restore(3→2), remove(2→1), ackFull(1→0) → events raised.
          .watchAcks(query1)
          .watchRemoves(query1)
          .watchAcksFull(query1, 2000, doc1v2)
          .expectEvents(query1, { modified: [doc1v2] })
      );
    }
  );

  specTest(
    'Handles multiple unlisten/listen cycles after stream reconnect',
    [],
    () => {
      // Same as above but with multiple rapid cycles, similar to the
      // "Waits for watch to ack last target add" test but after a
      // stream reconnect which creates a new WatchChangeAggregator.
      const query1 = query('collection');
      const doc1 = doc('collection/a', 1000, { key: 'a' });
      const doc1v2 = doc('collection/a', 2000, { key: 'a', updated: true });
      return (
        spec()
          .ensureManualLruGC()
          .userListens(query1)
          .watchAcksFull(query1, 1000, doc1)
          .expectEvents(query1, { added: [doc1] })

          // Network drops and comes back
          .disableNetwork()
          .expectEvents(query1, { fromCache: true })
          .enableNetwork()
          .restoreListen(query1, 'resume-token-1000')

          // Multiple rapid unlisten/listen cycles (e.g. multiple StrictMode
          // components or rapid navigation)
          .userUnlistens(query1)
          .userListens(query1, { resumeToken: 'resume-token-1000' })
          .expectEvents(query1, {
            added: [doc1],
            fromCache: true
          })
          .userUnlistens(query1)
          .userListens(query1, { resumeToken: 'resume-token-1000' })
          .expectEvents(query1, {
            added: [doc1],
            fromCache: true
          })

          // Server processes all the acks in order:
          // 5 pending (restore + unlisten + re-listen + unlisten + re-listen)
          // Need 5 responses to reach pendingResponses = 0.
          .watchAcks(query1)
          .watchRemoves(query1)
          .watchAcks(query1)
          .watchRemoves(query1)
          .watchAcksFull(query1, 2000, doc1v2)
          .expectEvents(query1, { modified: [doc1v2] })
      );
    }
  );

  specTest(
    'Handles unlisten during stream startup before open',
    [],
    () => {
      // Exercises the code path where a target is removed from listenTargets
      // and a new one added during a network disruption. With the structural
      // fix, startWatchStream pre-records the pending request and
      // onWatchStreamOpen cleans up the orphaned target state.
      const query1 = query('collection');
      const query2 = query('other');
      const doc1 = doc('collection/a', 1000, { key: 'a' });
      const doc2 = doc('other/b', 1000, { key: 'b' });
      return (
        spec()
          .ensureManualLruGC()
          .userListens(query1)
          .watchAcksFull(query1, 1000, doc1)
          .expectEvents(query1, { added: [doc1] })

          // Network drops
          .disableNetwork()
          .expectEvents(query1, { fromCache: true })

          // While offline, remove the first query and add a second
          .userUnlistens(query1)
          .userListens(query2)
          .expectEvents(query2, { fromCache: true })

          // Bring network back
          .enableNetwork()

          // Now only query2 should be active
          .watchAcksFull(query2, 2000, doc2)
          .expectEvents(query2, { added: [doc2] })
      );
    }
  );

  specTest(
    'Handles listen/unlisten/listen with two targets after reconnect',
    [],
    () => {
      // Tests that the pending count bookkeeping is correct per-target when
      // one target has a rapid unlisten/listen cycle and another is stable.
      const query1 = query('collection');
      const query2 = query('other');
      const doc1 = doc('collection/a', 1000, { key: 'a' });
      const doc2 = doc('other/b', 1000, { key: 'b' });
      const doc1v2 = doc('collection/a', 2000, { key: 'a', updated: true });
      const doc2v2 = doc('other/b', 2000, { key: 'b', updated: true });
      return (
        spec()
          .ensureManualLruGC()
          // Establish two active listens
          .userListens(query1)
          .watchAcksFull(query1, 1000, doc1)
          .expectEvents(query1, { added: [doc1] })
          .userListens(query2)
          .watchAcksFull(query2, 1000, doc2)
          .expectEvents(query2, { added: [doc2] })

          // Network drops and comes back
          .disableNetwork()
          .expectEvents(query1, { fromCache: true })
          .expectEvents(query2, { fromCache: true })
          .enableNetwork()
          .restoreListen(query1, 'resume-token-1000')
          .restoreListen(query2, 'resume-token-1000')

          // After reconnect, query1 does unlisten/listen (StrictMode),
          // query2 stays stable
          .userUnlistens(query1)
          .userListens(query1, { resumeToken: 'resume-token-1000' })
          .expectEvents(query1, {
            added: [doc1],
            fromCache: true
          })

          // Server acks: query2 restore+data, query1 restore+remove+re-add.
          // query2 has 1 pending (restore) → ackFull consumes it.
          // query1 has 3 pending (restore + unlisten + re-listen).
          .watchAcksFull(query2, 2000, doc2v2)
          .expectEvents(query2, { modified: [doc2v2] })
          .watchAcks(query1)
          .watchRemoves(query1)
          .watchAcksFull(query1, 2000, doc1v2)
          .expectEvents(query1, { modified: [doc1v2] })
      );
    }
  );
});
