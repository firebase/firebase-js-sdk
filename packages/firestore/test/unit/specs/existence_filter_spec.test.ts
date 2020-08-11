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

import { newQueryForPath } from '../../../src/core/query';
import { Code } from '../../../src/util/error';
import { deletedDoc, doc, query } from '../../util/helpers';

import { describeSpec, specTest } from './describe_spec';
import { spec } from './spec_builder';
import { RpcError } from './spec_rpc_error';

describeSpec('Existence Filters:', [], () => {
  specTest('Existence filter match', [], () => {
    const query1 = query('collection');
    const doc1 = doc('collection/1', 1000, { v: 1 });
    return spec()
      .userListens(query1)
      .watchAcksFull(query1, 1000, doc1)
      .expectEvents(query1, { added: [doc1] })
      .watchFilters([query1], doc1.key)
      .watchSnapshots(2000);
  });

  specTest('Existence filter match after pending update', [], () => {
    const query1 = query('collection');
    const doc1 = doc('collection/1', 2000, { v: 2 });
    return spec()
      .userListens(query1)
      .watchAcks(query1)
      .watchCurrents(query1, 'resume-token-1000')
      .watchSnapshots(2000)
      .expectEvents(query1, {})
      .watchSends({ affects: [query1] }, doc1)
      .watchFilters([query1], doc1.key)
      .watchSnapshots(2000)
      .expectEvents(query1, { added: [doc1] });
  });

  specTest('Existence filter with empty target', [], () => {
    const query1 = query('collection');
    const doc1 = doc('collection/1', 2000, { v: 2 });
    return spec()
      .userListens(query1)
      .watchAcks(query1)
      .watchCurrents(query1, 'resume-token-1000')
      .watchSnapshots(2000)
      .expectEvents(query1, {})
      .watchFilters([query1], doc1.key)
      .watchSnapshots(2000)
      .expectEvents(query1, { fromCache: true });
  });

  specTest('Existence filter ignored with pending target', [], () => {
    const query1 = query('collection');
    const doc1 = doc('collection/1', 2000, { v: 2 });
    return (
      spec()
        .withGCEnabled(false)
        .userListens(query1)
        .watchAcksFull(query1, 1000, doc1)
        .expectEvents(query1, { added: [doc1] })
        .userUnlistens(query1)
        .userListens(query1, 'resume-token-1000')
        .expectEvents(query1, { added: [doc1], fromCache: true })
        // The empty existence filter is ignored since Watch hasn't ACKed the
        // target
        .watchFilters([query1])
        .watchRemoves(query1)
        .watchAcks(query1)
        .watchCurrents(query1, 'resume-token-2000')
        .watchSnapshots(2000)
        .expectEvents(query1, {})
    );
  });

  specTest('Existence filter mismatch triggers re-run of query', [], () => {
    const query1 = query('collection');
    const doc1 = doc('collection/1', 1000, { v: 1 });
    const doc2 = doc('collection/2', 1000, { v: 2 });
    return (
      spec()
        .userListens(query1)
        .watchAcksFull(query1, 1000, doc1, doc2)
        .expectEvents(query1, { added: [doc1, doc2] })
        .watchFilters([query1], doc1.key) // in the next sync doc2 was deleted
        .watchSnapshots(2000)
        // query is now marked as "inconsistent" because of filter mismatch
        .expectEvents(query1, { fromCache: true })
        .expectActiveTargets({ query: query1, resumeToken: '' })
        .watchRemoves(query1) // Acks removal of query
        .watchAcksFull(query1, 2000, doc1)
        .expectLimboDocs(doc2.key) // doc2 is now in limbo
        .ackLimbo(2000, deletedDoc('collection/2', 2000))
        .expectLimboDocs() // doc2 is no longer in limbo
        .expectEvents(query1, {
          removed: [doc2]
        })
    );
  });

  specTest('Existence filter mismatch will drop resume token', [], () => {
    const query1 = query('collection');
    const doc1 = doc('collection/1', 1000, { v: 1 });
    const doc2 = doc('collection/2', 1000, { v: 2 });
    return (
      spec()
        .userListens(query1)
        .watchAcks(query1)
        .watchSends({ affects: [query1] }, doc1, doc2)
        .watchCurrents(query1, 'existence-filter-resume-token')
        .watchSnapshots(1000)
        .expectEvents(query1, { added: [doc1, doc2] })
        .watchStreamCloses(Code.UNAVAILABLE)
        .expectActiveTargets({
          query: query1,
          resumeToken: 'existence-filter-resume-token'
        })
        .watchAcks(query1)
        .watchFilters([query1], doc1.key) // in the next sync doc2 was deleted
        .watchSnapshots(2000)
        // query is now marked as "inconsistent" because of filter mismatch
        .expectEvents(query1, { fromCache: true })
        .expectActiveTargets({ query: query1, resumeToken: '' })
        .watchRemoves(query1) // Acks removal of query
        .watchAcksFull(query1, 2000, doc1)
        .expectLimboDocs(doc2.key) // doc2 is now in limbo
        .ackLimbo(2000, deletedDoc('collection/2', 2000))
        .expectLimboDocs() // doc2 is no longer in limbo
        .expectEvents(query1, {
          removed: [doc2]
        })
    );
  });

  specTest('Existence filter handled at global snapshot', [], () => {
    const query1 = query('collection');
    const doc1 = doc('collection/1', 1000, { v: 1 });
    const doc2 = doc('collection/2', 2000, { v: 2 });
    const doc3 = doc('collection/3', 3000, { v: 3 });
    return (
      spec()
        .userListens(query1)
        .watchAcksFull(query1, 1000, doc1)
        .expectEvents(query1, { added: [doc1] })
        // Send a mismatching existence filter with two documents, but don't
        // send a new global snapshot. We should not see an event until we
        // receive the snapshot.
        .watchFilters([query1], doc1.key, doc2.key)
        .watchSends({ affects: [query1] }, doc3)
        .watchSnapshots(2000)
        // The query result includes doc3, but is marked as "inconsistent"
        // due to the filter mismatch
        .expectEvents(query1, { added: [doc3], fromCache: true })
        .expectActiveTargets({ query: query1, resumeToken: '' })
        .watchRemoves(query1) // Acks removal of query
        .watchAcksFull(query1, 3000, doc1, doc2, doc3)
        .expectEvents(query1, { added: [doc2] })
    );
  });

  specTest('Existence filter synthesizes deletes', [], () => {
    const query1 = query('collection/a');
    const docA = doc('collection/a', 1000, { v: 1 });
    return spec()
      .userListens(query1)
      .watchAcksFull(query1, 1000, docA)
      .expectEvents(query1, { added: [docA] })
      .watchFilters([query1])
      .watchSnapshots(2000)
      .expectEvents(query1, { removed: [docA] });
  });

  specTest('Existence filter limbo resolution is denied', [], () => {
    const query1 = query('collection');
    const doc1 = doc('collection/1', 1000, { v: 1 });
    const doc2 = doc('collection/2', 1000, { v: 2 });
    return (
      spec()
        .userListens(query1)
        .watchAcksFull(query1, 1000, doc1, doc2)
        .expectEvents(query1, { added: [doc1, doc2] })
        .watchFilters([query1], doc1.key) // in the next sync doc2 was deleted
        .watchSnapshots(2000)
        // query is now marked as "inconsistent" because of filter mismatch
        .expectEvents(query1, { fromCache: true })
        .expectActiveTargets({ query: query1, resumeToken: '' })
        .watchRemoves(query1) // Acks removal of query
        .watchAcksFull(query1, 2000, doc1)
        .expectLimboDocs(doc2.key) // doc2 is now in limbo
        .watchRemoves(
          newQueryForPath(doc2.key.path),
          new RpcError(Code.PERMISSION_DENIED, 'no')
        )
        .expectLimboDocs() // doc2 is no longer in limbo
        .expectEvents(query1, {
          removed: [doc2]
        })
    );
  });
});
