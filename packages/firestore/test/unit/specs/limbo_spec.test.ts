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

import { TimerId } from '../../../src/util/async_queue';
import { describeSpec, specTest } from './describe_spec';
import { client, spec } from './spec_builder';

describeSpec('Limbo Documents:', [], () => {
  specTest(
    'Limbo documents are deleted without an existence filter',
    [],
    () => {
      const query1 = Query.atPath(path('collection'));
      const doc1 = doc('collection/a', 1000, { key: 'a' });
      const limboQuery = Query.atPath(doc1.key.path);
      return (
        spec()
          .userListens(query1)
          .watchAcksFull(query1, 1000, doc1)
          .expectEvents(query1, {
            added: [doc1]
          })
          .watchResets(query1)
          // No more documents
          .watchCurrents(query1, 'resume-token-1001')
          .watchSnapshots(1001)
          .expectLimboDocs(doc1.key)
          // Limbo document causes query to be "inconsistent"
          .expectEvents(query1, { fromCache: true })
          .watchAcks(limboQuery)
          // No existence filter
          .watchCurrents(limboQuery, 'resume-token-2')
          .watchSnapshots(1002)
          .expectLimboDocs()
          .expectEvents(query1, {
            removed: [doc1]
          })
      );
    }
  );

  specTest('Limbo documents are deleted with an existence filter', [], () => {
    const query1 = Query.atPath(path('collection'));
    const doc1 = doc('collection/a', 1000, { key: 'a' });
    const limboQuery = Query.atPath(doc1.key.path);
    return (
      spec()
        .userListens(query1)
        .watchAcksFull(query1, 1000, doc1)
        .expectEvents(query1, {
          added: [doc1]
        })
        .watchResets(query1)
        // No more documents
        .watchCurrents(query1, 'resume-token-1001')
        .watchSnapshots(1001)
        .expectLimboDocs(doc1.key)
        // Limbo document causes query to be "inconsistent"
        .expectEvents(query1, { fromCache: true })
        .watchAcks(limboQuery)
        .watchFilters([limboQuery]) // no document
        .watchCurrents(limboQuery, 'resume-token-1002')
        .watchSnapshots(1002)
        .expectLimboDocs()
        .expectEvents(query1, {
          removed: [doc1]
        })
    );
  });

  specTest('Limbo documents are resolved with updates', [], () => {
    const query1 = Query.atPath(path('collection')).addFilter(
      filter('key', '==', 'a')
    );
    const doc1a = doc('collection/a', 1000, { key: 'a' });
    const doc1b = doc('collection/a', 1000, { key: 'b' });
    const limboQuery = Query.atPath(doc1a.key.path);
    return (
      spec()
        .userListens(query1)
        .watchAcksFull(query1, 1000, doc1a)
        .expectEvents(query1, {
          added: [doc1a]
        })
        .watchResets(query1)
        // Doc was updated to version b, so no more documents in query 1
        .watchCurrents(query1, 'resume-token-1001')
        .watchSnapshots(1001)
        .expectLimboDocs(doc1a.key)
        // Limbo document causes query to be "inconsistent"
        .expectEvents(query1, { fromCache: true })
        .watchAcks(limboQuery)
        .watchSends({ affects: [limboQuery] }, doc1b)
        .watchCurrents(limboQuery, 'resume-token-1002')
        .watchSnapshots(1002)
        .expectLimboDocs()
        .expectEvents(query1, {
          removed: [doc1a]
        })
    );
  });

  specTest(
    'Limbo documents are resolved with updates in different snapshot than "current"',
    [],
    () => {
      const query1 = Query.atPath(path('collection')).addFilter(
        filter('key', '==', 'a')
      );
      const query2 = Query.atPath(path('collection')).addFilter(
        filter('key', '==', 'b')
      );
      const doc1a = doc('collection/a', 1000, { key: 'a' });
      const doc1b = doc('collection/a', 1000, { key: 'b' });
      const limboQuery = Query.atPath(doc1a.key.path);
      return (
        spec()
          .userListens(query1)
          .watchAcksFull(query1, 1000, doc1a)
          .expectEvents(query1, {
            added: [doc1a]
          })
          .userListens(query2)
          .watchResets(query1)
          // Doc was updated to versionb, so more documents
          .watchCurrents(query1, 'resume-token-1001')
          .watchSnapshots(1001)
          .expectLimboDocs(doc1a.key)
          // Limbo document causes query to be "inconsistent"
          .expectEvents(query1, { fromCache: true })
          .watchAcks(query2)
          .watchAcks(limboQuery)
          .watchSends({ affects: [limboQuery, query2] }, doc1b)
          .watchCurrents(query2, 'resume-token-1002')
          // Query 2 is now current (and contains doc1b), but limbo is not
          // current yet. The document is now no longer in limbo
          .watchSnapshots(1002)
          .expectLimboDocs()
          .expectEvents(query1, {
            removed: [doc1a]
          })
          .expectEvents(query2, {
            added: [doc1b]
          })
          .watchCurrents(limboQuery, 'resume-token-1003')
          // no events are expected, "currenting" the limbo query should
          // not cause a document to be deleted, because it was
          // technically not in limbo any more
          .watchSnapshots(1003)
      );
    }
  );

  specTest('Document remove message will cause docs to go in limbo', [], () => {
    const query = Query.atPath(path('collection'));
    const doc1 = doc('collection/a', 1000, { key: 'a' });
    const doc2 = doc('collection/b', 1001, { key: 'b' });
    const deletedDoc2 = deletedDoc('collection/b', 1004);
    return (
      spec()
        .userListens(query)
        .watchAcksFull(query, 1002, doc1, doc2)
        .expectEvents(query, { added: [doc1, doc2] })
        .watchRemovesDoc(doc2.key, query)
        .watchSnapshots(1003)
        .expectLimboDocs(doc2.key)
        // Limbo document causes query to be "inconsistent"
        .expectEvents(query, { fromCache: true })
        .ackLimbo(1004, deletedDoc2)
        .expectLimboDocs()
        .expectEvents(query, { removed: [doc2] })
    );
  });

  // Regression test for b/72533250.
  specTest('Limbo resolution handles snapshot before CURRENT', [], () => {
    const fullQuery = Query.atPath(path('collection'));
    const limitQuery = Query.atPath(path('collection'))
      .addFilter(filter('include', '==', true))
      .withLimit(1);
    const docA = doc('collection/a', 1000, { key: 'a', include: true });
    const docB = doc('collection/b', 1000, { key: 'b', include: true });
    const docBQuery = Query.atPath(docB.key.path);
    return (
      spec()
        // No GC so we can keep the cache populated.
        .withGCEnabled(false)

        // Full query to populate the cache with docA and docB
        .userListens(fullQuery)
        .watchAcksFull(fullQuery, 1000, docA, docB)
        .expectEvents(fullQuery, {
          added: [docA, docB]
        })
        .userUnlistens(fullQuery)

        // Perform limit(1) query.
        .userListens(limitQuery)
        .expectEvents(limitQuery, {
          added: [docA],
          fromCache: true
        })
        .watchAcksFull(limitQuery, 2000, docA)
        .expectEvents(limitQuery, {
          fromCache: false
        })

        // Edit docA so it no longer matches the query and we pull in docB
        // from cache.
        .userPatches('collection/a', { include: false })
        .expectEvents(limitQuery, {
          removed: [docA],
          added: [docB],
          fromCache: true
        })
        // docB is in limbo since we haven't gotten the watch update to pull
        // it in yet.
        .expectLimboDocs(docB.key)

        // Ack the query and send the document update.
        .watchAcks(docBQuery)
        .watchSends({ affects: [docBQuery] }, docB)

        .watchSnapshots(2000)

        // Additionally CURRENT the query (should have no effect)
        .watchCurrents(docBQuery, 'resume-token-3000')
        .watchSnapshots(3000)

        // Watch catches up to the local write to docA, and broadcasts its
        // removal (and replacement by docB).
        .watchSends({ removed: [limitQuery] }, docA)
        .watchSends({ affects: [limitQuery] }, docB)
        .watchSnapshots(4000)
        .expectEvents(limitQuery, { fromCache: false })
        .expectLimboDocs()
    );
  });

  // Same as above test, except docB no longer exists so we do not get a
  // documentUpdate for it during limbo resolution, so a delete should be
  // synthesized.
  specTest(
    'Limbo resolution handles snapshot before CURRENT [no document update]',
    [],
    () => {
      const fullQuery = Query.atPath(path('collection'));
      const limitQuery = Query.atPath(path('collection'))
        .addFilter(filter('include', '==', true))
        .withLimit(1);
      const docA = doc('collection/a', 1000, { key: 'a', include: true });
      const docB = doc('collection/b', 1000, { key: 'b', include: true });
      const docBQuery = Query.atPath(docB.key.path);
      return (
        spec()
          // No GC so we can keep the cache populated.
          .withGCEnabled(false)

          // Full query to populate the cache with docA and docB
          .userListens(fullQuery)
          .watchAcksFull(fullQuery, 1000, docA, docB)
          .expectEvents(fullQuery, {
            added: [docA, docB]
          })
          .userUnlistens(fullQuery)

          // Perform limit(1) query.
          .userListens(limitQuery)
          .expectEvents(limitQuery, {
            added: [docA],
            fromCache: true
          })
          .watchAcksFull(limitQuery, 2000, docA)
          .expectEvents(limitQuery, {
            fromCache: false
          })

          // Edit docA so it no longer matches the query and we pull in docB
          // from cache.
          .userPatches('collection/a', { include: false })
          .expectEvents(limitQuery, {
            removed: [docA],
            added: [docB],
            fromCache: true
          })
          // docB is in limbo since we haven't gotten the watch update to pull
          // it in yet.
          .expectLimboDocs(docB.key)

          // Suppose docB was actually deleted server-side and so we receive an
          // ack, a snapshot, CURRENT, and then another snapshot. This should
          // resolve the limbo resolution and docB should disappear.
          .watchAcks(docBQuery)
          .watchSnapshots(2000)
          .watchCurrents(docBQuery, 'resume-token-3000')
          .watchSnapshots(3000)
          .expectLimboDocs()
          .expectEvents(limitQuery, { removed: [docB], fromCache: false })

          // Watch catches up to the local write to docA, and broadcasts its
          // removal.
          .watchSends({ removed: [limitQuery] }, docA)
          .watchSnapshots(4000)
      );
    }
  );

  specTest(
    'Limbo docs are resolved by primary client',
    ['multi-client'],
    () => {
      const query = Query.atPath(path('collection'));
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docB = doc('collection/b', 1001, { key: 'b' });
      const deletedDocB = deletedDoc('collection/b', 1004);

      return client(0)
        .expectPrimaryState(true)
        .client(1)
        .userListens(query)
        .client(0)
        .expectListen(query)
        .watchAcksFull(query, 1002, docA, docB)
        .client(1)
        .expectEvents(query, { added: [docA, docB] })
        .client(0)
        .watchRemovesDoc(docB.key, query)
        .watchSnapshots(1003)
        .expectLimboDocs(docB.key)
        .client(1)
        .expectEvents(query, { fromCache: true })
        .client(0)
        .ackLimbo(1004, deletedDocB)
        .expectLimboDocs()
        .client(1)
        .expectEvents(query, { removed: [docB] });
    }
  );

  specTest(
    'Limbo documents are resolved after primary tab failover',
    ['multi-client'],
    () => {
      const query = Query.atPath(path('collection'));
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docB = doc('collection/b', 1001, { key: 'b' });
      const deletedDocB = deletedDoc('collection/b', 1005);

      return client(0, false)
        .expectPrimaryState(true)
        .client(1)
        .userListens(query)
        .client(0)
        .expectListen(query)
        .watchAcksFull(query, 1 * 1e6, docA, docB)
        .client(1)
        .expectEvents(query, { added: [docA, docB] })
        .client(0)
        .watchRemovesDoc(docB.key, query)
        .watchSnapshots(2 * 1e6)
        .expectLimboDocs(docB.key)
        .shutdown()
        .client(1)
        .expectEvents(query, { fromCache: true })
        .runTimer(TimerId.ClientMetadataRefresh)
        .expectPrimaryState(true)
        .expectListen(query, 'resume-token-1000000')
        .watchAcksFull(query, 3 * 1e6)
        .expectLimboDocs(docB.key)
        .ackLimbo(4 * 1e6, deletedDocB)
        .expectLimboDocs()
        .expectEvents(query, { removed: [docB] });
    }
  );

  specTest(
    'Limbo documents survive primary state transitions',
    ['multi-client'],
    () => {
      const query = Query.atPath(path('collection'));
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docB = doc('collection/b', 1001, { key: 'b' });
      const docC = doc('collection/c', 1002, { key: 'c' });
      const deletedDocB = deletedDoc('collection/b', 1006);
      const deletedDocC = deletedDoc('collection/c', 1008);

      return client(0, false)
        .expectPrimaryState(true)
        .userListens(query)
        .watchAcksFull(query, 1 * 1e6, docA, docB, docC)
        .expectEvents(query, { added: [docA, docB, docC] })
        .watchRemovesDoc(docB.key, query)
        .watchRemovesDoc(docC.key, query)
        .watchSnapshots(2 * 1e6)
        .expectEvents(query, { fromCache: true })
        .expectLimboDocs(docB.key, docC.key)
        .client(1)
        .stealPrimaryLease()
        .client(0)
        .runTimer(TimerId.ClientMetadataRefresh)
        .expectPrimaryState(false)
        .expectLimboDocs()
        .client(1)
        .expectListen(query, 'resume-token-1000000')
        .watchAcksFull(query, 3 * 1e6)
        .expectLimboDocs(docB.key, docC.key)
        .ackLimbo(3 * 1e6, deletedDocB)
        .expectLimboDocs(docC.key)
        .client(0)
        .expectEvents(query, { removed: [docB], fromCache: true })
        .stealPrimaryLease()
        .expectListen(query, 'resume-token-1000000')
        .watchAcksFull(query, 5 * 1e6)
        .expectLimboDocs(docC.key)
        .ackLimbo(6 * 1e6, deletedDocC)
        .expectLimboDocs()
        .expectEvents(query, { removed: [docC] });
    }
  );

  specTest('Limbo documents stay consistent between views', [], () => {
    // This tests verifies that a document is consistent between views, even
    // if the document is only in Limbo in one of them.
    const originalQuery = Query.atPath(path('collection'));
    const filteredQuery = Query.atPath(path('collection'))
      .addFilter(filter('matches', '==', true));

    const docA = doc('collection/a', 1000, { matches: true });
    const docADirty = doc(
      'collection/a',
      1000,
      {  matches: true },
      { hasCommittedMutations: true }
    );
    const docBDirty = doc(
      'collection/b',
      1001,
      {  matches: true },
      { hasCommittedMutations: true }
    );

    return (
      client(0)
        .userSets('collection/a', { matches: true })
        .userSets('collection/b', { matches: true })
        .writeAcks('collection/a', 1000)
        .writeAcks('collection/b', 1001)
        .userListens(originalQuery)
        .expectEvents(originalQuery, {
          added: [docADirty, docBDirty],
          fromCache: true
        })
        // Watch only includes docA in the result set, indicating that docB was
        // modified out-of-band.
        .watchAcksFull(originalQuery, 2000, docA)
        .expectLimboDocs(docBDirty.key)
        .userListens(filteredQuery)
        .expectEvents(filteredQuery, {
          added: [docA, docBDirty],
          fromCache: true
        })
        .userUnlistens(originalQuery)
        .expectLimboDocs()
        // Re-run the query. Note that we still return the unresolved limbo
        // document `docBCommitted`, since we haven't received the resolved
        // document from Watch. Until we do, we return the version from cache
        // even though the backend told it does not match.
        .userListens(originalQuery, 'resume-token-2000')
        .expectEvents(originalQuery, {
          added: [docA, docBDirty],
          fromCache: true
        })
    );
  });
});
