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
import { Query } from '../../../../src/firestore/core/query';
import { Code } from '../../../../src/firestore/util/error';
import { deletedDoc, doc, path } from '../../util/helpers';

import { describeSpec, specTest } from './describe_spec';
import { spec } from './spec_builder';
import { RpcError } from './spec_rpc_error';

describeSpec('Existence Filters:', [], () => {
  specTest('Existence filter mismatch triggers re-run of query', [], () => {
    const query = Query.atPath(path('collection'));
    const doc1 = doc('collection/1', 1000, { v: 1 });
    const doc2 = doc('collection/2', 1000, { v: 2 });
    return (
      spec()
        .userListens(query)
        .watchAcksFull(query, 1000, doc1, doc2)
        .expectEvents(query, { added: [doc1, doc2] })
        .watchFilters([query], doc1.key) // in the next sync doc2 was deleted
        .watchSnapshots(2000)
        // query is now marked as "inconsistent" because of filter mismatch
        .expectEvents(query, { fromCache: true })
        .expectActiveTargets({ query, resumeToken: '' })
        .watchRemoves(query) // Acks removal of query
        .watchAcksFull(query, 2000, doc1)
        .expectLimboDocs(doc2.key) // doc2 is now in limbo
        .ackLimbo(2000, deletedDoc('collection/2', 2000))
        .expectLimboDocs() // doc2 is no longer in limbo
        .expectEvents(query, {
          removed: [doc2]
        })
    );
  });

  specTest('Existence filter mismatch will drop resume token', [], () => {
    const query = Query.atPath(path('collection'));
    const doc1 = doc('collection/1', 1000, { v: 1 });
    const doc2 = doc('collection/2', 1000, { v: 2 });
    return (
      spec()
        .userListens(query)
        .watchAcks(query)
        .watchSends({ affects: [query] }, doc1, doc2)
        .watchCurrents(query, 'existence-filter-resume-token')
        .watchSnapshots(1000)
        .expectEvents(query, { added: [doc1, doc2] })
        .watchStreamCloses(Code.UNAVAILABLE)
        .expectActiveTargets({
          query,
          resumeToken: 'existence-filter-resume-token'
        })
        .watchAcks(query)
        .watchFilters([query], doc1.key) // in the next sync doc2 was deleted
        .watchSnapshots(2000)
        // query is now marked as "inconsistent" because of filter mismatch
        .expectEvents(query, { fromCache: true })
        .expectActiveTargets({ query, resumeToken: '' })
        .watchRemoves(query) // Acks removal of query
        .watchAcksFull(query, 2000, doc1)
        .expectLimboDocs(doc2.key) // doc2 is now in limbo
        .ackLimbo(2000, deletedDoc('collection/2', 2000))
        .expectLimboDocs() // doc2 is no longer in limbo
        .expectEvents(query, {
          removed: [doc2]
        })
    );
  });

  specTest('Existence filter limbo resolution is denied', [], () => {
    const query = Query.atPath(path('collection'));
    const doc1 = doc('collection/1', 1000, { v: 1 });
    const doc2 = doc('collection/2', 1000, { v: 2 });
    return (
      spec()
        .userListens(query)
        .watchAcksFull(query, 1000, doc1, doc2)
        .expectEvents(query, { added: [doc1, doc2] })
        .watchFilters([query], doc1.key) // in the next sync doc2 was deleted
        .watchSnapshots(2000)
        // query is now marked as "inconsistent" because of filter mismatch
        .expectEvents(query, { fromCache: true })
        .expectActiveTargets({ query, resumeToken: '' })
        .watchRemoves(query) // Acks removal of query
        .watchAcksFull(query, 2000, doc1)
        .expectLimboDocs(doc2.key) // doc2 is now in limbo
        .watchRemoves(
          Query.atPath(doc2.key.path),
          new RpcError(Code.PERMISSION_DENIED, 'no')
        )
        .watchSnapshots(3000)
        .expectLimboDocs() // doc2 is no longer in limbo
        .expectEvents(query, {
          removed: [doc2]
        })
    );
  });
});
