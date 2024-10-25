/**
 * @license
 * Copyright 2024 Google LLC
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
import { doc, filter, query } from '../../util/helpers';

import { describeSpec, specTest } from './describe_spec';
import { spec } from './spec_builder';

describeSpec('Global snapshot with multiple document updates:', [], () => {
  specTest(
    'Fix #8474 - Limbo resolution for document is removed even if document updates for the document occurred before documentDelete in the global snapshot window',
    [],
    () => {
      // onSnapshot(fullQuery)
      const fullQuery = query('collection');

      // getDocs(filterQuery)
      const filterQuery = query('collection', filter('included', '==', true));

      const docA = doc('collection/a', 1000, { key: 'a', included: false });
      const docA2 = doc('collection/a', 1007, { key: 'a', included: true });
      const docC = doc('collection/c', 1002, { key: 'c', included: true });

      const limboQueryC = newQueryForPath(docC.key.path);

      return (
        spec()
          // onSnapshot(fullQuery) - fullQuery is listening to documents in the collection for the full test
          .userListens(fullQuery)
          .watchAcksFull(fullQuery, 1001, docA, docC)
          .expectEvents(fullQuery, {
            fromCache: false,
            added: [docA, docC]
          })

          // docC was deleted, this puts docC in limbo and causes a snapshot from cache (metadata-only change)
          .watchRemovesDoc(docC.key, fullQuery)
          .watchCurrents(fullQuery, 'resume-token-1002')
          .watchSnapshots(1002)
          .expectLimboDocs(docC.key)
          .expectEvents(fullQuery, {
            fromCache: true
          })

          // User begins getDocs(filterQuery)
          .userListensForGet(filterQuery)

          // getDocs(filterQuery) will not resolve on the snapshot from cache
          .expectEvents(filterQuery, {
            fromCache: true,
            added: [docC]
          })

          // Watch acks limbo and filter queries
          .watchAcks(limboQueryC)
          .watchAcks(filterQuery)

          // Watch responds to limboQueryC - docC was deleted
          .watchDeletesDoc(docC.key, 1009, limboQueryC)
          .watchCurrents(limboQueryC, 'resume-token-1009')
          .watchSnapshots(1009, [limboQueryC, fullQuery])

          // However, docC is still in limbo because there has not been a global snapshot
          .expectLimboDocs(docC.key)

          // Rapid events of document update and delete caused by application
          .watchRemovesDoc(docA.key, filterQuery)
          .watchCurrents(filterQuery, 'resume-token-1004')
          .watchSends({ affects: [filterQuery] }, docC)
          .watchCurrents(filterQuery, 'resume-token-1005')
          .watchRemovesDoc(docC.key, filterQuery)
          .watchSends({ affects: [filterQuery] }, docA2)
          .watchCurrents(filterQuery, 'resume-token-1007')

          .watchSnapshots(1010, [fullQuery, limboQueryC])

          // All changes are current and we get a global snapshot
          .watchSnapshots(1010, [])

          // Now docC is out of limbo
          .expectLimboDocs()
          .expectEvents(fullQuery, {
            fromCache: false,
            modified: [docA2],
            removed: [docC]
          })
          // Now getDocs(filterQuery) can be resolved
          .expectEvents(filterQuery, {
            fromCache: false,
            removed: [docC],
            added: [docA2]
          })

          // No more expected events
          .watchSnapshots(1100, [])
      );
    }
  );

  specTest(
    'Fix #8474 - Limbo resolution for document is removed even if document updates for the document occurred in the global snapshot window and no document delete was received for the limbo resolution query',
    [],
    () => {
      // onSnapshot(fullQuery)
      const fullQuery = query('collection');

      // getDocs(filterQuery)
      const filterQuery = query('collection', filter('included', '==', true));

      const docA = doc('collection/a', 1000, { key: 'a', included: false });
      const docA2 = doc('collection/a', 1007, { key: 'a', included: true });
      const docC = doc('collection/c', 1002, { key: 'c', included: true });

      const limboQueryC = newQueryForPath(docC.key.path);

      return (
        spec()
          // onSnapshot(fullQuery) - fullQuery is listening to documents in the collection for the full test
          .userListens(fullQuery)
          .watchAcksFull(fullQuery, 1001, docA, docC)
          .expectEvents(fullQuery, {
            fromCache: false,
            added: [docA, docC]
          })

          // docC was deleted, this puts docC in limbo and causes a snapshot from cache (metadata-only change)
          .watchRemovesDoc(docC.key, fullQuery)
          .watchCurrents(fullQuery, 'resume-token-1002')
          .watchSnapshots(1002)
          .expectLimboDocs(docC.key)
          .expectEvents(fullQuery, {
            fromCache: true
          })

          // User begins getDocs(filterQuery)
          .userListensForGet(filterQuery)

          // getDocs(filterQuery) will not resolve on the snapshot from cache
          .expectEvents(filterQuery, {
            fromCache: true,
            added: [docC]
          })

          // Watch acks limbo and filter queries
          .watchAcks(limboQueryC)
          .watchAcks(filterQuery)

          // Watch currents the limbo query, but did not send a document delete.
          // This is and unexpected code path, but something that is called
          // out as possible in the watch change aggregator.
          .watchCurrents(limboQueryC, 'resume-token-1009')
          .watchSnapshots(1009, [limboQueryC, fullQuery])

          // However, docC is still in limbo because there has not been a global snapshot
          .expectLimboDocs(docC.key)

          // Rapid events of document update and delete caused by application
          .watchRemovesDoc(docA.key, filterQuery)
          .watchCurrents(filterQuery, 'resume-token-1004')
          .watchSends({ affects: [filterQuery] }, docC)
          .watchCurrents(filterQuery, 'resume-token-1005')
          .watchRemovesDoc(docC.key, filterQuery)
          .watchSends({ affects: [filterQuery] }, docA2)
          .watchCurrents(filterQuery, 'resume-token-1007')

          .watchSnapshots(1010, [fullQuery, limboQueryC])

          // All changes are current and we get a global snapshot
          .watchSnapshots(1010, [])

          // Now docC is out of limbo
          .expectLimboDocs()
          .expectEvents(fullQuery, {
            fromCache: false,
            modified: [docA2],
            removed: [docC]
          })
          // Now getDocs(filterQuery) can be resolved
          .expectEvents(filterQuery, {
            fromCache: false,
            removed: [docC],
            added: [docA2]
          })

          // No more expected events
          .watchSnapshots(1100, [])
      );
    }
  );

  specTest(
    'Fix #8474 - Handles code path of no ack for limbo resolution query before global snapshot',
    [],
    () => {
      // onSnapshot(fullQuery)
      const fullQuery = query('collection');

      // getDocs(filterQuery)
      const filterQuery = query('collection', filter('included', '==', true));

      const docA = doc('collection/a', 1000, { key: 'a', included: false });
      const docA2 = doc('collection/a', 1007, { key: 'a', included: true });
      const docC = doc('collection/c', 1002, { key: 'c', included: true });

      const limboQueryC = newQueryForPath(docC.key.path);

      return (
        spec()
          // onSnapshot(fullQuery) - fullQuery is listening to documents in the collection for the full test
          .userListens(fullQuery)
          .watchAcksFull(fullQuery, 1001, docA, docC)
          .expectEvents(fullQuery, {
            fromCache: false,
            added: [docA, docC]
          })

          // docC was deleted, this puts docC in limbo and causes a snapshot from cache (metadata-only change)
          .watchRemovesDoc(docC.key, fullQuery)
          .watchCurrents(fullQuery, 'resume-token-1002')
          .watchSnapshots(1002)
          .expectLimboDocs(docC.key)
          .expectEvents(fullQuery, {
            fromCache: true
          })

          // User begins getDocs(filterQuery)
          .userListensForGet(filterQuery)

          // getDocs(filterQuery) will not resolve on the snapshot from cache
          .expectEvents(filterQuery, {
            fromCache: true,
            added: [docC]
          })

          // Watch filter query
          .watchAcks(filterQuery)

          // However, docC is still in limbo because there has not been a global snapshot
          .expectLimboDocs(docC.key)

          // Rapid events of document update and delete caused by application
          .watchRemovesDoc(docA.key, filterQuery)
          .watchCurrents(filterQuery, 'resume-token-1004')
          .watchSends({ affects: [filterQuery] }, docC)
          .watchCurrents(filterQuery, 'resume-token-1005')
          .watchRemovesDoc(docC.key, filterQuery)
          .watchSends({ affects: [filterQuery] }, docA2)
          .watchCurrents(filterQuery, 'resume-token-1007')

          .watchSnapshots(1010, [fullQuery, limboQueryC])

          // All changes are current and we get a global snapshot
          .watchSnapshots(1010, [])

          .expectEvents(fullQuery, {
            fromCache: true,
            modified: [docA2]
          })
          // Now getDocs(filterQuery) can be resolved
          .expectEvents(filterQuery, {
            fromCache: true,
            added: [docA2]
          })

          // Watch acks limbo query
          .watchAcks(limboQueryC)

          // Watch responds to limboQueryC - docC was deleted
          .watchDeletesDoc(docC.key, 1009, limboQueryC)
          .watchCurrents(limboQueryC, 'resume-token-1009')
          .watchSnapshots(1100, [limboQueryC])

          // No more expected events
          .watchSnapshots(1101, [])

          .expectLimboDocs()
          .expectEvents(fullQuery, {
            fromCache: false,
            removed: [docC]
          })
          // Now getDocs(filterQuery) can be resolved
          .expectEvents(filterQuery, {
            fromCache: false,
            removed: [docC]
          })
      );
    }
  );

  specTest(
    'A document that is updated and removed from a target in a single global snapshot raises expected snapshots',
    [],
    () => {
      // onSnapshot(fullQuery)
      const fullQuery = query('collection');

      const docA = doc('collection/a', 1000, { key: 'a', value: 1 });
      const docA2 = doc('collection/a', 1004, { key: 'a', value: 2 });

      return (
        spec()
          // onSnapshot(fullQuery) - fullQuery is listening to documents in the collection for the full test
          .userListens(fullQuery)
          .watchAcksFull(fullQuery, 1001, docA)
          .expectEvents(fullQuery, {
            fromCache: false,
            added: [docA]
          })

          // Multiple document updates for docA within one global snapshot
          .watchSends({ affects: [fullQuery] }, docA2)
          .watchCurrents(fullQuery, 'resume-token-1004')
          .watchRemovesDoc(docA.key, fullQuery)
          .watchCurrents(fullQuery, 'resume-token-1005')

          .watchSnapshots(1005, [fullQuery])

          // All changes are current and we get a global snapshot
          .watchSnapshots(1010, [])

          // The snapshot will occur with docA2, and marked as from cache.
          .expectEvents(fullQuery, {
            fromCache: true,
            modified: [docA2]
          })

          // Doc A will be marked as in limbo, which will immediately
          // initiate limbo resolution and raise a new snapshot without
          // doc A.
          .expectLimboDocs(docA.key)
      );
    }
  );

  // Multiple queries do not guarantee the order of responses received from
  // watch. This test ensures the most performant behavior regardless of the
  // order that query results are received. Previous versions of the SDK could
  // overwrite newer versions of a doc with a more recently received version
  // that contains with a lower version number. This would issue another limbo
  // resolution.
  specTest(
    'Multiple queries receiving watch updates in different orders will not overwrite newer version of document already received',
    ['exclusive'],
    () => {
      const fullQuery = query('collection');
      const filterQuery = query('collection', filter('value', '<', 3));

      const fullQueryX = query('collectionX');
      const filterQueryX = query('collectionX', filter('value', '<', 3));

      const docA1 = doc('collection/a', 1000, { key: 'a', value: 1 });
      const docA2 = doc('collection/a', 1004, { key: 'a', value: 2 });
      const docA3 = doc('collection/a', 1005, { key: 'a', value: 3 });

      const docX1 = doc('collectionX/x', 1100, { key: 'x', value: 1 });
      const docX2 = doc('collectionX/x', 1104, { key: 'x', value: 2 });
      const docX3 = doc('collectionX/x', 1105, { key: 'x', value: 3 });

      return (
        spec()
          // PART 1: Responses are received for fullQuery before filterQuery

          // onSnapshot(fullQuery) - fullQuery is listening to documents in collection
          .userListens(fullQuery)
          .watchAcksFull(fullQuery, 1001, docA1)
          .expectEvents(fullQuery, {
            fromCache: false,
            added: [docA1]
          })

          // onSnapshot(filterQuery) - filterQuery is listening to documents in collection
          .userListens(filterQuery)
          .expectEvents(filterQuery, {
            fromCache: true,
            added: [docA1]
          })
          .watchAcksFull(filterQuery, 1001, docA1)
          .expectEvents(filterQuery, {
            fromCache: false
          })

          .watchSends({ affects: [fullQuery] }, docA2)
          .watchCurrents(fullQuery, 'resume-token-1004')
          .watchSends({ affects: [fullQuery] }, docA3)
          .watchCurrents(fullQuery, 'resume-token-1005')
          .watchSnapshots(1005, [fullQuery])

          .watchSends({ affects: [filterQuery] }, docA2)
          .watchCurrents(filterQuery, 'resume-token-1004')
          .watchRemovesDoc(docA1.key, filterQuery)
          .watchCurrents(filterQuery, 'resume-token-1005')
          .watchSnapshots(1009, [filterQuery])

          // All changes are current and we get a global snapshot
          .watchSnapshots(1010, [])

          .expectEvents(fullQuery, {
            fromCache: false,
            modified: [docA3]
          })
          .expectEvents(filterQuery, {
            fromCache: false,
            removed: [docA1]
          })
          .expectLimboDocs()

          // PART 2: Responses are received for filterQuery before fullQuery

          // onSnapshot(fullQueryX) - fullQueryX is listening to documents in collectionX
          .userListens(fullQueryX)
          .watchAcksFull(fullQueryX, 1101, docX1)
          .expectEvents(fullQueryX, {
            fromCache: false,
            added: [docX1]
          })

          // onSnapshot(filterQueryX) - filterQueryX is listening to documents in collectionX
          .userListens(filterQueryX)
          .expectEvents(filterQueryX, {
            fromCache: true,
            added: [docX1]
          })
          .watchAcksFull(filterQueryX, 1101, docX1)
          .expectEvents(filterQueryX, {
            fromCache: false
          })
          .watchSends({ affects: [filterQueryX] }, docX2)
          .watchCurrents(filterQueryX, 'resume-token-1104')
          .watchRemovesDoc(docX1.key, filterQueryX)
          .watchCurrents(filterQueryX, 'resume-token-1105')
          .watchSnapshots(1105, [filterQueryX])

          .watchSends({ affects: [fullQueryX] }, docX2)
          .watchCurrents(fullQueryX, 'resume-token-1104')
          .watchSends({ affects: [fullQueryX] }, docX3)
          .watchCurrents(fullQueryX, 'resume-token-1105')
          .watchSnapshots(1109, [filterQueryX])

          // All changes are current and we get a global snapshot
          .watchSnapshots(1110, [])

          .expectLimboDocs()
          .expectEvents(fullQueryX, {
            fromCache: false,
            modified: [docX3]
          })
          .expectEvents(filterQueryX, {
            fromCache: false,
            removed: [docX1]
          })
      );
    }
  );
});
