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
import {
  deletedDoc,
  doc,
  filter,
  generateBloomFilterProto,
  query
} from '../../util/helpers';

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
      .watchFilters([query1], [doc1.key])
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
      .watchFilters([query1], [doc1.key])
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
      .watchFilters([query1], [doc1.key])
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
        .userListens(query1, { resumeToken: 'resume-token-1000' })
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
        .watchFilters([query1], [doc1.key]) // in the next sync doc2 was deleted
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
        .watchFilters([query1], [doc1.key]) // in the next sync doc2 was deleted
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
        .watchFilters([query1], [doc1.key, doc2.key])
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
        .watchFilters([query1], [doc1.key]) // in the next sync doc2 was deleted
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

  specTest(
    'Existence filter clears resume token',
    ['durable-persistence'],
    () => {
      // This is a test for https://github.com/firebase/firebase-android-sdk/issues/3249
      // In this particular scenario, the user received an existence filter
      // mismatch, but the SDK only cleared the target-to-document mapping and
      // not the lastLimboFreeSnapshot version. This caused the SDK to resume
      // the query but not include old documents.
      const query1 = query('collection');
      const doc1 = doc('collection/1', 1000, { v: 1 });
      const doc2 = doc('collection/2', 1000, { v: 2 });
      return (
        spec()
          .userListens(query1)
          .watchAcksFull(query1, 1000, doc1, doc2)
          .expectEvents(query1, { added: [doc1, doc2] })
          .watchFilters([query1], [doc1.key]) // doc2 was deleted
          .watchSnapshots(2000)
          .expectEvents(query1, { fromCache: true })
          // The SDK is unable to re-run the query, and does not remove doc2
          .restart()
          .userListens(query1)
          // We check that the data is still consistent with the local cache
          .expectEvents(query1, { added: [doc1, doc2], fromCache: true })
      );
    }
  );

  /**
   * Test existence filter with bloom filter.
   */
  specTest(
    'Full requery is skipped when bloom filter can identify documents deleted',
    [],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { v: 1 });
      const docB = doc('collection/b', 1000, { v: 2 });
      const bloomFilterProto = generateBloomFilterProto({
        contains: ['collection/a'],
        notContains: ['collection/b'],
        numOfBits: 2,
        hashCount: 1
      });
      return (
        spec()
          .userListens(query1)
          .watchAcksFull(query1, 1000, docA, docB)
          .expectEvents(query1, { added: [docA, docB] })
          // DocB is deleted in the next sync.
          .watchFilters([query1], [docA.key], bloomFilterProto)
          .watchSnapshots(2000)
          // BloomFilter identify docB is deleted, skip full query and put docB
          // into limbo directly.
          .expectEvents(query1, { fromCache: true })
          .expectLimboDocs(docB.key) // docB is now in limbo.
          .ackLimbo(2000, deletedDoc('collection/b', 2000))
          .expectLimboDocs() // docB is no longer in limbo
          .expectEvents(query1, {
            removed: [docB]
          })
      );
    }
  );

  specTest(
    'Full requery is triggered when bloom filter can not identify documents deleted',
    [],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { v: 1 });
      const docB = doc('collection/b', 1000, { v: 2 });
      const docC = doc('collection/c', 1000, { v: 2 });
      const bloomFilterProto = generateBloomFilterProto({
        contains: ['collection/a', 'collection/b'],
        notContains: ['collection/c'],
        numOfBits: 3,
        hashCount: 1
      });
      return (
        spec()
          .userListens(query1)
          .watchAcksFull(query1, 1000, docA, docB, docC)
          .expectEvents(query1, { added: [docA, docB, docC] })
          // DocB and DocC are deleted in the next sync.
          .watchFilters([query1], [docA.key], bloomFilterProto)
          .watchSnapshots(2000)
          // BloomFilter correctly identifies docC is deleted, but yields false
          // positive results for docB. Re-run query is triggered.
          .expectEvents(query1, { fromCache: true })
          .expectActiveTargets({ query: query1, resumeToken: '' })
          .watchRemoves(query1) // Acks removal of query.
          .watchAcksFull(query1, 2000, docA)
          .expectLimboDocs(docB.key, docC.key) // docB and docC are now in limbo.
          .ackLimbo(2001, deletedDoc('collection/b', 2001))
          .expectEvents(query1, {
            removed: [docB],
            fromCache: true
          })
          .expectLimboDocs(docC.key)
          .ackLimbo(2002, deletedDoc('collection/c', 2002))
          .expectEvents(query1, {
            removed: [docC]
          })
          .expectLimboDocs()
      );
    }
  );

  specTest(
    'Bloom filter can process special characters in document name',
    [],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/ÀÒ∑', 1000, { v: 1 });
      const docB = doc('collection/À∑Ò', 1000, { v: 1 });
      const bloomFilterProto = generateBloomFilterProto({
        contains: ['collection/ÀÒ∑'],
        notContains: ['collection/À∑Ò'],
        numOfBits: 2,
        hashCount: 1
      });
      return (
        spec()
          .userListens(query1)
          .watchAcksFull(query1, 1000, docA, docB)
          .expectEvents(query1, { added: [docA, docB] })
          // DocB is deleted in the next sync.
          .watchFilters([query1], [docA.key], bloomFilterProto)
          .watchSnapshots(2000)
          // BloomFilter identify docB is deleted, skip full query and put docB
          // into limbo directly.
          .expectEvents(query1, { fromCache: true })
          .expectLimboDocs(docB.key) // docB is now in limbo.
      );
    }
  );

  specTest(
    'Full requery is triggered when bloom filter bitmap is invalid',
    [],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { v: 1 });
      const docB = doc('collection/b', 1000, { v: 1 });

      return (
        spec()
          .userListens(query1)
          .watchAcksFull(query1, 1000, docA, docB)
          .expectEvents(query1, { added: [docA, docB] })
          // DocB is deleted in the next sync.
          .watchFilters([query1], [docA.key], {
            // Invalid 64base string in bitmap.
            bits: { bitmap: '*#!', padding: 1 },
            hashCount: 1
          })
          .watchSnapshots(2000)
          // Re-run query is triggered.
          .expectEvents(query1, { fromCache: true })
          .expectActiveTargets({ query: query1, resumeToken: '' })
      );
    }
  );

  specTest(
    'Full requery is triggered when bloom filter input is invalid',
    [],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { v: 1 });
      const docB = doc('collection/b', 1000, { v: 1 });
      return (
        spec()
          .userListens(query1)
          .watchAcksFull(query1, 1000, docA, docB)
          .expectEvents(query1, { added: [docA, docB] })
          // DocB is deleted in the next sync.
          .watchFilters([query1], [docA.key], {
            // Invalid hashCount in bloom filter.
            bits: { bitmap: 'AQ==', padding: 1 },
            hashCount: -1
          })
          .watchSnapshots(2000)
          // Re-run query is triggered.
          .expectEvents(query1, { fromCache: true })
          .expectActiveTargets({ query: query1, resumeToken: '' })
      );
    }
  );

  specTest('Full requery is triggered when bloom filter is empty', [], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { v: 1 });
    const docB = doc('collection/b', 1000, { v: 1 });
    return (
      spec()
        .userListens(query1)
        .watchAcksFull(query1, 1000, docA, docB)
        .expectEvents(query1, { added: [docA, docB] })
        // DocB is deleted in the next sync.
        .watchFilters([query1], [docA.key], {
          bits: { bitmap: '', padding: 0 },
          hashCount: 0
        })
        .watchSnapshots(2000)
        // Re-run query is triggered.
        .expectEvents(query1, { fromCache: true })
        .expectActiveTargets({ query: query1, resumeToken: '' })
    );
  });

  specTest('Same docs can have different bloom filters', [], () => {
    const query1 = query('collection', filter('v', '<=', 2));
    const query2 = query('collection', filter('v', '>=', 2));

    const docA = doc('collection/a', 1000, { v: 1 });
    const docB = doc('collection/b', 1000, { v: 2 });
    const docC = doc('collection/c', 1000, { v: 3 });

    const bloomFilterProto1 = generateBloomFilterProto({
      contains: ['collection/b'],
      notContains: ['collection/a', 'collection/c'],
      numOfBits: 5,
      hashCount: 1
    });
    const bloomFilterProto2 = generateBloomFilterProto({
      contains: ['collection/b'],
      notContains: ['collection/a', 'collection/c'],
      numOfBits: 4,
      hashCount: 1
    });
    return (
      spec()
        .userListens(query1)
        .watchAcksFull(query1, 1000, docA, docB)
        .expectEvents(query1, { added: [docA, docB] })
        .userListens(query2)
        .expectEvents(query2, { added: [docB], fromCache: true })
        .watchAcksFull(query2, 1001, docB, docC)
        .expectEvents(query2, { added: [docC] })

        // DocA is deleted in the next sync for query1.
        .watchFilters([query1], [docB.key], bloomFilterProto1)
        .watchSnapshots(2000)
        // BloomFilter identify docA is deleted, skip full query.
        .expectEvents(query1, { fromCache: true })
        .expectLimboDocs(docA.key) // docA is now in limbo.

        // DocC is deleted in the next sync for query2.
        .watchFilters([query2], [docB.key], bloomFilterProto2)
        .watchSnapshots(3000)
        // BloomFilter identify docC is deleted, skip full query.
        .expectEvents(query2, { fromCache: true })
        .expectLimboDocs(docA.key, docC.key) // docC is now in limbo.
    );
  });

  specTest('Bloom filter handled at global snapshot', [], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { v: 1 });
    const docB = doc('collection/b', 2000, { v: 2 });
    const docC = doc('collection/c', 3000, { v: 3 });

    const bloomFilterProto = generateBloomFilterProto({
      contains: ['collection/a'],
      notContains: ['collection/b'],
      numOfBits: 2,
      hashCount: 1
    });

    return (
      spec()
        .userListens(query1)
        .watchAcksFull(query1, 1000, docA, docB)
        .expectEvents(query1, { added: [docA, docB] })
        // Send a mismatching existence filter with one document, but don't
        // send a new global snapshot. We should not see an event until we
        // receive the snapshot.
        .watchFilters([query1], [docA.key], bloomFilterProto)
        .watchSends({ affects: [query1] }, docC)
        .watchSnapshots(2000)
        .expectEvents(query1, { added: [docC], fromCache: true })
        // re-run of the query1 is skipped, docB is in limbo.
        .expectLimboDocs(docB.key)
    );
  });

  specTest('Bloom filter limbo resolution is denied', [], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { v: 1 });
    const docB = doc('collection/b', 1000, { v: 1 });
    const bloomFilterProto = generateBloomFilterProto({
      contains: ['collection/a'],
      notContains: ['collection/b'],
      numOfBits: 2,
      hashCount: 1
    });
    return spec()
      .userListens(query1)
      .watchAcksFull(query1, 1000, docA, docB)
      .expectEvents(query1, { added: [docA, docB] })
      .watchFilters([query1], [docA.key], bloomFilterProto)
      .watchSnapshots(2000)
      .expectEvents(query1, { fromCache: true })
      .expectLimboDocs(docB.key) // docB is now in limbo.
      .watchRemoves(
        newQueryForPath(docB.key.path),
        new RpcError(Code.PERMISSION_DENIED, 'no')
      )
      .expectLimboDocs() // docB is no longer in limbo.
      .expectEvents(query1, {
        removed: [docB]
      });
  });

  specTest('Bloom filter with large size works as expected', [], () => {
    const query1 = query('collection');
    const docs = [];
    for (let i = 0; i < 100; i++) {
      docs.push(doc(`collection/doc${i}`, 1000, { v: 1 }));
    }
    const docKeys = docs.map(item => item.key);

    const bloomFilterProto = generateBloomFilterProto({
      contains: docKeys.slice(0, 50).map(item => item.toString()),
      notContains: docKeys.slice(50).map(item => item.toString()),
      numOfBits: 1000,
      hashCount: 16
    });
    return (
      spec()
        .userListens(query1)
        .watchAcksFull(query1, 1000, ...docs)
        .expectEvents(query1, { added: docs })
        // Doc0 to doc50 are deleted in the next sync.
        .watchFilters([query1], docKeys.slice(0, 50), bloomFilterProto)
        .watchSnapshots(2000)
        // BloomFilter correctly identifies docs that deleted, skip full query.
        .expectEvents(query1, { fromCache: true })
        .expectLimboDocs(...docKeys.slice(50))
    );
  });
});
