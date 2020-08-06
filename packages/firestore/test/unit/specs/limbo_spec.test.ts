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

import {
  LimitType,
  newQueryForPath,
  queryWithLimit
} from '../../../src/core/query';
import { deletedDoc, doc, filter, orderBy, query } from '../../util/helpers';

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
      const query1 = query('collection');
      const doc1 = doc('collection/a', 1000, { key: 'a' });
      const limboQuery = newQueryForPath(doc1.key.path);
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
    const query1 = query('collection');
    const doc1 = doc('collection/a', 1000, { key: 'a' });
    const limboQuery = newQueryForPath(doc1.key.path);
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
    const query1 = query('collection', filter('key', '==', 'a'));
    const doc1a = doc('collection/a', 1000, { key: 'a' });
    const doc1b = doc('collection/a', 1002, { key: 'b' });
    const limboQuery = newQueryForPath(doc1a.key.path);
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
      const query1 = query('collection', filter('key', '==', 'a'));
      const query2 = query('collection', filter('key', '==', 'b'));
      const doc1a = doc('collection/a', 1000, { key: 'a' });
      const doc1b = doc('collection/a', 1002, { key: 'b' });
      const limboQuery = newQueryForPath(doc1a.key.path);
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
    const query1 = query('collection');
    const doc1 = doc('collection/a', 1000, { key: 'a' });
    const doc2 = doc('collection/b', 1001, { key: 'b' });
    const deletedDoc2 = deletedDoc('collection/b', 1004);
    return (
      spec()
        .userListens(query1)
        .watchAcksFull(query1, 1002, doc1, doc2)
        .expectEvents(query1, { added: [doc1, doc2] })
        .watchRemovesDoc(doc2.key, query1)
        .watchSnapshots(1003)
        .expectLimboDocs(doc2.key)
        // Limbo document causes query to be "inconsistent"
        .expectEvents(query1, { fromCache: true })
        .ackLimbo(1004, deletedDoc2)
        .expectLimboDocs()
        .expectEvents(query1, { removed: [doc2] })
    );
  });

  // Regression test for b/72533250.
  specTest('Limbo resolution handles snapshot before CURRENT', [], () => {
    const fullQuery = query('collection');
    const limitQuery = queryWithLimit(
      query('collection', filter('include', '==', true)),
      1,
      LimitType.First
    );
    const docA = doc('collection/a', 1000, { key: 'a', include: true });
    const docB = doc('collection/b', 1000, { key: 'b', include: true });
    const docBQuery = newQueryForPath(docB.key.path);
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
      const fullQuery = query('collection');
      const limitQuery = queryWithLimit(
        query('collection', filter('include', '==', true)),
        1,
        LimitType.First
      );
      const docA = doc('collection/a', 1000, { key: 'a', include: true });
      const docB = doc('collection/b', 1000, { key: 'b', include: true });
      const docBQuery = newQueryForPath(docB.key.path);
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
    const filteredQuery = query('collection', filter('matches', '==', true));
    const fullQuery = query('collection');
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
        // SnapshotVersion.min() and a read time of zero.
        .watchRemoves(
          query('collection/a'),
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
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docB = doc('collection/b', 1001, { key: 'b' });
      const deletedDocB = deletedDoc('collection/b', 1004);

      return client(0)
        .expectPrimaryState(true)
        .client(1)
        .userListens(query1)
        .client(0)
        .expectListen(query1)
        .watchAcksFull(query1, 1002, docA, docB)
        .client(1)
        .expectEvents(query1, { added: [docA, docB] })
        .client(0)
        .watchRemovesDoc(docB.key, query1)
        .watchSnapshots(1003)
        .expectLimboDocs(docB.key)
        .client(1)
        .expectEvents(query1, { fromCache: true })
        .client(0)
        .ackLimbo(1004, deletedDocB)
        .expectLimboDocs()
        .client(1)
        .expectEvents(query1, { removed: [docB] });
    }
  );

  specTest(
    'Limbo documents are resolved after primary tab failover',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docB = doc('collection/b', 1001, { key: 'b' });
      const deletedDocB = deletedDoc('collection/b', 1005);

      return client(0, false)
        .expectPrimaryState(true)
        .client(1)
        .userListens(query1)
        .client(0)
        .expectListen(query1)
        .watchAcksFull(query1, 1 * 1e6, docA, docB)
        .client(1)
        .expectEvents(query1, { added: [docA, docB] })
        .client(0)
        .watchRemovesDoc(docB.key, query1)
        .watchSnapshots(2 * 1e6)
        .expectLimboDocs(docB.key)
        .shutdown()
        .client(1)
        .expectEvents(query1, { fromCache: true })
        .runTimer(TimerId.ClientMetadataRefresh)
        .expectPrimaryState(true)
        .expectListen(query1, { resumeToken: 'resume-token-1000000' })
        .watchAcksFull(query1, 3 * 1e6)
        .expectLimboDocs(docB.key)
        .ackLimbo(4 * 1e6, deletedDocB)
        .expectLimboDocs()
        .expectEvents(query1, { removed: [docB] });
    }
  );

  specTest(
    'Limbo documents survive primary state transitions',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docB = doc('collection/b', 1001, { key: 'b' });
      const docC = doc('collection/c', 1002, { key: 'c' });
      const deletedDocB = deletedDoc('collection/b', 1006);
      const deletedDocC = deletedDoc('collection/c', 1008);

      return client(0, false)
        .expectPrimaryState(true)
        .userListens(query1)
        .watchAcksFull(query1, 1 * 1e6, docA, docB, docC)
        .expectEvents(query1, { added: [docA, docB, docC] })
        .watchRemovesDoc(docB.key, query1)
        .watchRemovesDoc(docC.key, query1)
        .watchSnapshots(2 * 1e6)
        .expectEvents(query1, { fromCache: true })
        .expectLimboDocs(docB.key, docC.key)
        .client(1)
        .stealPrimaryLease()
        .expectListen(query1, { resumeToken: 'resume-token-1000000' })
        .client(0)
        .runTimer(TimerId.ClientMetadataRefresh)
        .expectPrimaryState(false)
        .expectLimboDocs()
        .client(1)
        .watchAcksFull(query1, 3 * 1e6)
        .expectLimboDocs(docB.key, docC.key)
        .ackLimbo(3 * 1e6, deletedDocB)
        .expectLimboDocs(docC.key)
        .client(0)
        .expectEvents(query1, { removed: [docB], fromCache: true })
        .stealPrimaryLease()
        .expectListen(query1, { resumeToken: 'resume-token-1000000' })
        .watchAcksFull(query1, 5 * 1e6)
        .expectLimboDocs(docC.key)
        .ackLimbo(6 * 1e6, deletedDocC)
        .expectLimboDocs()
        .expectEvents(query1, { removed: [docC] });
    }
  );

  specTest('Limbo documents stay consistent between views', [], () => {
    // This tests verifies that a document is consistent between views, even
    // if the document is only in Limbo in one of them.
    const originalQuery = query('collection');
    const filteredQuery = query('collection', filter('matches', '==', true));

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
        .userListens(originalQuery, { resumeToken: 'resume-token-2000' })
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
      const limitToLast = queryWithLimit(
        query('collection', orderBy('val', 'desc')),
        3,
        LimitType.Last
      );
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
      const limitToLast = queryWithLimit(
        query('collection', orderBy('val', 'desc')),
        3,
        LimitType.Last
      );
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
    // TODO(dconeybe) Remove the 'no-*' tags as these platforms implement limbo
    //  resolution throttling.
    ['no-ios'],
    () => {
      const query1 = query('collection');
      const doc1 = doc('collection/a', 1000, { key: 'a' });
      const doc2 = doc('collection/b', 1000, { key: 'b' });
      const doc3 = doc('collection/c', 1000, { key: 'c' });
      const doc4 = doc('collection/d', 1000, { key: 'd' });
      const doc5 = doc('collection/e', 1000, { key: 'e' });
      const limboQuery1 = newQueryForPath(doc1.key.path);
      const limboQuery2 = newQueryForPath(doc2.key.path);
      const limboQuery3 = newQueryForPath(doc3.key.path);
      const limboQuery4 = newQueryForPath(doc4.key.path);
      const limboQuery5 = newQueryForPath(doc5.key.path);

      // Simulate Watch sending us a reset if another client deletes the
      // documents that match our query. Verify that limbo throttling works
      // when Watch resolves the limbo documents listens in a single snapshot.
      return (
        spec()
          .withMaxConcurrentLimboResolutions(2)
          .userListens(query1)
          .watchAcksFull(query1, 1000, doc1, doc2, doc3, doc4, doc5)
          .expectEvents(query1, {
            added: [doc1, doc2, doc3, doc4, doc5]
          })
          .watchResets(query1)
          .watchSends({ affects: [query1] })
          .watchCurrents(query1, 'resume-token-2000')
          .watchSnapshots(2000)
          .expectLimboDocs(doc1.key, doc2.key)
          .expectEnqueuedLimboDocs(doc3.key, doc4.key, doc5.key)
          // Limbo document causes query to be "inconsistent"
          .expectEvents(query1, { fromCache: true })
          .watchAcks(limboQuery1)
          .watchAcks(limboQuery2)
          // Resolve limbo documents doc1 and doc2 in a single snapshot.
          .watchCurrents(limboQuery1, 'resume-token-2001')
          .watchCurrents(limboQuery2, 'resume-token-2001')
          .watchSnapshots(2001)
          .expectEvents(query1, {
            removed: [doc1, doc2],
            fromCache: true
          })
          // Start the second round of limbo resolutions.
          .expectLimboDocs(doc3.key, doc4.key)
          .expectEnqueuedLimboDocs(doc5.key)
          .watchAcks(limboQuery3)
          .watchAcks(limboQuery4)
          // Resolve limbo documents doc3 and doc4 in a single snapshot.
          .watchCurrents(limboQuery3, 'resume-token-2002')
          .watchCurrents(limboQuery4, 'resume-token-2002')
          .watchSnapshots(2002)
          .expectEvents(query1, {
            removed: [doc3, doc4],
            fromCache: true
          })
          // Start the final round of limbo resolutions.
          .expectLimboDocs(doc5.key)
          .expectEnqueuedLimboDocs()
          .watchAcks(limboQuery5)
          // Resolve limbo document doc5.
          .watchCurrents(limboQuery5, 'resume-token-2003')
          .watchSnapshots(2003)
          .expectEvents(query1, {
            removed: [doc5],
            fromCache: false
          })
          .expectLimboDocs()
          .expectEnqueuedLimboDocs()
      );
    }
  );

  specTest(
    'Limbo resolution throttling with results one at a time from watch',
    // TODO(dconeybe) Remove the 'no-*' tags as these platforms implement limbo
    //  resolution throttling.
    ['no-ios'],
    () => {
      const query1 = query('collection');
      const doc1 = doc('collection/a', 1000, { key: 'a' });
      const doc2 = doc('collection/b', 1000, { key: 'b' });
      const doc3 = doc('collection/c', 1000, { key: 'c' });
      const doc4 = doc('collection/d', 1000, { key: 'd' });
      const doc5 = doc('collection/e', 1000, { key: 'e' });
      const limboQuery1 = newQueryForPath(doc1.key.path);
      const limboQuery2 = newQueryForPath(doc2.key.path);
      const limboQuery3 = newQueryForPath(doc3.key.path);
      const limboQuery4 = newQueryForPath(doc4.key.path);
      const limboQuery5 = newQueryForPath(doc5.key.path);

      // Simulate Watch sending us a reset if another client deletes the
      // documents that match our query. Verify that limbo throttling works
      // when Watch resolves the limbo documents listens one per snapshot.
      return (
        spec()
          .withMaxConcurrentLimboResolutions(2)
          .userListens(query1)
          .watchAcksFull(query1, 1000, doc1, doc2, doc3, doc4, doc5)
          .expectEvents(query1, {
            added: [doc1, doc2, doc3, doc4, doc5]
          })
          .watchResets(query1)
          .watchSends({ affects: [query1] })
          .watchCurrents(query1, 'resume-token-2000')
          .watchSnapshots(2000)
          .expectLimboDocs(doc1.key, doc2.key)
          .expectEnqueuedLimboDocs(doc3.key, doc4.key, doc5.key)
          // Limbo document causes query to be "inconsistent"
          .expectEvents(query1, { fromCache: true })
          .watchAcks(limboQuery1)
          .watchAcks(limboQuery2)
          // Resolve the limbo documents doc1 in its own snapshot.
          .watchCurrents(limboQuery1, 'resume-token-2001')
          .watchSnapshots(2001)
          .expectEvents(query1, { removed: [doc1], fromCache: true })
          // Start the next limbo resolution since one has finished.
          .expectLimboDocs(doc2.key, doc3.key)
          .expectEnqueuedLimboDocs(doc4.key, doc5.key)
          .watchAcks(limboQuery3)
          // Resolve the limbo documents doc2 in its own snapshot.
          .watchCurrents(limboQuery2, 'resume-token-2002')
          .watchSnapshots(2002)
          .expectEvents(query1, { removed: [doc2], fromCache: true })
          // Start the next limbo resolution since one has finished.
          .expectLimboDocs(doc3.key, doc4.key)
          .expectEnqueuedLimboDocs(doc5.key)
          .watchAcks(limboQuery4)
          // Resolve the limbo documents doc3 in its own snapshot.
          .watchCurrents(limboQuery3, 'resume-token-2003')
          .watchSnapshots(2003)
          .expectEvents(query1, { removed: [doc3], fromCache: true })
          // Start the next limbo resolution since one has finished.
          .expectLimboDocs(doc4.key, doc5.key)
          .expectEnqueuedLimboDocs()
          .watchAcks(limboQuery5)
          // Resolve the limbo documents doc4 in its own snapshot.
          .watchCurrents(limboQuery4, 'resume-token-2004')
          .watchSnapshots(2004)
          .expectEvents(query1, { removed: [doc4], fromCache: true })
          // The final limbo document listen is already active; resolve it.
          .expectLimboDocs(doc5.key)
          .expectEnqueuedLimboDocs()
          // Resolve the limbo documents doc5 in its own snapshot.
          .watchCurrents(limboQuery5, 'resume-token-2005')
          .watchSnapshots(2005)
          .expectEvents(query1, { removed: [doc5], fromCache: false })
          .expectLimboDocs()
          .expectEnqueuedLimboDocs()
      );
    }
  );

  specTest(
    'Limbo resolution throttling when a limbo listen is rejected.',
    // TODO(dconeybe) Remove the 'no-*' tags as these platforms implement limbo
    //  resolution throttling.
    ['no-ios'],
    () => {
      const query1 = query('collection');
      const doc1 = doc('collection/a', 1000, { key: 'a' });
      const doc2 = doc('collection/b', 1000, { key: 'b' });
      const limboQuery1 = newQueryForPath(doc1.key.path);
      const limboQuery2 = newQueryForPath(doc2.key.path);

      // Simulate Watch sending us a reset if another client deletes the
      // documents that match our query. Verify that limbo throttling works
      // when Watch rejects the listens for limbo resolution.
      return (
        spec()
          .withMaxConcurrentLimboResolutions(1)
          .userListens(query1)
          .watchAcksFull(query1, 1000, doc1, doc2)
          .expectEvents(query1, { added: [doc1, doc2] })
          .watchResets(query1)
          .watchSends({ affects: [query1] })
          .watchCurrents(query1, 'resume-token-1001')
          .watchSnapshots(2000)
          .expectLimboDocs(doc1.key)
          .expectEnqueuedLimboDocs(doc2.key)
          // Limbo document causes query to be "inconsistent"
          .expectEvents(query1, { fromCache: true })
          .watchRemoves(
            limboQuery1,
            new RpcError(Code.RESOURCE_EXHAUSTED, 'Resource exhausted')
          )
          // When a limbo listen gets rejected, we assume that it was deleted.
          // But now that doc1 is resolved, the limbo resolution for doc2 can
          // start.
          .expectEvents(query1, { removed: [doc1], fromCache: true })
          .expectLimboDocs(doc2.key)
          .expectEnqueuedLimboDocs()
          // Reject the listen for the second limbo resolution as well, in order
          // to exercise the code path of a rejected limbo resolution without
          // any enqueued limbo resolutions.
          .watchRemoves(
            limboQuery2,
            new RpcError(Code.RESOURCE_EXHAUSTED, 'Resource exhausted')
          )
          .expectEvents(query1, { removed: [doc2] })
          .expectLimboDocs()
          .expectEnqueuedLimboDocs()
      );
    }
  );

  specTest(
    'Limbo resolution throttling with existence filter mismatch',
    // TODO(dconeybe) Remove the 'no-*' tags as these platforms implement limbo
    //  resolution throttling.
    ['no-ios'],
    () => {
      const query1 = query('collection');
      const docA1 = doc('collection/a1', 1000, { key: 'a1' });
      const docA2 = doc('collection/a2', 1000, { key: 'a2' });
      const docA3 = doc('collection/a3', 1000, { key: 'a3' });
      const docB1 = doc('collection/b1', 1000, { key: 'b1' });
      const docB2 = doc('collection/b2', 1000, { key: 'b2' });
      const docB3 = doc('collection/b3', 1000, { key: 'b3' });
      const docA1Query = newQueryForPath(docA1.key.path);
      const docA2Query = newQueryForPath(docA2.key.path);
      const docA3Query = newQueryForPath(docA3.key.path);

      // Verify that limbo resolution throttling works correctly with existence
      // filter mismatches. This test exercises the steps that resulted in
      // unbounded reads that motivated throttling:
      // https://github.com/firebase/firebase-js-sdk/issues/2683
      return (
        spec()
          .withMaxConcurrentLimboResolutions(2)
          .userListens(query1)
          .watchAcks(query1)
          .watchSends({ affects: [query1] }, docA1, docA2, docA3)
          .watchCurrents(query1, 'resume-token-1000')
          .watchSnapshots(1000)
          .expectEvents(query1, { added: [docA1, docA2, docA3] })
          // Simulate that the client loses network connection.
          .disableNetwork()
          // Limbo document causes query to be "inconsistent"
          .expectEvents(query1, { fromCache: true })
          .enableNetwork()
          .restoreListen(query1, 'resume-token-1000')
          .watchAcks(query1)
          // While this client was disconnected, another client deleted all the
          // docAs replaced them with docBs. If Watch has to re-run the
          // underlying query when this client re-listens, Watch won't be able
          // to tell that docAs were deleted and will only send us existing
          // documents that changed since the resume token. This will cause it
          // to just send the docBs with an existence filter with a count of 3.
          .watchSends({ affects: [query1] }, docB1, docB2, docB3)
          .watchFilters([query1], docB1.key, docB2.key, docB3.key)
          .watchSnapshots(1001)
          .expectEvents(query1, {
            added: [docB1, docB2, docB3],
            fromCache: true
          })
          // The view now contains the docAs and the docBs (6 documents), but
          // the existence filter indicated only 3 should match. This causes
          // the client to re-listen without a resume token.
          .expectActiveTargets({ query: query1, resumeToken: '' })
          // When the existence filter mismatch was detected, the client removed
          // then re-added the target. Watch needs to acknowledge the removal.
          .watchRemoves(query1)
          .watchAcksFull(query1, 1002, docB1, docB2, docB3)
          // The docAs are now in limbo; the client begins limbo resolution.
          .expectLimboDocs(docA1.key, docA2.key)
          .expectEnqueuedLimboDocs(docA3.key)
          .watchAcks(docA1Query)
          .watchAcks(docA2Query)
          .watchCurrents(docA1Query, 'resume-token-1003')
          .watchCurrents(docA2Query, 'resume-token-1003')
          .watchSnapshots(1003)
          .expectEvents(query1, { removed: [docA1, docA2], fromCache: true })
          .expectLimboDocs(docA3.key)
          .expectEnqueuedLimboDocs()
          .watchAcks(docA3Query)
          .watchCurrents(docA3Query, 'resume-token-1004')
          .watchSnapshots(1004)
          .expectEvents(query1, { removed: [docA3] })
          .expectLimboDocs()
          .expectEnqueuedLimboDocs()
      );
    }
  );
});
