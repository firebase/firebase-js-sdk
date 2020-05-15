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

import { Query } from '../../../src/core/query';
import { deletedDoc, doc, filter, orderBy, path } from '../../util/helpers';

import { describeSpec, specTest } from './describe_spec';
import { client, spec } from './spec_builder';

describeSpec('Limits:', [], () => {
  specTest('Documents in limit are replaced by remote event', [], () => {
    const query1 = Query.atPath(path('collection')).withLimitToFirst(2);
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
      const query1 = Query.atPath(path('collection')).withLimitToFirst(2);
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
    const query = Query.atPath(path('collection')).withLimitToFirst(2);
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
    const query1 = Query.atPath(path('collection')).withLimitToFirst(2);
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
      const query1 = Query.atPath(path('collection')).withLimitToFirst(2);
      const query2 = Query.atPath(path('collection')).withLimitToFirst(3);
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
      .withLimitToFirst(2);
    const doc1 = doc('collection/a', 1001, { matches: true });
    const doc2 = doc('collection/b', 1002, { matches: true });
    const doc3 = doc('collection/c', 1000, { matches: true });
    return spec()
      .withGCEnabled(false)
      .userListens(fullQuery)
      .watchAcksFull(fullQuery, 1002, doc1, doc2, doc3)
      .expectEvents(fullQuery, { added: [doc1, doc2, doc3] })
      .userUnlistens(fullQuery)
      .userListens(limitQuery)
      .expectEvents(limitQuery, { added: [doc1, doc2], fromCache: true })
      .userSets('collection/a', { matches: false })
      .expectEvents(limitQuery, {
        added: [doc3],
        removed: [doc1],
        fromCache: true
      });
  });

  specTest(
    'Initial snapshots for limit queries are re-filled from cache (with removal)',
    [],
    () => {
      // Verify that views for limit queries are re-filled even if the initial
      // snapshot does not contain the requested number of results.
      const fullQuery = Query.atPath(path('collection')).addFilter(
        filter('matches', '==', true)
      );
      const limitQuery = Query.atPath(path('collection'))
        .addFilter(filter('matches', '==', true))
        .withLimitToFirst(2);
      const doc1 = doc('collection/a', 1001, { matches: true });
      const doc2 = doc('collection/b', 1002, { matches: true });
      const doc3 = doc('collection/c', 1003, { matches: true });
      return spec()
        .withGCEnabled(false)
        .userListens(fullQuery)
        .watchAcksFull(fullQuery, 1003, doc1, doc2, doc3)
        .expectEvents(fullQuery, { added: [doc1, doc2, doc3] })
        .userUnlistens(fullQuery)
        .userListens(limitQuery)
        .expectEvents(limitQuery, { added: [doc1, doc2], fromCache: true })
        .watchAcksFull(limitQuery, 1004, doc1, doc2)
        .expectEvents(limitQuery, {})
        .userUnlistens(limitQuery)
        .watchRemoves(limitQuery)
        .userSets('collection/a', { matches: false })
        .userListens(limitQuery, 'resume-token-1004')
        .expectEvents(limitQuery, { added: [doc2, doc3], fromCache: true });
    }
  );

  specTest(
    'Initial snapshots for limit queries are re-filled from cache (with latency-compensated edit)',
    [],
    () => {
      // Verify that views for limit queries contain the correct set of documents
      // even if a previously matching document receives a latency-compensate update
      // that makes it sort below an older document.
      const fullQuery = Query.atPath(path('collection'));
      const limitQuery = Query.atPath(path('collection'))
        .addOrderBy(orderBy('pos'))
        .withLimitToFirst(2);
      const doc1 = doc('collection/a', 1001, { pos: 1 });
      const doc2 = doc('collection/b', 1002, { pos: 2 });
      const doc3 = doc('collection/c', 1003, { pos: 3 });
      return spec()
        .withGCEnabled(false)
        .userListens(fullQuery)
        .watchAcksFull(fullQuery, 1003, doc1, doc2, doc3)
        .expectEvents(fullQuery, { added: [doc1, doc2, doc3] })
        .userUnlistens(fullQuery)
        .watchRemoves(fullQuery)
        .userListens(limitQuery)
        .expectEvents(limitQuery, { added: [doc1, doc2], fromCache: true })
        .watchAcksFull(limitQuery, 1004, doc1, doc2)
        .expectEvents(limitQuery, {})
        .userUnlistens(limitQuery)
        .watchRemoves(limitQuery)
        .userSets('collection/a', { pos: 4 })
        .userListens(limitQuery, 'resume-token-1004')
        .expectEvents(limitQuery, { added: [doc2, doc3], fromCache: true });
    }
  );

  specTest(
    'Initial snapshots for limit queries are re-filled from cache (with update from backend)',
    [],
    () => {
      // Verify that views for limit queries contain the correct set of documents
      // even if a previously matching document receives an update from the backend
      // that makes it sort below an older document.
      const fullQuery = Query.atPath(path('collection'));
      const limitQuery = Query.atPath(path('collection'))
        .addOrderBy(orderBy('pos'))
        .withLimitToFirst(2);
      const doc1 = doc('collection/a', 1001, { pos: 1 });
      const doc1Edited = doc('collection/a', 1005, { pos: 4 });
      const doc2 = doc('collection/b', 1002, { pos: 2 });
      const doc3 = doc('collection/c', 1003, { pos: 3 });
      return spec()
        .withGCEnabled(false)
        .userListens(fullQuery)
        .watchAcksFull(fullQuery, 1003, doc1, doc2, doc3)
        .expectEvents(fullQuery, { added: [doc1, doc2, doc3] })
        .userUnlistens(fullQuery)
        .watchRemoves(fullQuery)
        .userListens(limitQuery)
        .expectEvents(limitQuery, { added: [doc1, doc2], fromCache: true })
        .watchAcksFull(limitQuery, 1004, doc1, doc2)
        .expectEvents(limitQuery, {})
        .userUnlistens(limitQuery)
        .watchRemoves(limitQuery)
        .userListens(fullQuery, 'resume-token-1003')
        .expectEvents(fullQuery, { added: [doc1, doc2, doc3], fromCache: true })
        .watchAcksFull(fullQuery, 1005, doc1Edited)
        .expectEvents(fullQuery, { modified: [doc1Edited] })
        .userListens(limitQuery, 'resume-token-1004')
        .expectEvents(limitQuery, { added: [doc2, doc3], fromCache: true });
    }
  );

  specTest(
    'Resumed limit queries exclude deleted documents ',
    ['durable-persistence'],
    () => {
      // This test verifies that views for limit queries are updated even
      // when documents are deleted while the query is inactive.

      const limitQuery = Query.atPath(path('collection'))
        .addOrderBy(orderBy('a'))
        .withLimitToFirst(1);
      const fullQuery = Query.atPath(path('collection')).addOrderBy(
        orderBy('a')
      );

      const firstDocument = doc('collection/a', 1001, { a: 1 });
      const firstDocumentDeleted = deletedDoc('collection/a', 1003);
      const secondDocument = doc('collection/b', 1000, { a: 2 });

      return (
        spec()
          .withGCEnabled(false)
          .userListens(limitQuery)
          .watchAcksFull(limitQuery, 1001, firstDocument)
          .expectEvents(limitQuery, { added: [firstDocument] })
          .userUnlistens(limitQuery)
          .watchRemoves(limitQuery)
          .userListens(fullQuery)
          .expectEvents(fullQuery, { added: [firstDocument], fromCache: true })
          .watchAcksFull(fullQuery, 1002, firstDocument, secondDocument)
          .expectEvents(fullQuery, { added: [secondDocument] })
          // Another client modified `firstDocument` and we lost access to it.
          // Watch sends us a remove, but doesn't tell us the new document state.
          // Since we don't know the state of the document, we mark it as limbo.
          .watchRemovesDoc(firstDocument.key, fullQuery)
          .watchSnapshots(1003)
          .expectEvents(fullQuery, { fromCache: true })
          .expectLimboDocs(firstDocument.key)
          .userUnlistens(fullQuery)
          // Since we stop listening to `fullQuery`, we disregard our attempt to
          // resolve the limbo state of `firstDocument`.
          .expectLimboDocs()
          .watchRemoves(fullQuery)
          // We restart the client, which clears the limbo target mapping in the
          // spec test runner. Without restarting, the runner assumes that each
          // limbo document is always assigned the same target ID. SyncEngine,
          // however, uses new target IDs if a document goes in and out of limbo.
          .restart()
          // We listen to the limit query again. Note that we include
          // `firstDocument` in the local result since we did not resolve its
          // limbo state.
          .userListens(limitQuery, 'resume-token-1001')
          .expectEvents(limitQuery, { added: [firstDocument], fromCache: true })
          .watchAcks(limitQuery)
          // Watch resumes the query from the provided resume token, but does
          // not guarantee to send us the removal of `firstDocument`. Instead,
          // we receive an existence filter, which indicates that our view is
          // out of sync.
          .watchSends({ affects: [limitQuery] }, secondDocument)
          .watchFilters([limitQuery], secondDocument.key)
          .watchSnapshots(1004)
          .expectActiveTargets({ query: limitQuery, resumeToken: '' })
          .watchRemoves(limitQuery)
          .watchAcksFull(limitQuery, 1005, secondDocument)
          // The snapshot after the existence filter mismatch triggers limbo
          // resolution. The local view still contains `firstDocument` and
          // hence we do not yet raise a new snapshot.
          .expectLimboDocs(firstDocument.key)
          .ackLimbo(1006, firstDocumentDeleted)
          .expectLimboDocs()
          // We raise the final snapshot when limbo resolution completes. We now
          // include `secondDocument`, which matches the backend result.
          .expectEvents(limitQuery, {
            added: [secondDocument],
            removed: [firstDocument]
          })
      );
    }
  );

  specTest('Resumed limit queries use updated documents ', [], () => {
    // This test verifies that a resumed limit query will not contain documents
    // that fell out of the limit while the query was inactive.

    const limitQuery = Query.atPath(path('collection'))
      .addOrderBy(orderBy('a'))
      .withLimitToFirst(1);
    const fullQuery = Query.atPath(path('collection')).addOrderBy(orderBy('a'));

    const firstDocument = doc('collection/a', 2001, { a: 1 });
    const firstDocumentUpdated = doc('collection/a', 2003, { a: 3 });
    const secondDocument = doc('collection/c', 1000, { a: 2 });

    return (
      spec()
        .withGCEnabled(false)
        // We issue a limit query with an orderBy constraint.
        .userListens(limitQuery)
        .watchAcksFull(limitQuery, 2001, firstDocument)
        .expectEvents(limitQuery, { added: [firstDocument] })
        .userUnlistens(limitQuery)
        .watchRemoves(limitQuery)
        // We issue a second query which adds `secondDocument` to the cache. We
        // also update `firstDocument` to sort after `secondDocument`.
        // `secondDocument` is now older than `firstDocument` but sorts before it
        // in the limit query.
        .userListens(fullQuery)
        .expectEvents(fullQuery, { added: [firstDocument], fromCache: true })
        .watchAcksFull(fullQuery, 2003, firstDocumentUpdated, secondDocument)
        .expectEvents(fullQuery, {
          added: [secondDocument],
          modified: [firstDocumentUpdated]
        })
        .userUnlistens(fullQuery)
        .watchRemoves(fullQuery)
        // Re-issue the limit query and verify that we return `secondDocument`
        // from cache.
        .userListens(limitQuery, 'resume-token-2001')
        .expectEvents(limitQuery, {
          added: [secondDocument],
          fromCache: true
        })
    );
  });

  specTest('Multiple docs in limbo in full limit query', [], () => {
    const query1 = Query.atPath(path('collection')).withLimitToFirst(2);
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
      const query1 = Query.atPath(path('collection')).withLimitToFirst(2);
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
      const query1 = Query.atPath(path('collection')).withLimitToFirst(2);
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
