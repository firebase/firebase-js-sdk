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
import { RpcError } from './spec_rpc_error';

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

  // This flow was identified as a root cause of "pendingResponses is less than 0" (ca9 assertion)
  specTest(
    'Handles removal of old target (with cause) after re-listen',
    [],
    () => {
      const query1 = query('collection');
      return (
        spec()
          .ensureManualLruGC()
          .allowUnlistedTargetRemoval()
          .userListens(query1)
          .watchAcks(query1)
          .userUnlistens(query1)
          .userListens(query1)
          // Use numerical code 8 for RESOURCE_EXHAUSTED
          .watchRemoves(query1, new RpcError(8, 'Resource exhausted'))
          .watchAcks(query1)
          .expectActiveTargets({ query: query1, resumeToken: '' })
      );
    }
  );

  specTest('Handles removal of old target after re-listen', [], () => {
    const query1 = query('collection');
    return spec()
      .ensureManualLruGC()
      .userListens(query1)
      .watchAcks(query1)
      .userUnlistens(query1)
      .userListens(query1)
      .watchRemoves(query1)
      .watchAcks(query1)
      .expectActiveTargets({ query: query1, resumeToken: '' });
  });

  specTest(
    'Handles removal of target with cause after unlisten and ignores future messages',
    [],
    () => {
      const query1 = query('collection');
      const doc1 = doc('collection/a', 1000, { key: 'a' });
      return spec()
        .ensureManualLruGC()
        .allowUnlistedTargetRemoval()
        .userListens(query1)
        .watchAcks(query1)
        .userUnlistens(query1)
        .watchRemoves(query1, new RpcError(8, 'Resource exhausted'))
        .watchSends({ affects: [query1] }, doc1)
        .expectActiveTargets();
    }
  );
});
