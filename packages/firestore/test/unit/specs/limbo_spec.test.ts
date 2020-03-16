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
import { deletedDoc, doc, filter, path, orderBy } from '../../util/helpers';

import { TimerId } from '../../../src/util/async_queue';
import { Code } from '../../../src/util/error';
import { describeSpec, specTest } from './describe_spec';
import { client, spec } from './spec_builder';
import { RpcError } from './spec_rpc_error';

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
    const doc1b = doc('collection/a', 1002, { key: 'b' });
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
      const doc1b = doc('collection/a', 1002, { key: 'b' });
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
      .withLimitToFirst(1);
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
        .withLimitToFirst(1);
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

  specTest('Failed limbo resolution removes document from view', [], () => {
    // This test reproduces a customer issue where a failed limbo resolution
    // triggered an assert because we added a document to the cache with a
    // read time of zero.
    const filteredQuery = Query.atPath(path('collection')).addFilter(
      filter('matches', '==', true)
    );
    const fullQuery = Query.atPath(path('collection'));
    const remoteDoc = doc('collection/a', 1000, { matches: true });
    const localDoc = doc(
      'collection/a',
      1000,
      { matches: true, modified: true },
      { hasLocalMutations: true }
    );
    return (
      spec()
        .userListens(filteredQuery)
        .watchAcksFull(filteredQuery, 1000, remoteDoc)
        .expectEvents(filteredQuery, { added: [remoteDoc] })
        // We add a local mutation to prevent the document from getting garbage
        // collected when we unlisten from the current query.
        .userPatches('collection/a', { modified: true })
        .expectEvents(filteredQuery, {
          modified: [localDoc],
          hasPendingWrites: true
        })
        .userUnlistens(filteredQuery)
        // Start a new query, but don't include the document in the backend
        // results (it might have been removed by another client).
        .userListens(fullQuery)
        .expectEvents(fullQuery, {
          added: [localDoc],
          hasPendingWrites: true,
          fromCache: true
        })
        .watchAcksFull(fullQuery, 1001)
        .expectEvents(fullQuery, { hasPendingWrites: true })
        // Fail the write and remove the pending mutation. The document should
        // now be in Limbo.
        .failWrite(
          'collection/a',
          new RpcError(
            Code.FAILED_PRECONDITION,
            'Document to update does not exist'
          )
        )
        .expectEvents(fullQuery, { modified: [remoteDoc], fromCache: true })
        .expectLimboDocs(remoteDoc.key)
        // Fail the Limbo resolution which removes the document from the view.
        // This is internally propagated as a NoDocument with
        // SnapshotVersion.MIN and a read time of zero.
        .watchRemoves(
          Query.atPath(path('collection/a')),
          new RpcError(Code.PERMISSION_DENIED, 'Permission denied')
        )
        .expectEvents(fullQuery, { removed: [remoteDoc] })
        .expectLimboDocs()
    );
  });

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
        .expectListen(query, 'resume-token-1000000')
        .client(0)
        .runTimer(TimerId.ClientMetadataRefresh)
        .expectPrimaryState(false)
        .expectLimboDocs()
        .client(1)
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
    const filteredQuery = Query.atPath(path('collection')).addFilter(
      filter('matches', '==', true)
    );

    const docA = doc('collection/a', 1000, { matches: true });
    const docADirty = doc(
      'collection/a',
      1000,
      { matches: true },
      { hasCommittedMutations: true }
    );
    const docBDirty = doc(
      'collection/b',
      1001,
      { matches: true },
      { hasCommittedMutations: true }
    );

    return (
      spec()
        .withGCEnabled(false)
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

  specTest(
    'LimitToLast query from secondary results in no expected limbo doc',
    ['multi-client'],
    () => {
      const limitToLast = Query.atPath(path('collection'))
        .addOrderBy(orderBy('val', 'desc'))
        .withLimitToLast(3);
      const docA = doc('collection/a', 1000, { val: 11 });
      const docB = doc('collection/b', 1000, { val: 12 });
      const docC = doc('collection/c', 1000, { val: 13 });

      const docA2 = doc('collection/a', 2000, { val: 5 });
      const docB2 = doc('collection/b', 2000, { val: 6 });

      const docD = doc('collection/d', 2000, { val: 7 });

      return (
        client(0)
          .becomeVisible()
          .client(1)
          .userListens(limitToLast)
          .client(0)
          .expectListen(limitToLast)
          .watchAcksFull(limitToLast, 1000, docA, docB, docC)
          .client(1)
          .expectEvents(limitToLast, { added: [docC, docB, docA] })
          .client(0)
          .watchResets()
          .watchSends({ affects: [limitToLast] }, docA2, docB2, docD)
          .watchCurrents(limitToLast, 'resume-token-2000')
          .watchSnapshots(2000)
          .client(1)
          .expectEvents(limitToLast, {
            added: [docD],
            removed: [docC],
            modified: [docB2, docA2]
          })
          .client(0)
          // docC dropped out of limit in both local and backend result, hence
          // it's not a limbo doc.
          .expectLimboDocs()
      );
    }
  );

  specTest(
    'LimitToLast query from secondary results in expected limbo doc',
    ['multi-client'],
    () => {
      const limitToLast = Query.atPath(path('collection'))
        .addOrderBy(orderBy('val', 'desc'))
        .withLimitToLast(3);
      const docA = doc('collection/a', 1000, { val: 11 });
      const docB = doc('collection/b', 1000, { val: 12 });
      const docC = doc('collection/c', 1000, { val: 13 });

      const docA2 = doc('collection/a', 2000, { val: 11 });
      const docB2 = doc('collection/b', 2000, { val: 12 });

      const docD = doc('collection/d', 2000, { val: 100 });

      return (
        client(0)
          .becomeVisible()
          .client(1)
          .userListens(limitToLast)
          .client(0)
          .expectListen(limitToLast)
          .watchAcksFull(limitToLast, 1000, docA, docB, docC)
          .client(1)
          .expectEvents(limitToLast, { added: [docC, docB, docA] })
          .client(0)
          .watchResets()
          .watchSends({ affects: [limitToLast] }, docA2, docB2, docD)
          .watchCurrents(limitToLast, 'resume-token-2000')
          .watchSnapshots(2000)
          // docC dropped out of limit in from backend result, but still
          // in local results, so it is in limbo now.
          .expectLimboDocs(docC.key)
          .client(1)
          .expectEvents(limitToLast, { fromCache: true })
      );
    }
  );

  specTest(
    'Limbo resolution throttling with all results at once from watch',
    ['no-ios'],
    () => {
      const query = Query.atPath(path('collection'));
      const doc1 = doc('collection/a', 1000, { key: 'a' });
      const doc2 = doc('collection/b', 1000, { key: 'b' });
      const doc3 = doc('collection/c', 1000, { key: 'c' });
      const limboQuery1 = Query.atPath(doc1.key.path);
      const limboQuery2 = Query.atPath(doc2.key.path);
      const limboQuery3 = Query.atPath(doc3.key.path);

      return (
        spec()
          .withMaxConcurrentLimboResolutions(2)
          .userListens(query)
          .watchAcksFull(query, 1000, doc1, doc2, doc3)
          .expectEvents(query, {
            added: [doc1, doc2, doc3]
          })
          .watchResets(query)
          .watchSends({ affects: [query] })
          .watchCurrents(query, 'resume-token-2000')
          .watchSnapshots(2000)
          .expectLimboDocsEx({
            activeKeys: [doc1.key, doc2.key],
            inactiveKeys: [doc3.key]
          })
          // Limbo document causes query to be "inconsistent"
          .expectEvents(query, { fromCache: true })
          .watchAcks(limboQuery1)
          .watchAcks(limboQuery2)
          .watchCurrents(limboQuery1, 'resume-token-2001')
          .watchCurrents(limboQuery2, 'resume-token-2001')
          .watchSnapshots(2001)
          .expectLimboDocs(doc3.key)
          .expectEvents(query, {
            removed: [doc1, doc2],
            fromCache: true
          })
          .watchAcks(limboQuery3)
          .watchCurrents(limboQuery3, 'resume-token-2001')
          .watchSnapshots(2001)
          .expectLimboDocs()
          .expectEvents(query, {
            removed: [doc3],
            fromCache: false
          })
      );
    }
  );

  specTest(
    'Limbo resolution throttling with results one at a time from watch',
    ['no-ios'],
    () => {
      const query = Query.atPath(path('collection'));
      const doc1 = doc('collection/a', 1000, { key: 'a' });
      const doc2 = doc('collection/b', 1000, { key: 'b' });
      const doc3 = doc('collection/c', 1000, { key: 'c' });
      const limboQuery1 = Query.atPath(doc1.key.path);
      const limboQuery2 = Query.atPath(doc2.key.path);
      const limboQuery3 = Query.atPath(doc3.key.path);

      return (
        spec()
          .withMaxConcurrentLimboResolutions(2)
          .userListens(query)
          .watchAcksFull(query, 1000, doc1, doc2, doc3)
          .expectEvents(query, {
            added: [doc1, doc2, doc3]
          })
          .watchResets(query)
          .watchSends({ affects: [query] })
          .watchCurrents(query, 'resume-token-2000')
          .watchSnapshots(2000)
          .expectLimboDocsEx({
            activeKeys: [doc1.key, doc2.key],
            inactiveKeys: [doc3.key]
          })
          // Limbo document causes query to be "inconsistent"
          .expectEvents(query, { fromCache: true })
          .watchAcks(limboQuery1)
          .watchCurrents(limboQuery1, 'resume-token-2001')
          .watchSnapshots(2001)
          .expectLimboDocs(doc2.key, doc3.key)
          .expectEvents(query, {
            removed: [doc1],
            fromCache: true
          })
          .watchAcks(limboQuery2)
          .watchCurrents(limboQuery2, 'resume-token-2001')
          .watchSnapshots(2001)
          .expectLimboDocs(doc3.key)
          .expectEvents(query, {
            removed: [doc2],
            fromCache: true
          })
          .watchAcks(limboQuery3)
          .watchCurrents(limboQuery3, 'resume-token-2001')
          .watchSnapshots(2001)
          .expectLimboDocs()
          .expectEvents(query, {
            removed: [doc3],
            fromCache: false
          })
      );
    }
  );

  specTest(
    'Limbo resolution throttling when a limbo listen is rejected.',
    ['no-ios'],
    () => {
      const query = Query.atPath(path('collection'));
      const doc1 = doc('collection/a', 1000, { key: 'a' });
      const doc2 = doc('collection/b', 1000, { key: 'b' });
      const limboQuery1 = Query.atPath(doc1.key.path);
      const limboQuery2 = Query.atPath(doc2.key.path);

      return (
        spec()
          .withMaxConcurrentLimboResolutions(1)
          .userListens(query)
          .watchAcksFull(query, 1000, doc1, doc2)
          .expectEvents(query, { added: [doc1, doc2] })
          // Watch tells us that the query results have changed to the empty
          // set, which makes our local cache inconsistent with the remote
          // state, causing a fromCache=true event to be raised.
          .watchResets(query)
          .watchSends({ affects: [query] })
          .watchCurrents(query, 'resume-token-1001')
          .watchSnapshots(1001)
          // Both doc1 and doc2 are in limbo, but the maximum number of limbo
          // listens was set to 1, which causes doc1 to get resolved and doc2
          // to get enqueued.
          .expectLimboDocsEx({
            activeKeys: [doc1.key],
            inactiveKeys: [doc2.key]
          })
          // Limbo document causes query to be "inconsistent"
          .expectEvents(query, { fromCache: true })
          .watchRemoves(
            limboQuery1,
            new RpcError(Code.RESOURCE_EXHAUSTED, 'Resource exhausted')
          )
          // When a limbo listen gets rejected, we assume that it was deleted.
          // But now that doc1 is resolved, the limbo resolution for doc2 can
          // start.
          .expectLimboDocs(doc2.key)
          .expectEvents(query, { removed: [doc1], fromCache: true })
          // Reject the listen for the second limbo resolution as well, in order
          // to exercise the code path of a rejected limbo resolution without
          // any enqueued limbo resolutions.
          .watchRemoves(
            limboQuery2,
            new RpcError(Code.RESOURCE_EXHAUSTED, 'Resource exhausted')
          )
          .expectLimboDocs()
          .expectEvents(query, { removed: [doc2] })
      );
    }
  );

  specTest(
    // This test exercises the steps that resulted in unbounded reads that
    // motivated throttling:
    // https://github.com/firebase/firebase-js-sdk/issues/2683
    'Limbo resolution throttling with existence filter mismatch',
    ['no-ios'],
    () => {
      const query = Query.atPath(path('collection'));
      const docA1 = doc('collection/a1', 1000, { key: 'a1' });
      const docA2 = doc('collection/a2', 1000, { key: 'a2' });
      const docA3 = doc('collection/a3', 1000, { key: 'a3' });
      const docB1 = doc('collection/b1', 1000, { key: 'b1' });
      const docB2 = doc('collection/b2', 1000, { key: 'b2' });
      const docB3 = doc('collection/b3', 1000, { key: 'b3' });
      const docA1Query = Query.atPath(docA1.key.path);
      const docA2Query = Query.atPath(docA2.key.path);
      const docA3Query = Query.atPath(docA3.key.path);

      return (
        spec()
          .withMaxConcurrentLimboResolutions(2)
          .userListens(query)
          .watchAcks(query)
          .watchSends({ affects: [query] }, docA1, docA2, docA3)
          .watchCurrents(query, 'resume-token-1000')
          .watchSnapshots(1000)
          .expectEvents(query, { added: [docA1, docA2, docA3] })
          // At this point the query is consistent and matches 3 documents:
          // docA1, docA2, and docA3. Then, network connectivity is lost.
          .disableNetwork()
          // The query listener is notified that the results are being served
          // from cache since without network connection there is no way to know
          // if we are in sync with the server.
          .expectEvents(query, { fromCache: true })
          .enableNetwork()
          // The network connection has come back so the client re-registers
          // the listener, providing the resume token from before. Watch will
          // then send updates that occurred since the timestamp encoded in the
          // resume token.
          .restoreListen(query, 'resume-token-1000')
          .watchAcks(query)
          // Watch now tells us that the query results on the server are docB1,
          // docB2, and docB3, along with an existence filter to state that the
          // total number of documents that match the query is 3.
          .watchSends({ affects: [query] }, docB1, docB2, docB3)
          .watchFilters([query], docB1.key, docB2.key, docB3.key)
          .watchSnapshots(1001)
          // The query listener is now inconsistent because it had thought that
          // the set of matching documents was docA1, docA2, and docA3 but the
          // server just told us that the set of matching documents is
          // completely different: docB1, docB2, and docB3. So the query
          // notifies the user that these documents were added, but still says
          // fromCache=true because we need to resolve docA1, docA2, and docA3.
          .expectEvents(query, {
            added: [docB1, docB2, docB3],
            fromCache: true
          })
          // After the existence filter mismatch the client re-listens without
          // a resume token.
          .expectActiveTargets({ query, resumeToken: '' })
          // When the existence filter mismatch was detected, we removed then
          // re-added the target; therefore, watch acknowledges the removal.
          .watchRemoves(query)
          // Watch has re-run the query and returns the same result set: docB1,
          // docB2, and docB3. This puts docA1, docA2, and docA3 into limbo,
          // which the client then issues queries to resolve. Since the maximum
          // number of concurrent limbo resolutions was set to 2, only the first
          // two limbo resolutions are started, with the 3rd being enqueued.
          .watchAcksFull(query, 1002, docB1, docB2, docB3)
          .expectLimboDocsEx({
            activeKeys: [docA1.key, docA2.key],
            inactiveKeys: [docA3.key]
          })
          .watchAcks(docA1Query)
          .watchAcks(docA2Query)
          .watchCurrents(docA1Query, 'resume-token-1003')
          .watchCurrents(docA2Query, 'resume-token-1003')
          .watchSnapshots(1003)
          // Watch has now confirmed that docA1 and docA2 have been deleted. So
          // the listener sends an event that the documents have
          // been removed; however, since docA3 is still enqueued for limbo
          // resolution the results are still from cache; however, now that
          // there are 0 limbo resolutions in progress, the limbo resolution for
          // docA3 is started.
          .expectEvents(query, { removed: [docA1, docA2], fromCache: true })
          .expectLimboDocs(docA3.key)
          .watchAcks(docA3Query)
          .watchCurrents(docA3Query, 'resume-token-1004')
          .watchSnapshots(1004)
          // Watch has now confirmed that docA3 has been deleted. So the
          // listener sends an event about this and now specifies
          // fromCache=false since we are in sync with the server and all docs
          // that were in limbo have been resolved.
          .expectEvents(query, { removed: [docA3] })
          .expectLimboDocs()
      );
    }
  );
});
