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
import { Code } from '../../../src/util/error';
import { doc, path } from '../../util/helpers';

import { TimerId } from '../../../src/util/async_queue';
import { describeSpec, specTest } from './describe_spec';
import { spec } from './spec_builder';

describeSpec('Offline:', [], () => {
  specTest('Empty queries are resolved if client goes offline', [], () => {
    const query = Query.atPath(path('collection'));
    return (
      spec()
        .userListens(query)
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
        // second error triggers offline state
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
    ['eager-gc'],
    'Marked as no-lru because when a listen is re-added, it gets a new target id rather than ' +
      'reusing one',
    () => {
      const query = Query.atPath(path('collection'));
      return (
        spec()
          .userListens(query)
          // error triggers offline state
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
          // Suppose sometime later we listen again, it should take one failure
          // before we get cached data.
          .userListens(query)
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
        // second error triggers offline state and fromCache: true
        .watchStreamCloses(Code.UNAVAILABLE)
        .expectEvents(query, { fromCache: true })
        // Going online and getting a CURRENT message triggers fromCache: false
        .watchAcksFull(query, 1000)
        .expectEvents(query, { fromCache: false })
    );
  });

  specTest('Queries with limbo documents handle going offline.', [], () => {
    const query = Query.atPath(path('collection'));
    const docA = doc('collection/a', 1000, { key: 'a' });
    const limboQuery = Query.atPath(docA.key.path);
    return (
      spec()
        .userListens(query)
        .watchAcksFull(query, 1000, docA)
        .expectEvents(query, { added: [docA] })
        .watchResets(query)
        // No more documents
        .watchCurrents(query, 'resume-token-1001')
        .watchSnapshots(1001)
        // docA will now be in limbo (triggering fromCache=true)
        .expectLimboDocs(docA.key)
        .expectEvents(query, { fromCache: true })
        // first error triggers unknown state
        .watchStreamCloses(Code.UNAVAILABLE)
        .restoreListen(query, 'resume-token-1001')
        // second error triggers offline state.
        .watchStreamCloses(Code.UNAVAILABLE)
        .watchAcksFull(query, 1001)
        .watchAcksFull(limboQuery, 1001)
        // Limbo document is resolved. No longer from cache.
        .expectEvents(query, { removed: [docA], fromCache: false })
        .expectLimboDocs()
    );
  });

  specTest('OnlineState timeout triggers offline behavior', [], () => {
    const query = Query.atPath(path('collection'));
    const docA = doc('collection/a', 1000, { key: 'a' });
    return (
      spec()
        .userListens(query)

        // OnlineState timer should trigger offline behavior (fromCache=true).
        .runTimer(TimerId.OnlineStateTimeout)
        .expectEvents(query, {
          fromCache: true
        })

        // We should get no further events for failed connection attempts.
        .watchStreamCloses(Code.UNAVAILABLE)
        .watchStreamCloses(Code.UNAVAILABLE)

        // We should get events after a successful connection.
        .watchAcksFull(query, 1000, docA)
        .expectEvents(query, { added: [docA], fromCache: false })

        // Running timers should have no effect now.
        .runTimer(TimerId.All)

        // After a disconnect, the timer should become active again.
        .watchStreamCloses(Code.UNAVAILABLE)
        .restoreListen(query, 'resume-token-1000')
        .runTimer(TimerId.OnlineStateTimeout)
        .expectEvents(query, {
          fromCache: true
        })
    );
  });

  specTest(
    'New queries return immediately with fromCache=true when offline due to ' +
      'stream failures.',
    [],
    () => {
      const query1 = Query.atPath(path('collection'));
      const query2 = Query.atPath(path('collection2'));
      return (
        spec()
          .userListens(query1)
          // After failure, we mark the client offline and trigger an empty
          // fromCache event.
          .watchStreamCloses(Code.UNAVAILABLE)
          .expectEvents(query1, { fromCache: true })

          // A new query should immediately return from cache.
          .userListens(query2)
          .expectEvents(query2, { fromCache: true })
      );
    }
  );

  specTest(
    'New queries return immediately with fromCache=true when offline due to ' +
      'OnlineState timeout.',
    [],
    () => {
      const query1 = Query.atPath(path('collection'));
      const query2 = Query.atPath(path('collection2'));
      return (
        spec()
          .userListens(query1)
          .runTimer(TimerId.OnlineStateTimeout)
          .expectEvents(query1, { fromCache: true })

          // A new query should immediately return from cache.
          .userListens(query2)
          .expectEvents(query2, { fromCache: true })
      );
    }
  );

  // TODO(b/114055812): This shouldn't really need to be marked eager-gc
  specTest(
    'Queries return from cache when network disabled',
    ['eager-gc'],
    () => {
      const query = Query.atPath(path('collection'));
      return (
        spec()
          .disableNetwork()
          .userListens(query)
          .expectEvents(query, { fromCache: true })
          .userUnlistens(query)

          // There was once a bug where removing the last listener accidentally
          // reverted us to OnlineState.Unknown, so make sure it works a second time
          .userListens(query)
          .expectEvents(query, { fromCache: true })
          .userUnlistens(query)
      );
    }
  );
});
