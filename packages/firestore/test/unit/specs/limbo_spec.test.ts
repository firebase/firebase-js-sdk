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
});
