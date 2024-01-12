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

import { LimitType, queryWithLimit } from '../../../src/core/query';
import { TimerId } from '../../../src/util/async_queue';
import { Code } from '../../../src/util/error';
import { deletedDoc, doc, filter, orderBy, query } from '../../util/helpers';

import { describeSpec, specTest } from './describe_spec';
import { client, spec } from './spec_builder';
import { RpcError } from './spec_rpc_error';

describeSpec('Listens source options:', [], () => {
  // Obviously this test won't hold with offline persistence enabled.
  specTest(
    'Contents of query are cleared when listen is removed.',
    ['eager-gc'],
    'Explicitly tests eager GC behavior',
    () => {
      const query_ = query('collection');
      const docA = doc('collection/a', 0, { key: 'a' }).setHasLocalMutations();
      return (
        spec()
          .userSets('collection/a', { key: 'a' })
          .userListensToCache(query_)
          .expectEvents(query_, {
            added: [docA],
            hasPendingWrites: true,
            fromCache: true
          })
          .userUnlistensToCache(query_)
          .writeAcks('collection/a', 1000)
          // Cache is empty as docA is GCed.
          .userListensToCache(query_)
          .expectEvents(query_, { added: [], fromCache: true })
      );
    }
  );

  specTest(
    'Documents are cleared when listen is removed.',
    ['eager-gc'],
    '',
    () => {
      const filteredQuery = query('collection', filter('matches', '==', true));
      const unfilteredQuery = query('collection');
      const docA = doc('collection/a', 0, {
        matches: true
      }).setHasLocalMutations();
      const docB = doc('collection/b', 0, {
        matches: true
      }).setHasLocalMutations();
      return (
        spec()
          .userSets('collection/a', { matches: true })
          .userSets('collection/b', { matches: true })
          .userListensToCache(filteredQuery)
          .expectEvents(filteredQuery, {
            added: [docA, docB],
            hasPendingWrites: true,
            fromCache: true
          })
          .writeAcks('collection/a', 1000)
          .writeAcks('collection/b', 2000)
          .userSets('collection/b', { matches: false })
          // DocB doesn't match because of a pending mutation
          .expectEvents(filteredQuery, {
            removed: [docB],
            hasPendingWrites: true,
            fromCache: true
          })
          .userUnlistensToCache(filteredQuery)
          .writeAcks('collection/b', 3000)
          // Should get no events since documents were GCed
          .userListensToCache(unfilteredQuery)
          .expectEvents(unfilteredQuery, { added: [], fromCache: true })
          .userUnlistensToCache(unfilteredQuery)
      );
    }
  );

  specTest("Doesn't include unknown documents in cached result", [], () => {
    const query_ = query('collection');
    const existingDoc = doc('collection/exists', 0, {
      key: 'a'
    }).setHasLocalMutations();
    return spec()
      .userSets('collection/exists', { key: 'a' })
      .userPatches('collection/unknown', { key: 'b' })
      .userListensToCache(query_)
      .expectEvents(query_, {
        added: [existingDoc],
        fromCache: true,
        hasPendingWrites: true
      });
  });

  specTest("Doesn't raise 'hasPendingWrites' for deletes", [], () => {
    const query_ = query('collection');
    const docA = doc('collection/a', 1000, { key: 'a' });

    return (
      spec()
        .ensureManualLruGC()

        // Populate the cache first
        .userListens(query_)
        .watchAcksFull(query_, 1000, docA)
        .expectEvents(query_, { added: [docA] })
        .userUnlistens(query_)
        .watchRemoves(query_)

        .userListensToCache(query_)
        .expectEvents(query_, { added: [docA], fromCache: true })
        .userDeletes('collection/a')
        .expectEvents(query_, { removed: [docA], fromCache: true })
        .writeAcks('collection/a', 2000)
        .watchSends({ affects: [query_] }, deletedDoc('collection/a', 2000))
        .watchSnapshots(2000)
    );
  });

  specTest('Query is executed by primary client', ['multi-client'], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { key: 'a' });

    return client(0)
      .becomeVisible()
      .client(1)
      .userListens(query1)
      .client(0)
      .expectListen(query1)
      .watchAcks(query1)
      .watchSends({ affects: [query1] }, docA)
      .watchSnapshots(1000)
      .client(1)
      .expectEvents(query1, { added: [docA], fromCache: true })
      .client(0)
      .watchCurrents(query1, 'resume-token-2000')
      .watchSnapshots(2000)
      .client(1)
      .expectEvents(query1, { fromCache: false });
  });

  specTest(
    'Query is shared between primary and secondary client',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docB = doc('collection/b', 2000, { key: 'a' });

      return client(0)
        .becomeVisible()
        .userListens(query1)
        .watchAcksFull(query1, 1000, docA)
        .expectEvents(query1, { added: [docA] })
        .client(1)
        .userListens(query1)
        .expectEvents(query1, { added: [docA] })
        .client(2)
        .userListens(query1)
        .expectEvents(query1, { added: [docA] })
        .client(0)
        .watchSends({ affects: [query1] }, docB)
        .watchSnapshots(2000)
        .expectEvents(query1, { added: [docB] })
        .client(1)
        .expectEvents(query1, { added: [docB] })
        .client(2)
        .expectEvents(query1, { added: [docB] });
    }
  );

  specTest('Query is joined by primary client', ['multi-client'], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'b' });
    const docC = doc('collection/c', 3000, { key: 'c' });

    return client(0)
      .expectPrimaryState(true)
      .client(1)
      .userListens(query1)
      .client(0)
      .expectListen(query1)
      .watchAcksFull(query1, 100, docA)
      .client(1)
      .expectEvents(query1, { added: [docA] })
      .client(0)
      .watchSends({ affects: [query1] }, docB)
      .watchSnapshots(2000)
      .userListens(query1)
      .expectEvents(query1, { added: [docA, docB] })
      .watchSends({ affects: [query1] }, docC)
      .watchSnapshots(3000)
      .expectEvents(query1, { added: [docC] })
      .client(1)
      .expectEvents(query1, { added: [docB] })
      .expectEvents(query1, { added: [docC] });
  });

  specTest(
    'Query only raises events in participating clients',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });

      return client(0)
        .becomeVisible()
        .client(1)
        .client(2)
        .userListens(query1)
        .client(3)
        .userListens(query1)
        .client(0) // No events
        .expectListen(query1)
        .watchAcksFull(query1, 1000, docA)
        .client(1) // No events
        .client(2)
        .expectEvents(query1, { added: [docA] })
        .client(3)
        .expectEvents(query1, { added: [docA] });
    }
  );

  specTest('Query is unlistened to by primary client', ['multi-client'], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'a' });

    return client(0)
      .becomeVisible()
      .userListens(query1)
      .watchAcksFull(query1, 1000, docA)
      .expectEvents(query1, { added: [docA] })
      .client(1)
      .userListens(query1)
      .expectEvents(query1, { added: [docA] })
      .client(0)
      .userUnlistens(query1)
      .expectListen(query1)
      .watchSends({ affects: [query1] }, docB)
      .watchSnapshots(2000)
      .client(1)
      .expectEvents(query1, { added: [docB] })
      .userUnlistens(query1)
      .client(0)
      .expectUnlisten(query1);
  });

  specTest('Query is resumed by secondary client', ['multi-client'], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'a' });

    return client(0)
      .becomeVisible()
      .client(1)
      .userListens(query1)
      .client(0)
      .expectListen(query1)
      .watchAcksFull(query1, 1000, docA)
      .client(1)
      .expectEvents(query1, { added: [docA] })
      .userUnlistens(query1)
      .client(0)
      .expectUnlisten(query1)
      .watchRemoves(query1)
      .client(1)
      .userListens(query1)
      .expectEvents(query1, { added: [docA], fromCache: true })
      .client(0)
      .expectListen(query1, { resumeToken: 'resume-token-1000' })
      .watchAcksFull(query1, 2000, docB)
      .client(1)
      .expectEvents(query1, { added: [docB] });
  });

  specTest('Query is rejected by primary client', ['multi-client'], () => {
    const query1 = query('collection');

    return client(0)
      .becomeVisible()
      .client(1)
      .userListens(query1)
      .client(0)
      .expectListen(query1)
      .watchRemoves(
        query1,
        new RpcError(Code.RESOURCE_EXHAUSTED, 'Resource exhausted')
      )
      .client(1)
      .expectEvents(query1, { errorCode: Code.RESOURCE_EXHAUSTED });
  });

  specTest(
    'Query is rejected and re-listened to by secondary client',
    ['multi-client'],
    () => {
      const query1 = query('collection');

      return client(0)
        .becomeVisible()
        .client(1)
        .userListens(query1)
        .client(0)
        .expectListen(query1)
        .watchRemoves(
          query1,
          new RpcError(Code.RESOURCE_EXHAUSTED, 'Resource exhausted')
        )
        .client(1)
        .expectEvents(query1, { errorCode: Code.RESOURCE_EXHAUSTED })
        .userListens(query1)
        .client(0)
        .expectListen(query1)
        .watchAcksFull(query1, 1000)
        .client(1)
        .expectEvents(query1, {});
    }
  );

  // Reproduces: https://github.com/firebase/firebase-js-sdk/issues/6511
  specTest(
    'Secondary client raises latency compensated snapshot from primary mutation',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: '1' });
      const docAMutated = doc('collection/a', 1500, {
        key: '2'
      }).setHasLocalMutations();

      return (
        client(0)
          .becomeVisible()
          .expectPrimaryState(true)
          .userListens(query1)
          .watchAcksFull(query1, 1000, docA)
          .expectEvents(query1, { added: [docA] })
          .userUnlistens(query1)
          .watchRemoves(query1)
          .client(1)
          .userListens(query1)
          .expectEvents(query1, { added: [docA], fromCache: true })
          .client(0)
          .expectListen(query1, { resumeToken: 'resume-token-1000' })
          .watchAcksFull(query1, 1500, docA)
          .client(1)
          .expectEvents(query1, {})
          .client(0)
          .userSets('collection/a', { key: '2' })
          .client(1)
          // Without the fix for 6511, this would raise two snapshots, first one as expected and
          // second one travels back in time and raise the old stale document.
          .expectEvents(query1, {
            modified: [docAMutated],
            hasPendingWrites: true
          })
      );
    }
  );

  // Reproduces b/249494921.
  // TODO(b/310241864) this test puts the SDK into an invalid state that is now
  //  failing a hardAssert, so it is being ignored until it can be fixed.
  specTest(
    'Secondary client advances query state with global snapshot from primary',
    ['multi-client', 'no-web', 'no-ios', 'no-android'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: '1' });
      const docADeleted = deletedDoc('collection/a', 2000);
      const docARecreated = doc('collection/a', 2000, {
        key: '2'
      }).setHasLocalMutations();
      return (
        client(0)
          .becomeVisible()
          .expectPrimaryState(true)
          .userListens(query1)
          .watchAcksFull(query1, 1000, docA)
          .expectEvents(query1, { added: [docA] })
          .userUnlistens(query1)
          .watchRemoves(query1)
          .client(1)
          .userListens(query1)
          .expectEvents(query1, { added: [docA], fromCache: true })
          .client(0)
          .expectListen(query1, { resumeToken: 'resume-token-1000' })
          .watchAcksFull(query1, 1500, docA)
          .client(1)
          .expectEvents(query1, {})
          .client(0)
          .userDeletes('collection/a')
          .client(1)
          .expectEvents(query1, {
            removed: [docA]
          })
          .client(0)
          .writeAcks('collection/a', 2000)
          // b/310241864: This line causes an add target ack without an add
          // target request. The unexpected ack puts the SDK into a bad state
          // which now fails a hardAssert.
          .watchAcksFull(query1, 2000, docADeleted)
          .client(1) // expects no event
          .client(0)
          .userSets('collection/a', { key: '2' })
          .client(1)
          // Without the fix for b/249494921, two snapshots will be raised: a first
          // one as show below, and a second one with `docADeleted` because
          // `client(1)` failed to advance its cursor in remote document cache, and
          // read a stale document.
          .expectEvents(query1, {
            added: [docARecreated],
            hasPendingWrites: true
          })
      );
    }
  );

  specTest(
    'Mirror queries from same secondary client',
    ['multi-client'],
    () => {
      const limit = queryWithLimit(
        query('collection', orderBy('val', 'asc')),
        2,
        LimitType.First
      );
      const limitToLast = queryWithLimit(
        query('collection', orderBy('val', 'desc')),
        2,
        LimitType.Last
      );
      const docA = doc('collection/a', 1000, { val: 0 });
      const docB = doc('collection/b', 1000, { val: 1 });
      const docC = doc('collection/c', 2000, { val: 0 });

      return client(0)
        .becomeVisible()
        .client(1)
        .userListens(limit)
        .userListens(limitToLast)
        .client(0)
        .expectListen(limit)
        .expectListen(limitToLast)
        .watchAcksFull(limit, 1000, docA, docB)
        .client(1)
        .expectEvents(limit, { added: [docA, docB] })
        .expectEvents(limitToLast, { added: [docB, docA] })
        .userUnlistens(limit)
        .client(0)
        .expectUnlisten(limit)
        .watchSends({ affects: [limitToLast] }, docC)
        .watchSnapshots(2000)
        .client(1)
        .expectEvents(limitToLast, { added: [docC], removed: [docB] })
        .userUnlistens(limitToLast)
        .client(0)
        .expectUnlisten(limitToLast)
        .expectActiveTargets();
    }
  );

  specTest(
    'Mirror queries from different secondary client',
    ['multi-client'],
    () => {
      const limit = queryWithLimit(
        query('collection', orderBy('val', 'asc')),
        2,
        LimitType.First
      );
      const limitToLast = queryWithLimit(
        query('collection', orderBy('val', 'desc')),
        2,
        LimitType.Last
      );
      const docA = doc('collection/a', 1000, { val: 0 });
      const docB = doc('collection/b', 1000, { val: 1 });
      const docC = doc('collection/c', 2000, { val: 0 });

      return client(0)
        .becomeVisible()
        .client(1)
        .userListens(limit)
        .client(2)
        .userListens(limitToLast)
        .client(0)
        .expectListen(limit)
        .expectListen(limitToLast)
        .watchAcksFull(limit, 1000, docA, docB)
        .client(1)
        .expectEvents(limit, { added: [docA, docB] })
        .client(2)
        .expectEvents(limitToLast, { added: [docB, docA] })
        .userUnlistens(limitToLast)
        .client(0)
        .expectUnlisten(limitToLast)
        .watchSends({ affects: [limit] }, docC)
        .watchSnapshots(2000)
        .client(1)
        .expectEvents(limit, { added: [docC], removed: [docB] });
    }
  );

  specTest(
    'Mirror queries from primary and secondary client',
    ['multi-client'],
    () => {
      const limit = queryWithLimit(
        query('collection', orderBy('val', 'asc')),
        2,
        LimitType.First
      );
      const limitToLast = queryWithLimit(
        query('collection', orderBy('val', 'desc')),
        2,
        LimitType.Last
      );
      const docA = doc('collection/a', 1000, { val: 0 });
      const docB = doc('collection/b', 1000, { val: 1 });
      const docC = doc('collection/c', 2000, { val: 0 });
      const docD = doc('collection/d', 3000, { val: -1 });

      return (
        client(0)
          .becomeVisible()
          .userListens(limit)
          .client(1)
          .userListens(limitToLast)
          .client(0)
          .expectListen(limit)
          .expectListen(limitToLast)
          .watchAcksFull(limit, 1000, docA, docB)
          .expectEvents(limit, { added: [docA, docB] })
          .client(1)
          .expectEvents(limitToLast, { added: [docB, docA] })
          // Secondary tab unlistens from its query
          .userUnlistens(limitToLast)
          .client(0)
          .expectUnlisten(limitToLast)
          .watchSends({ affects: [limit] }, docC)
          .watchSnapshots(2000)
          .expectEvents(limit, { added: [docC], removed: [docB] })
          .client(1)
          // Secondary tab re-listens the query previously unlistened.
          .userListens(limitToLast)
          .expectEvents(limitToLast, { added: [docC, docA] })
          .client(0)
          .expectListen(limitToLast)
          // Primary tab unlistens it's query.
          .userUnlistens(limit)
          .expectUnlisten(limit)
          .watchSends({ affects: [limitToLast] }, docD)
          .watchSnapshots(3000)
          .client(1)
          .expectEvents(limitToLast, { added: [docD], removed: [docC] })
          // Secondary tab unlisten it's query again, both mirror queries
          // are unlistened by now.
          .userUnlistens(limitToLast)
          .client(0)
          // TODO(b/143693491) If we use `expectListen` here, the test would
          // also pass, which is wrong. The reason is `TestRunner` only check
          // the expected Queries against the actual target. In the case of
          // mirror queries, both queries will be able to find an actual target.
          // We need to change `TestRunner` to track the actual client queries
          // in addition to the targets to fix this.
          .expectUnlisten(limitToLast)
          .expectActiveTargets()
      );
    }
  );

  specTest('Can listen/unlisten to mirror queries.', [], () => {
    const limit = queryWithLimit(
      query('collection', orderBy('val', 'asc')),
      2,
      LimitType.First
    );
    const limitToLast = queryWithLimit(
      query('collection', orderBy('val', 'desc')),
      2,
      LimitType.Last
    );
    const docA = doc('collection/a', 1000, { val: 0 });
    const docB = doc('collection/b', 1000, { val: 1 });
    const docC = doc('collection/c', 2000, { val: 0 });

    return (
      spec()
        .userListens(limit)
        .expectListen(limit)
        .userListens(limitToLast)
        .expectListen(limitToLast)
        .watchAcksFull(limit, 1000, docA, docB)
        .expectEvents(limit, { added: [docA, docB] })
        .expectEvents(limitToLast, { added: [docB, docA] })
        .userUnlistens(limitToLast)
        .expectUnlisten(limitToLast)
        .watchSends({ affects: [limit] }, docC)
        .watchCurrents(limit, 'resume-token-2000')
        .watchSnapshots(2000)
        .expectEvents(limit, { added: [docC], removed: [docB] })
        .userListens(limitToLast)
        .expectListen(limitToLast)
        // Note the result is not from cache because the target is kept
        // alive since `limit` is still being listened to.
        .expectEvents(limitToLast, { added: [docC, docA] })
        // Backend fails the query.
        .watchRemoves(
          limit,
          new RpcError(Code.RESOURCE_EXHAUSTED, 'Resource exhausted')
        )
        .expectEvents(limit, { errorCode: Code.RESOURCE_EXHAUSTED })
        .expectEvents(limitToLast, { errorCode: Code.RESOURCE_EXHAUSTED })
        .expectActiveTargets()
    );
  });

  specTest(
    "Secondary client uses primary client's online state",
    ['multi-client'],
    () => {
      const query1 = query('collection');

      return client(0)
        .becomeVisible()
        .client(1)
        .userListens(query1)
        .client(0)
        .expectListen(query1)
        .watchAcksFull(query1, 1000)
        .client(1)
        .expectEvents(query1, {})
        .client(0)
        .disableNetwork()
        .client(1)
        .expectEvents(query1, { fromCache: true })
        .client(0)
        .enableNetwork()
        .expectListen(query1, { resumeToken: 'resume-token-1000' })
        .watchAcksFull(query1, 2000)
        .client(1)
        .expectEvents(query1, {});
    }
  );

  specTest('New client uses existing online state', ['multi-client'], () => {
    const query1 = query('collection');
    const query2 = query('collection');

    return (
      client(0)
        .userListens(query1)
        .watchAcksFull(query1, 1000)
        .expectEvents(query1, {})
        .client(1)
        // Prevent client 0 from releasing its primary lease.
        .disableNetwork()
        .userListens(query1)
        .expectEvents(query1, {})
        .client(0)
        .disableNetwork()
        .expectEvents(query1, { fromCache: true })
        .client(2)
        .userListens(query1)
        .expectEvents(query1, { fromCache: true })
        .userListens(query2)
        .expectEvents(query2, { fromCache: true })
    );
  });

  specTest(
    'New client becomes primary if no client has its network enabled',
    ['multi-client'],
    () => {
      const query1 = query('collection');

      return client(0)
        .userListens(query1)
        .watchAcksFull(query1, 1000)
        .expectEvents(query1, {})
        .client(1)
        .userListens(query1)
        .expectEvents(query1, {})
        .client(0)
        .disableNetwork()
        .expectEvents(query1, { fromCache: true })
        .client(1)
        .expectEvents(query1, { fromCache: true })
        .client(2)
        .expectListen(query1, { resumeToken: 'resume-token-1000' })
        .expectPrimaryState(true)
        .watchAcksFull(query1, 2000)
        .client(0)
        .expectEvents(query1, {})
        .client(1)
        .expectEvents(query1, {});
    }
  );

  specTest(
    "Secondary client's online state is ignored",
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 2000, { key: 'a' });

      return (
        client(0)
          .becomeVisible()
          .client(1)
          .userListens(query1)
          .client(0)
          .expectListen(query1)
          .watchAcksFull(query1, 1000)
          .client(1)
          .expectEvents(query1, {})
          .disableNetwork() // Ignored since this is the secondary client.
          .client(0)
          .watchSends({ affects: [query1] }, docA)
          .watchSnapshots(2000)
          .client(1)
          .expectEvents(query1, { added: [docA] })
          .client(0)
          .disableNetwork()
          // Client remains primary since all clients are offline.
          .expectPrimaryState(true)
          .client(1)
          .expectEvents(query1, { fromCache: true })
          .expectPrimaryState(false)
      );
    }
  );

  specTest(
    "Offline state doesn't persist if primary is shut down",
    ['multi-client'],
    () => {
      const query1 = query('collection');

      return client(0)
        .userListens(query1)
        .disableNetwork()
        .expectEvents(query1, { fromCache: true })
        .shutdown()
        .client(1)
        .userListens(query1); // No event since the online state is 'Unknown'.
    }
  );

  specTest(
    'Listen is re-listened to after primary tab failover',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docB = doc('collection/b', 2000, { key: 'b' });

      return client(0)
        .expectPrimaryState(true)
        .client(1)
        .userListens(query1)
        .client(0)
        .expectListen(query1)
        .watchAcksFull(query1, 1000, docA)
        .client(1)
        .expectEvents(query1, { added: [docA] })
        .client(2)
        .userListens(query1)
        .expectEvents(query1, { added: [docA] })
        .client(0)
        .shutdown()
        .client(1)
        .runTimer(TimerId.ClientMetadataRefresh)
        .expectPrimaryState(true)
        .expectListen(query1, { resumeToken: 'resume-token-1000' })
        .watchAcksFull(query1, 2000, docB)
        .expectEvents(query1, { added: [docB] })
        .client(2)
        .expectEvents(query1, { added: [docB] });
    }
  );

  specTest('Listen is established in new primary tab', ['multi-client'], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'b' });

    // Client 0 and Client 2 listen to the same query. When client 0 shuts
    // down, client 1 becomes primary and takes ownership of a query it
    // did not previously listen to.
    return client(0)
      .expectPrimaryState(true)
      .userListens(query1)
      .watchAcksFull(query1, 1000, docA)
      .expectEvents(query1, { added: [docA] })
      .client(1) // Start up and initialize the second client.
      .client(2)
      .userListens(query1)
      .expectEvents(query1, { added: [docA] })
      .client(0)
      .shutdown()
      .client(1)
      .runTimer(TimerId.ClientMetadataRefresh)
      .expectPrimaryState(true)
      .expectListen(query1, { resumeToken: 'resume-token-1000' })
      .watchAcksFull(query1, 2000, docB)
      .client(2)
      .expectEvents(query1, { added: [docB] });
  });

  specTest('Query recovers after primary takeover', ['multi-client'], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'b' });
    const docC = doc('collection/c', 3000, { key: 'c' });

    return (
      client(0)
        .expectPrimaryState(true)
        .userListens(query1)
        .watchAcksFull(query1, 1000, docA)
        .expectEvents(query1, { added: [docA] })
        .client(1)
        .userListens(query1)
        .expectEvents(query1, { added: [docA] })
        .stealPrimaryLease()
        .expectListen(query1, { resumeToken: 'resume-token-1000' })
        .watchAcksFull(query1, 2000, docB)
        .expectEvents(query1, { added: [docB] })
        .client(0)
        // Client 0 ignores all events until it transitions to secondary
        .client(1)
        .watchSends({ affects: [query1] }, docC)
        .watchSnapshots(3000)
        .expectEvents(query1, { added: [docC] })
        .client(0)
        .runTimer(TimerId.ClientMetadataRefresh)
        // Client 0 recovers from its lease loss and applies the updates from
        // client 1
        .expectPrimaryState(false)
        .expectEvents(query1, { added: [docB, docC] })
    );
  });

  specTest('Query bounces between primaries', ['multi-client'], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docB = doc('collection/b', 2000, { key: 'b' });
    const docC = doc('collection/c', 3000, { key: 'c' });

    // Client 0 listens to a query. Client 1 is the primary when the query is
    // first listened to, then the query switches to client 0 and back to client
    // 1.
    return client(1)
      .expectPrimaryState(true)
      .client(0)
      .userListens(query1)
      .client(1)
      .expectListen(query1)
      .watchAcksFull(query1, 1000, docA)
      .client(0)
      .expectEvents(query1, { added: [docA] })
      .client(2)
      .stealPrimaryLease()
      .expectListen(query1, { resumeToken: 'resume-token-1000' })
      .client(1)
      .runTimer(TimerId.ClientMetadataRefresh)
      .expectPrimaryState(false)
      .client(2)
      .watchAcksFull(query1, 2000, docB)
      .client(0)
      .expectEvents(query1, { added: [docB] })
      .client(1)
      .stealPrimaryLease()
      .expectListen(query1, { resumeToken: 'resume-token-2000' })
      .watchAcksFull(query1, 3000, docC)
      .client(0)
      .expectEvents(query1, { added: [docC] });
  });

  specTest(
    'Unresponsive primary ignores watch update',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });

      return (
        client(0)
          .expectPrimaryState(true)
          .client(1)
          .userListens(query1)
          .client(0)
          .expectListen(query1)
          .client(1)
          .stealPrimaryLease()
          .client(0)
          // Send a watch update to client 0, who is longer primary (but doesn't
          // know it yet). The watch update gets ignored.
          .watchAcksFull(query1, 1000, docA)
          .client(1)
          .expectListen(query1)
          .watchAcksFull(query1, 1000, docA)
          .expectEvents(query1, { added: [docA] })
      );
    }
  );

  specTest(
    'Listen is established in newly started primary',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docB = doc('collection/b', 2000, { key: 'b' });

      // Client 0 executes a query on behalf of Client 1. When client 0 shuts
      // down, client 2 starts up and becomes primary, taking ownership of the
      // existing query.
      return client(0)
        .expectPrimaryState(true)
        .client(1)
        .userListens(query1)
        .client(0)
        .expectListen(query1)
        .watchAcksFull(query1, 1000, docA)
        .client(1)
        .expectEvents(query1, { added: [docA] })
        .client(0)
        .shutdown()
        .client(2)
        .expectPrimaryState(true)
        .expectListen(query1, { resumeToken: 'resume-token-1000' })
        .watchAcksFull(query1, 2000, docB)
        .client(1)
        .expectEvents(query1, { added: [docB] });
    }
  );

  specTest(
    'Previous primary immediately regains primary lease',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 2000, { key: 'a' });

      return (
        client(0)
          .userListens(query1)
          .watchAcksFull(query1, 1000)
          .expectEvents(query1, {})
          .client(1)
          .stealPrimaryLease()
          .expectListen(query1, { resumeToken: 'resume-token-1000' })
          .watchAcksFull(query1, 2000, docA)
          .shutdown()
          .client(0)
          .expectPrimaryState(true)
          // The primary tab only discovers that it has lost its lease when it
          // is already eligible to obtain it again.
          .runTimer(TimerId.ClientMetadataRefresh)
          .expectPrimaryState(true)
          .expectListen(query1, { resumeToken: 'resume-token-2000' })
          .expectEvents(query1, { added: [docA] })
      );
    }
  );

  specTest(
    'onSnapshotsInSync should not fire for doc changes if there are no listeners',
    [],
    () => {
      return spec()
        .userAddsSnapshotsInSyncListener()
        .expectSnapshotsInSyncEvent()
        .userSets('collection/a', { v: 2 });
    }
  );

  specTest(
    'onSnapshotsInSync fires when called even if there are no local listeners',
    [],
    () => {
      return spec()
        .userAddsSnapshotsInSyncListener()
        .expectSnapshotsInSyncEvent()
        .userAddsSnapshotsInSyncListener()
        .expectSnapshotsInSyncEvent();
    }
  );

  specTest('onSnapshotsInSync fires for metadata changes', [], () => {
    const query1 = query('collection');
    const docAv1 = doc('collection/a', 1000, { v: 1 });
    const docAv2Local = doc('collection/a', 1000, {
      v: 2
    }).setHasLocalMutations();
    const docAv2 = doc('collection/a', 2000, { v: 2 });

    return spec()
      .userListens(query1)
      .watchAcksFull(query1, 1000, docAv1)
      .expectEvents(query1, { added: [docAv1] })
      .userAddsSnapshotsInSyncListener()
      .expectSnapshotsInSyncEvent()
      .userSets('collection/a', { v: 2 })
      .expectEvents(query1, {
        hasPendingWrites: true,
        modified: [docAv2Local]
      })
      .expectSnapshotsInSyncEvent()
      .watchSends({ affects: [query1] }, docAv2)
      .watchSnapshots(2000)
      .writeAcks('collection/a', 2000)
      .expectEvents(query1, {
        metadata: [docAv2]
      })
      .expectSnapshotsInSyncEvent();
  });

  specTest(
    'onSnapshotsInSync fires once for multiple event snapshots',
    [],
    () => {
      const query1 = query('collection');
      const query2 = query('collection/a');
      const docAv1 = doc('collection/a', 1000, { v: 1 });
      const docAv2Local = doc('collection/a', 1000, {
        v: 2
      }).setHasLocalMutations();
      const docAv2 = doc('collection/a', 2000, { v: 2 });

      return spec()
        .userListens(query1)
        .watchAcksFull(query1, 1000, docAv1)
        .expectEvents(query1, { added: [docAv1] })
        .userListens(query2)
        .expectEvents(query2, { fromCache: true, added: [docAv1] })
        .watchAcksFull(query2, 1000, docAv1)
        .expectEvents(query2, { fromCache: false })
        .userAddsSnapshotsInSyncListener()
        .expectSnapshotsInSyncEvent()
        .userSets('collection/a', { v: 2 })
        .expectEvents(query1, {
          hasPendingWrites: true,
          modified: [docAv2Local]
        })
        .expectEvents(query2, {
          hasPendingWrites: true,
          modified: [docAv2Local]
        })
        .expectSnapshotsInSyncEvent()
        .watchSends({ affects: [query1, query2] }, docAv2)
        .watchSnapshots(2000)
        .writeAcks('collection/a', 2000)
        .expectEvents(query1, {
          metadata: [docAv2]
        })
        .expectEvents(query2, {
          metadata: [docAv2]
        })
        .expectSnapshotsInSyncEvent();
    }
  );

  specTest('onSnapshotsInSync fires for multiple listeners', [], () => {
    const query1 = query('collection');
    const docAv1 = doc('collection/a', 1000, { v: 1 });
    const docAv2Local = doc('collection/a', 1000, {
      v: 2
    }).setHasLocalMutations();
    const docAv3Local = doc('collection/a', 1000, {
      v: 3
    }).setHasLocalMutations();
    const docAv4Local = doc('collection/a', 1000, {
      v: 4
    }).setHasLocalMutations();

    return spec()
      .userListens(query1)
      .watchAcksFull(query1, 1000, docAv1)
      .expectEvents(query1, { added: [docAv1] })
      .userAddsSnapshotsInSyncListener()
      .expectSnapshotsInSyncEvent()
      .userSets('collection/a', { v: 2 })
      .expectEvents(query1, {
        hasPendingWrites: true,
        modified: [docAv2Local]
      })
      .expectSnapshotsInSyncEvent()
      .userAddsSnapshotsInSyncListener()
      .expectSnapshotsInSyncEvent()
      .userAddsSnapshotsInSyncListener()
      .expectSnapshotsInSyncEvent()
      .userSets('collection/a', { v: 3 })
      .expectEvents(query1, {
        hasPendingWrites: true,
        modified: [docAv3Local]
      })
      .expectSnapshotsInSyncEvent(3)
      .userRemovesSnapshotsInSyncListener()
      .userSets('collection/a', { v: 4 })
      .expectEvents(query1, {
        hasPendingWrites: true,
        modified: [docAv4Local]
      })
      .expectSnapshotsInSyncEvent(2);
  });

  specTest('Empty initial snapshot is raised from cache', [], () => {
    const query1 = query('collection');
    return (
      spec()
        // Disable GC so the cache persists across listens.
        .ensureManualLruGC()
        // Populate the cache with the empty query results.
        .userListens(query1)
        .watchAcksFull(query1, 1000)
        .expectEvents(query1, { fromCache: false })
        .userUnlistens(query1)
        .watchRemoves(query1)
        // Listen to the query again and verify that the empty snapshot is
        // raised from cache.
        .userListens(query1, { resumeToken: 'resume-token-1000' })
        .expectEvents(query1, { fromCache: true })
        // Verify that another snapshot is raised once the query result comes
        // back from Watch.
        .watchAcksFull(query1, 2000)
        .expectEvents(query1, { fromCache: false })
    );
  });

  specTest(
    'Empty-due-to-delete initial snapshot is raised from cache',
    [],
    () => {
      const query1 = query('collection');
      const doc1 = doc('collection/a', 1000, { v: 1 });
      return (
        spec()
          // Disable GC so the cache persists across listens.
          .ensureManualLruGC()
          // Populate the cache with the empty query results.
          .userListens(query1)
          .watchAcksFull(query1, 1000, doc1)
          .expectEvents(query1, { added: [doc1] })
          .userUnlistens(query1)
          .watchRemoves(query1)
          // Delete the only document in the result set locally on the client.
          .userDeletes('collection/a')
          // Listen to the query again and verify that the empty snapshot is
          // raised from cache, even though the write is not yet acknowledged.
          .userListens(query1, { resumeToken: 'resume-token-1000' })
          .expectEvents(query1, { fromCache: true })
      );
    }
  );

  specTest(
    'Empty initial snapshot is raised from cache in multiple tabs',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      return (
        client(0)
          // Populate the cache with the empty query results.
          .userListens(query1)
          .watchAcksFull(query1, 1000)
          .expectEvents(query1, { fromCache: false })
          .userUnlistens(query1)
          .watchRemoves(query1)
          .client(1)
          // Re-listen to the query in second client and verify that the empty
          // snapshot is raised from cache.
          .userListens(query1)
          .expectEvents(query1, { fromCache: true })
          .client(0)
          .expectListen(query1, { resumeToken: 'resume-token-1000' })
          // Verify that another snapshot is raised once the query result comes
          // back from Watch.
          .watchAcksFull(query1, 2000)
          .client(1)
          .expectEvents(query1, { fromCache: false })
      );
    }
  );
  specTest(
    'Empty-due-to-delete initial snapshot is raised from cache in multiple tabs',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const doc1 = doc('collection/a', 1000, { v: 1 });
      const doc1Deleted = deletedDoc('collection/a', 2000);

      return (
        client(0)
          // Populate the cache with the empty query results.
          .userListens(query1)
          .watchAcksFull(query1, 1000, doc1)
          .expectEvents(query1, { added: [doc1] })
          .userUnlistens(query1)
          .watchRemoves(query1)
          // Delete the only document in the result set locally on the client.
          .userDeletes('collection/a')
          // Re-listen to the query in second client and verify that the empty
          // snapshot is raised from cache with local mutation.
          .client(1)
          .userListens(query1)
          .expectEvents(query1, { fromCache: true })
          // Should get events once stream is caught up.
          .client(0)
          .expectListen(query1, { resumeToken: 'resume-token-1000' })
          .writeAcks('collection/a', 2000)
          .watchAcksFull(query1, 2000, doc1Deleted)
          .client(1)
          .expectEvents(query1, { fromCache: false })
      );
    }
  );

  specTest(
    'Resuming a query should specify expectedCount when adding the target',
    [],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docB = doc('collection/b', 1000, { key: 'b' });

      return (
        spec()
          .ensureManualLruGC()
          .userListens(query1)
          .watchAcksFull(query1, 1000)
          .expectEvents(query1, {})
          .userUnlistens(query1)
          .watchRemoves(query1)
          // There are 0 remote documents from previous listen.
          .userListens(query1, {
            resumeToken: 'resume-token-1000',
            expectedCount: 0
          })
          .expectEvents(query1, { fromCache: true })
          .watchAcksFull(query1, 2000, docA, docB)
          .expectEvents(query1, { added: [docA, docB] })
          .userUnlistens(query1)
          .userListens(query1, {
            resumeToken: 'resume-token-2000',
            expectedCount: 2
          })
          .expectEvents(query1, { added: [docA, docB], fromCache: true })
      );
    }
  );

  specTest(
    'Resuming a query should specify expectedCount that does not include pending mutations',
    [],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docBLocal = doc('collection/b', 1000, {
        key: 'b'
      }).setHasLocalMutations();

      return spec()
        .ensureManualLruGC()
        .userListens(query1)
        .watchAcksFull(query1, 1000, docA)
        .expectEvents(query1, { added: [docA] })
        .userUnlistens(query1)
        .userSets('collection/b', { key: 'b' })
        .userListens(query1, {
          resumeToken: 'resume-token-1000',
          expectedCount: 1
        })
        .expectEvents(query1, {
          added: [docA, docBLocal],
          fromCache: true,
          hasPendingWrites: true
        });
    }
  );

  specTest(
    'ExpectedCount in listen request should work after coming back online',
    [],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });

      return spec()
        .ensureManualLruGC()
        .userListens(query1)
        .watchAcksFull(query1, 1000, docA)
        .expectEvents(query1, { added: [docA] })
        .disableNetwork()
        .expectEvents(query1, { fromCache: true })
        .enableNetwork()
        .restoreListen(query1, 'resume-token-1000', /* expectedCount= */ 1);
    }
  );
});
