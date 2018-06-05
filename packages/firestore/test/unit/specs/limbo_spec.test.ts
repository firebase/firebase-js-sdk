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

import { Query } from '../../../src/core/query';
import { deletedDoc, doc, filter, path } from '../../util/helpers';

import { describeSpec, specTest } from './describe_spec';
import { spec } from './spec_builder';

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
  specTest('Limbo documents handle receiving ack and then current', [], () => {
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

        // TODO(b/72533250): If you uncomment this totally valid watch
        // snapshot, then the test fails because the subsequent CURRENT below
        // is turned into a delete of docB.
        //.watchSnapshots(2000)

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
});
