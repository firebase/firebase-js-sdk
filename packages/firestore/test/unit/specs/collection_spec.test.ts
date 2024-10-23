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

import {doc, filter, query} from '../../util/helpers';

import { describeSpec, specTest } from './describe_spec';
import { spec } from './spec_builder';
import {newQueryForPath} from "../../../src/core/query";

describeSpec('Collections:', [], () => {

  specTest('8474', ['exclusive', 'durable-persistence'], () => {

    // onSnapshot(fullQuery)
    const fullQuery = query('collection');

    // getDocs(filterQuery)
    const filterQuery = query('collection', filter('included', '==', true));

    const docA = doc('collection/a', 1000, {key: 'a', included: false});
    const docA2 = doc('collection/a', 1007, {key: 'a', included: true});
    const docC = doc('collection/c', 1002, {key: 'c', included: true});

    const limboQueryC = newQueryForPath(docC.key.path);

    return spec()
      // onSnapshot(fullQuery) - fullQuery is listening to documents in the collection for the full test
      .userListens(fullQuery)
      .watchAcksFull(fullQuery, 1001, docA, docC)
      .expectEvents(fullQuery, {
        fromCache: false,
        added: [docA, docC]
      })

      // docC was deleted, this puts docC in limbo and causes a snapshot from cache (metadata-only change)
      .watchSends({removed: [fullQuery]}, docC)
      .watchCurrents(fullQuery, 'resume-token-1002')
      .watchSnapshots(1002)
      .expectLimboDocs(docC.key)
      .expectEvents(fullQuery, {
        fromCache: true,
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
      .watchSends({affects: [limboQueryC]})
      .watchCurrents(limboQueryC, 'resume-token-1009')
      .watchSnapshots(1009, [limboQueryC, fullQuery])

      // However, docC is still in limbo because there has not been a global snapshot
      .expectLimboDocs(docC.key)

      // Rapid events of document update and delete caused by application
      .watchSends({removed: [filterQuery]}, docA)
      .watchCurrents(filterQuery, 'resume-token-1004')
      .watchSends({affects: [filterQuery]}, docC)
      .watchCurrents(filterQuery, 'resume-token-1005')
      .watchSends({removed: [filterQuery]}, docC)
      .watchSends({affects: [filterQuery]}, docA2)
      .watchCurrents(filterQuery, 'resume-token-1007')

      .watchSnapshots(1010, [fullQuery, limboQueryC])

      // All changes are current and we get a global snapshot
      .watchSnapshots(1010, [])

      // UNEXPECTED docC is still in limbo
      .expectLimboDocs(docC.key)

      // This causes snapshots for fullQuery and filterQuery
      // to be raised as from cache
      .expectEvents(fullQuery, {
        fromCache: true,
        modified: [docA2]
      })

      // getDocs(filterQuery) will not be resolved with this snapsho
      // because it is from cache
      .expectEvents(filterQuery, {
        fromCache: true,
        added: [docA2]
      })

      // 45-seconds later on heartbeat/global-snapshot
      .watchSnapshots(1100, [])
      // Now docC is out of limbo
      .expectLimboDocs()
      .expectEvents(fullQuery, {
        fromCache: false,
        removed: [docC]
      })
      // Now getDocs(filterQuery) can be resolved
      .expectEvents(filterQuery, {
        fromCache: false,
        removed: [docC]
      });
  });

  specTest('Events are raised after watch ack', [], () => {
    const query1 = query('collection');
    const doc1 = doc('collection/key', 1000, { foo: 'bar' });
    return spec()
      .userListens(query1)
      .watchAcksFull(query1, 1001, doc1)
      .expectEvents(query1, {
        added: [doc1]
      });
  });

  specTest('Events are raised for local sets before watch ack', [], () => {
    const query1 = query('collection');
    const doc1 = doc('collection/key', 0, {
      foo: 'bar'
    }).setHasLocalMutations();
    return spec()
      .userListens(query1)
      .userSets('collection/key', { foo: 'bar' })
      .expectEvents(query1, {
        hasPendingWrites: true,
        fromCache: true,
        added: [doc1]
      });
  });
});
