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
import { Query } from '../../../src/core/query';
import { Code } from '../../../src/util/error';
import { doc, path } from '../../util/helpers';

import { describeSpec, specTest } from './describe_spec';
import { spec } from './spec_builder';

describeSpec('Offline:', [], () => {
  specTest('Empty queries are resolved if client goes offline', [], () => {
    const query = Query.atPath(path('collection'));
    return (
      spec()
        .userListens(query)
        // second error triggers event
        .watchStreamCloses(Code.UNAVAILABLE)
        .watchStreamCloses(Code.UNAVAILABLE)
        .expectEvents(query, {
          fromCache: true,
          hasPendingWrites: false
        })
        // no further events
        .watchStreamCloses(Code.UNAVAILABLE)
        .watchStreamCloses(Code.UNAVAILABLE)
    );
  });

  specTest('A successful message delays offline status', [], () => {
    const query = Query.atPath(path('collection'));
    return (
      spec()
        .userListens(query)
        .watchAcks(query)
        // first error triggers unknown state
        .watchStreamCloses(Code.UNAVAILABLE)
        // getting two more errors triggers offline state
        .watchStreamCloses(Code.UNAVAILABLE)
        .watchStreamCloses(Code.UNAVAILABLE)
        .expectEvents(query, {
          fromCache: true,
          hasPendingWrites: false
        })
        // no further events
        .watchStreamCloses(Code.UNAVAILABLE)
        .watchStreamCloses(Code.UNAVAILABLE)
    );
  });

  specTest(
    'Removing all listeners delays "Offline" status on next listen',
    [],
    () => {
      const query = Query.atPath(path('collection'));
      return (
        spec()
          .userListens(query)
          // getting two errors triggers offline state
          .watchStreamCloses(Code.UNAVAILABLE)
          .watchStreamCloses(Code.UNAVAILABLE)
          .expectEvents(query, {
            fromCache: true,
            hasPendingWrites: false
          })
          // Remove listen.
          .userUnlistens(query)
          // If the next (already scheduled) connection attempt fails, we'll move
          // to unknown since there are no listeners, and stop trying to connect.
          .watchStreamCloses(Code.UNAVAILABLE)
          // Suppose sometime later we listen again, it should take two failures
          // before we get cached data.
          .userListens(query)
          .watchStreamCloses(Code.UNAVAILABLE)
          .watchStreamCloses(Code.UNAVAILABLE)
          .expectEvents(query, {
            fromCache: true,
            hasPendingWrites: false
          })
      );
    }
  );

  specTest('Queries revert to fromCache=true when offline.', [], () => {
    const query = Query.atPath(path('collection'));
    const docA = doc('collection/a', 1000, { key: 'a' });
    return (
      spec()
        .userListens(query)
        .watchAcksFull(query, 1000, docA)
        .expectEvents(query, { added: [docA] })
        // first error triggers unknown state
        .watchStreamCloses(Code.UNAVAILABLE)
        .restoreListen(query, 'resume-token-1000')
        // getting two more errors triggers offline state and fromCache: true
        .watchStreamCloses(Code.UNAVAILABLE)
        .watchStreamCloses(Code.UNAVAILABLE)
        .expectEvents(query, { fromCache: true })
        // Going online and getting a CURRENT message triggers fromCache: false
        .watchAcksFull(query, 1000)
        .expectEvents(query, { fromCache: false })
    );
  });
});
