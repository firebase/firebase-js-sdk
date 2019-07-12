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
import { deletedDoc, doc, filter, path } from '../../util/helpers';

import { describeSpec, specTest } from './describe_spec';
import { client, spec } from './spec_builder';

describeSpec('Limits:', [], () => {
  specTest('Documents in limit are replaced by remote event', [], () => {
    const query1 = Query.atPath(path('collection')).withLimit(2);
    const doc1 = doc('collection/a', 1000, { key: 'a' });
    const doc2 = doc('collection/b', 1002, { key: 'b' });
    const doc3 = doc('collection/c', 1001, { key: 'c' });
    return spec()
      .userListens(query1)
      .watchAcksFull(query1, 1001, doc1, doc3)
      .expectEvents(query1, {
        added: [doc1, doc3]
      })
      .watchSends({ affects: [query1] }, doc2)
      .watchSends({ removed: [query1] }, doc3)
      .watchSnapshots(1002)
      .expectEvents(query1, {
        added: [doc2],
        removed: [doc3]
      });
  });

  specTest(
    "Documents outside of limit don't raise hasPendingWrites",
    [],
    () => {
      const query1 = Query.atPath(path('collection')).withLimit(2);
      const doc1 = doc('collection/a', 1000, { key: 'a' });
      const doc2 = doc('collection/b', 1000, { key: 'b' });

      return spec()
        .withGCEnabled(false)
        .userListens(query1)
        .watchAcksFull(query1, 1000, doc1, doc2)
        .expectEvents(query1, {
          added: [doc1, doc2]
        })
        .userUnlistens(query1)
        .userSets('collection/c', { key: 'c' })
        .userListens(query1, 'resume-token-1000')
        .expectEvents(query1, {
          added: [doc1, doc2],
          fromCache: true
        });
    }
  );

  specTest('Deleted Document in limbo in full limit query', [], () => {
    const query = Query.atPath(path('collection')).withLimit(2);
    const doc1 = doc('collection/a', 1000, { key: 'a' });
    const doc2 = doc('collection/b', 1001, { key: 'b' });
    const doc3 = doc('collection/c', 1002, { key: 'c' });
    return (
      spec()
        .userListens(query)
        .watchAcksFull(query, 1002, doc1, doc2)
        .expectEvents(query, {
          added: [doc1, doc2]
        })
        .watchResets(query)
        .watchSends({ affects: [query] }, doc2, doc3)
        .watchCurrents(query, 'resume-token-' + 2000)
        .watchSnapshots(2000)
        .expectLimboDocs(doc1.key)
        // Limbo document causes query to be "inconsistent"
        .expectEvents(query, { fromCache: true })
        .ackLimbo(2000, deletedDoc('collection/a', 2000))
        .expectLimboDocs()
        .expectEvents(query, {
          added: [doc3],
          removed: [doc1]
        })
    );
  });

  specTest('Documents in limit can handle removed messages', [], () => {
    const query1 = Query.atPath(path('collection')).withLimit(2);
    const doc1 = doc('collection/a', 1000, { key: 'a' });
    const doc2 = doc('collection/b', 1002, { key: 'b' });
    const doc3 = doc('collection/c', 1001, { key: 'c' });
    return (
      spec()
        .userListens(query1)
        .watchAcksFull(query1, 1001, doc1, doc3)
        .expectEvents(query1, {
          added: [doc1, doc3]
        })
        .watchSends({ affects: [query1] }, doc2)
        .watchRemovesDoc(doc3.key, query1)
        .watchSnapshots(1002)
        // No limbo docs expected because doc3 was removed
        .expectLimboDocs()
        .expectEvents(query1, {
          added: [doc2],
          removed: [doc3]
        })
    );
  });

  specTest(
    'Documents in limit are can handle removed messages for only one of many query',
    [],
    () => {
      const query1 = Query.atPath(path('collection')).withLimit(2);
      const query2 = Query.atPath(path('collection')).withLimit(3);
      const doc1 = doc('collection/a', 1000, { key: 'a' });
      const doc2 = doc('collection/b', 1002, { key: 'b' });
      const doc3 = doc('collection/c', 1001, { key: 'c' });
      return (
        spec()
          .userListens(query1)
          .userListens(query2)
          .watchAcks(query1)
          .watchAcks(query2)
          .watchSends({ affects: [query1] }, doc1, doc3)
          .watchSends({ affects: [query2] }, doc1, doc3)
          .watchCurrents(query1, 'resume-token-1001')
          .watchCurrents(query2, 'resume-token-1001')
          .watchSnapshots(1001)
          .expectEvents(query1, { added: [doc1, doc3] })
          .expectEvents(query2, { added: [doc1, doc3] })
          .watchSends({ affects: [query1, query2] }, doc2)
          .watchRemovesDoc(doc3.key, query1)
          .watchSnapshots(1002)
          // No limbo docs expected because doc3 was removed from query1
          .expectLimboDocs()
          .expectEvents(query1, {
            added: [doc2],
            removed: [doc3]
          })
          .expectEvents(query2, { added: [doc2] })
      );
    }
  );

  specTest('Limits are re-filled from cache', [], () => {
    // This test verifies that our Query handling backfills a limit query from
    // cache even if the backend has not told us that an existing
    // RemoteDocument is within the limit.
    const fullQuery = Query.atPath(path('collection')).addFilter(
      filter('matches', '==', true)
    );
    const limitQuery = Query.atPath(path('collection'))
      .addFilter(filter('matches', '==', true))
      .withLimit(2);
    const doc1 = doc('collection/a', 1001, {  matches: true });
    const doc2 = doc('collection/b', 1002, {  matches: true });
    const doc3 = doc('collection/c', 1000, {  matches: true });
    return spec()
      .withGCEnabled(false)
      .userListens(fullQuery)
      .watchAcksFull(fullQuery, 1002, doc1, doc2, doc3)
      .expectEvents(fullQuery, { added: [doc1, doc2, doc3] })
      .userUnlistens(fullQuery)
      .userListens(limitQuery)
      .expectEvents(limitQuery, { added: [doc1, doc2], fromCache: true })
      .userSets('collection/a', {  matches: false })
      .expectEvents(limitQuery, {
        added: [doc3],
        removed: [doc1],
        fromCache: true
      });
  });

  specTest('Multiple docs in limbo in full limit query', [], () => {
    const query1 = Query.atPath(path('collection')).withLimit(2);
    const query2 = Query.atPath(path('collection'));
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 1001, { key: 'b' });
    const docC = doc('collection/c', 1002, { key: 'c' });
    const docD = doc('collection/d', 1003, { key: 'd' });
    const docE = doc('collection/e', 1004, { key: 'e' });
    const docF = doc('collection/f', 1005, { key: 'f' });
    return (
      spec()
        .userListens(query1)
        .watchAcksFull(query1, 1001, docA, docB)
        .expectEvents(query1, {
          added: [docA, docB]
        })
        .userListens(query2)
        .expectEvents(query2, {
          fromCache: true,
          added: [docA, docB]
        })
        .watchAcksFull(query2, 1005, docA, docB, docC, docD, docE, docF)
        .expectEvents(query2, {
          added: [docC, docD, docE, docF]
        })
        .watchResets(query1)
        .watchSends({ affects: [query1] }, docE, docF)
        /**
         * Technically, this sequence can't happen in reality, because the
         * backend can't ack version 2000 without updating the state for C and
         * D, since they are results for query2. query2 is just a hack to make
         * sure that C and D are in the local cache.
         */
        .watchCurrents(query1, 'resume-token-' + 2000)
        .watchSnapshots(2000)
        .expectLimboDocs(docA.key, docB.key)
        // Limbo document causes query to be "inconsistent"
        .expectEvents(query1, { fromCache: true })
        /**
         * The current implementation resolves limbo documents one at a time.
         * However, if we decide to change this in the future to resolve them
         * all at once, it's okay to change this test to match that.
         */
        .ackLimbo(2000, deletedDoc('collection/a', 2000))
        .expectLimboDocs(docB.key, docC.key)
        .expectEvents(query2, {
          removed: [docA]
        })
        .expectEvents(query1, {
          fromCache: true,
          added: [docC],
          removed: [docA]
        })
        .watchRemovesLimboTarget(docA)
        .ackLimbo(2001, deletedDoc('collection/b', 2001))
        .expectLimboDocs(docC.key, docD.key)
        .expectEvents(query2, {
          removed: [docB]
        })
        .expectEvents(query1, {
          fromCache: true,
          added: [docD],
          removed: [docB]
        })
        .watchRemovesLimboTarget(docB)
        .ackLimbo(2002, deletedDoc('collection/c', 2002))
        .expectLimboDocs(docD.key)
        .expectEvents(query2, {
          removed: [docC]
        })
        .expectEvents(query1, {
          fromCache: true,
          added: [docE],
          removed: [docC]
        })
        .watchRemovesLimboTarget(docC)
        .ackLimbo(2003, deletedDoc('collection/d', 2003))
        .expectLimboDocs()
        .expectEvents(query2, {
          removed: [docD]
        })
        .expectEvents(query1, {
          added: [docF],
          removed: [docD]
        })
        .watchRemovesLimboTarget(docD)
    );
  });

  specTest(
    'Limit query is refilled by primary client',
    ['multi-client'],
    () => {
      const query1 = Query.atPath(path('collection')).withLimit(2);
      const doc1 = doc('collection/a', 1000, { key: 'a' });
      const doc2 = doc('collection/b', 1002, { key: 'b' });
      const doc3 = doc('collection/c', 1001, { key: 'c' });
      return client(0)
        .becomeVisible()
        .client(1)
        .userListens(query1)
        .client(0)
        .expectListen(query1)
        .watchAcksFull(query1, 1001, doc1, doc3)
        .client(1)
        .expectEvents(query1, {
          added: [doc1, doc3]
        })
        .client(0)
        .watchSends({ affects: [query1] }, doc2)
        .watchSends({ removed: [query1] }, doc3)
        .watchSnapshots(1002)
        .client(1)
        .expectEvents(query1, {
          added: [doc2],
          removed: [doc3]
        });
    }
  );

  specTest(
    'Limit query includes write from secondary client ',
    ['multi-client'],
    () => {
      const query1 = Query.atPath(path('collection')).withLimit(2);
      const doc1 = doc('collection/a', 1003, { key: 'a' });
      const doc1Local = doc(
        'collection/a',
        0,
        { key: 'a' },
        { hasLocalMutations: true }
      );
      const doc2 = doc('collection/b', 1001, { key: 'b' });
      const doc3 = doc('collection/c', 1002, { key: 'c' });
      return client(0)
        .becomeVisible()
        .client(1)
        .userListens(query1)
        .client(0)
        .expectListen(query1)
        .watchAcksFull(query1, 1002, doc2, doc3)
        .client(1)
        .expectEvents(query1, {
          added: [doc2, doc3]
        })
        .client(2)
        .userSets('collection/a', { key: 'a' })
        .client(1)
        .expectEvents(query1, {
          hasPendingWrites: true,
          added: [doc1Local],
          removed: [doc3]
        })
        .client(0)
        .writeAcks('collection/a', 1003, { expectUserCallback: false })
        .watchSends({ affects: [query1] }, doc1)
        .watchSends({ removed: [query1] }, doc3)
        .watchSnapshots(1003)
        .client(1)
        .expectEvents(query1, {
          metadata: [doc1]
        })
        .client(2)
        .expectUserCallbacks({
          acknowledged: ['collection/a']
        });
    }
  );
});
