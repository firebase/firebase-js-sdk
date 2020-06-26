/**
 * @license
 * Copyright 2020 Google LLC
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

import { describeSpec, specTest } from './describe_spec';
import { client, spec } from './spec_builder';
import { TimerId } from '../../../src/util/async_queue';
import { Query } from '../../../src/core/query';
import { Code } from '../../../src/util/error';
import { deletedDoc, doc, filter, path } from '../../util/helpers';
import { RpcError } from './spec_rpc_error';

// The IndexedDB action that the Watch stream uses to detect if IndexedDB access
// is available again.
const ASYNC_QUEUE_PROBER = 'Get last remote snapshot version';

describeSpec('Persistence Recovery', ['no-ios', 'no-android'], () => {
  specTest(
    'Write is acknowledged by primary client (with recovery)',
    ['multi-client'],
    () => {
      return (
        client(0)
          .expectPrimaryState(true)
          .client(1)
          .expectPrimaryState(false)
          .userSets('collection/a', { v: 1 })
          .failDatabaseTransactions('Lookup mutation documents')
          .client(0)
          .writeAcks('collection/a', 1, { expectUserCallback: false })
          .client(1)
          // Client 1 has received the WebStorage notification that the write
          // has been acknowledged, but failed to process the change. Hence,
          // we did not get a user callback. We schedule the first retry and
          // make sure that it also does not get processed until
          // `recoverDatabase` is called.
          .runTimer(TimerId.AsyncQueueRetry)
          .recoverDatabase()
          .runTimer(TimerId.AsyncQueueRetry)
          .expectUserCallbacks({
            acknowledged: ['collection/a']
          })
      );
    }
  );

  specTest(
    'Clients fail to lookup mutations (with recovery)',
    ['multi-client'],
    () => {
      // Multi-Tab uses a Local Storage notification to inform all tabs about
      // changes to a mutation tab. To act upon these changes, the tabs read
      // the mutated document from IndexedDB. This test verifies that mutations
      // are applied even if the lookup fails temporarily.
      return (
        client(0)
          .expectPrimaryState(true)
          // All tabs fail to act upon the Local Storage notifications
          .failDatabaseTransactions('Lookup mutation documents')
          .client(1)
          .expectPrimaryState(false)
          .userSets('collection/a', { v: 1 })
          .failDatabaseTransactions('Lookup mutation documents')
          // All tabs recover and the notifications are processed
          .client(0)
          .recoverDatabase()
          .runTimer(TimerId.AsyncQueueRetry)
          .writeAcks('collection/a', 1, { expectUserCallback: false })
          .client(1)
          .recoverDatabase()
          .runTimer(TimerId.AsyncQueueRetry)
          .expectUserCallbacks({ acknowledged: ['collection/a'] })
      );
    }
  );

  specTest(
    'Query raises events in secondary client (with recovery)',
    ['multi-client'],
    () => {
      const query = Query.atPath(path('collection'));
      const doc1 = doc('collection/doc', 1, { foo: 'a' });

      return client(0)
        .expectPrimaryState(true)
        .client(1)
        .expectPrimaryState(false)
        .userListens(query)
        .failDatabaseTransactions('Get new document changes')
        .client(0)
        .expectListen(query)
        .watchAcksFull(query, 1000, doc1)
        .client(1)
        .recoverDatabase()
        .runTimer(TimerId.AsyncQueueRetry)
        .expectEvents(query, { added: [doc1] });
    }
  );

  specTest(
    'Query is listened to by primary (with recovery)',
    ['multi-client'],
    () => {
      const query = Query.atPath(path('collection'));

      return (
        client(0)
          .expectPrimaryState(true)
          .failDatabaseTransactions('Allocate target', 'Get target data')
          .client(1)
          .userListens(query)
          .client(0)
          // The primary client 0 receives a WebStorage notification about the
          // new query, but it cannot load the target from IndexedDB. The
          // query will only be listened to once we recover the database.
          .recoverDatabase()
          .runTimer(TimerId.AsyncQueueRetry)
          .expectListen(query)
          .failDatabaseTransactions('Release target')
          .client(1)
          .userUnlistens(query)
          .client(0)
          // The primary client 0 receives a notification that the query can
          // be released, but it can only process the change after we recover
          // the database.
          .expectActiveTargets({ query })
          .recoverDatabase()
          .runTimer(TimerId.AsyncQueueRetry)
          .expectActiveTargets()
      );
    }
  );

  specTest(
    'Query with active view recovers after primary tab failover (with recovery)',
    ['multi-client'],
    () => {
      const query = Query.atPath(path('collection'));
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docB = doc('collection/b', 2000, { key: 'b' });

      return (
        client(0)
          .expectPrimaryState(true)
          .client(1)
          // Register a query in the secondary client
          .userListens(query)
          .client(0)
          .expectListen(query)
          .watchAcksFull(query, 1000, docA)
          // Shutdown the primary client to release its lease
          .shutdown()
          .client(1)
          .expectEvents(query, { added: [docA] })
          // Run the lease refresh to attempt taking over the primary lease. The
          // first lease refresh fails with a simulated transaction failure.
          .failDatabaseTransactions('Allocate target')
          .runTimer(TimerId.ClientMetadataRefresh)
          .expectPrimaryState(false)
          .recoverDatabase()
          .runTimer(TimerId.AsyncQueueRetry)
          .expectPrimaryState(true)
          .expectListen(query, 'resume-token-1000')
          .watchAcksFull(query, 2000, docB)
          .expectEvents(query, { added: [docB] })
      );
    }
  );

  specTest(
    'Query without active view recovers after primary tab failover (with recovery)',
    ['multi-client'],
    () => {
      const query = Query.atPath(path('collection'));
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docB = doc('collection/b', 2000, { key: 'b' });

      return (
        client(0)
          .expectPrimaryState(true)
          // Initialize a second client that doesn't have any active targets
          .client(1)
          .client(2)
          // Register a query in the third client
          .userListens(query)
          .client(0)
          .expectListen(query)
          .watchAcksFull(query, 1000, docA)
          .client(2)
          .expectEvents(query, { added: [docA] })
          .client(0)
          // Shutdown the primary client to release its lease
          .shutdown()
          .client(1)
          // Run the lease refresh in the second client, which does not yet have
          // an active view for the third client's query. The lease refresh fails
          // at first, but then recovers and initializes the view.
          .failDatabaseTransactions('Allocate target')
          .runTimer(TimerId.ClientMetadataRefresh)
          .expectPrimaryState(false)
          .recoverDatabase()
          .runTimer(TimerId.AsyncQueueRetry)
          .expectPrimaryState(true)
          .expectListen(query, 'resume-token-1000')
          .watchAcksFull(query, 2000, docB)
          .client(2)
          .expectEvents(query, { added: [docB] })
      );
    }
  );

  specTest(
    'Ignores intermittent lease refresh failures (with recovery)',
    ['multi-client'],
    () => {
      // This test verifies that an IndexedDB failure during a lease refresh
      // does not impact client functionality. Lease refresh failures are
      // ignored, as the lease is also verified each time an operation is
      // run.
      return (
        client(0)
          .expectPrimaryState(true)
          .client(1)
          .expectPrimaryState(false)
          // Run the initial sequence: The primary client fails its lease refresh
          // before the secondary client.
          .client(0)
          .failDatabaseTransactions('updateClientMetadataAndTryBecomePrimary')
          .runTimer(TimerId.ClientMetadataRefresh)
          .client(1)
          .failDatabaseTransactions('updateClientMetadataAndTryBecomePrimary')
          .runTimer(TimerId.ClientMetadataRefresh)
          .client(0)
          .recoverDatabase()
          .runTimer(TimerId.ClientMetadataRefresh)
          .expectPrimaryState(true)
          .client(1)
          .recoverDatabase()
          .runTimer(TimerId.ClientMetadataRefresh)
          .expectPrimaryState(false)
          // Run the opposite sequence: The secondary client fails its lease
          // refresh before the primary client.
          .client(1)
          .failDatabaseTransactions('updateClientMetadataAndTryBecomePrimary')
          .runTimer(TimerId.ClientMetadataRefresh)
          .client(0)
          .failDatabaseTransactions('updateClientMetadataAndTryBecomePrimary')
          .runTimer(TimerId.ClientMetadataRefresh)
          .client(1)
          .recoverDatabase()
          .runTimer(TimerId.ClientMetadataRefresh)
          .expectPrimaryState(false)
          .client(0)
          .recoverDatabase()
          .runTimer(TimerId.ClientMetadataRefresh)
          .expectPrimaryState(true)
      );
    }
  );

  specTest('Recovers when write cannot be persisted', [], () => {
    return (
      spec()
        .userSets('collection/key1', { foo: 'a' })
        .expectNumOutstandingWrites(1)
        // We fail the write if we cannot persist the local mutation (via
        // 'Locally write mutations').
        .failDatabaseTransactions('Locally write mutations')
        .userSets('collection/key2', { bar: 'b' })
        .expectUserCallbacks({ rejected: ['collection/key2'] })
        // The write is considered successful if we can persist the local mutation
        // but fail to update view assignments (via 'notifyLocalViewChanges').
        .failDatabaseTransactions('notifyLocalViewChanges')
        .userSets('collection/key3', { bar: 'b' })
        .recoverDatabase()
        .expectNumOutstandingWrites(2)
        .userSets('collection/key4', { baz: 'c' })
        .expectNumOutstandingWrites(3)
        .writeAcks('collection/key1', 1)
        .writeAcks('collection/key3', 2)
        .writeAcks('collection/key4', 3)
        .expectNumOutstandingWrites(0)
    );
  });

  specTest('Does not surface non-persisted writes', [], () => {
    const query = Query.atPath(path('collection'));
    const doc1Local = doc(
      'collection/key1',
      0,
      { foo: 'a' },
      { hasLocalMutations: true }
    );
    const doc1 = doc('collection/key1', 1, { foo: 'a' });
    const doc3Local = doc(
      'collection/key3',
      0,
      { foo: 'c' },
      { hasLocalMutations: true }
    );
    const doc3 = doc('collection/key3', 2, { foo: 'c' });
    return spec()
      .userListens(query)
      .userSets('collection/key1', { foo: 'a' })
      .expectEvents(query, {
        added: [doc1Local],
        fromCache: true,
        hasPendingWrites: true
      })
      .failDatabaseTransactions('Locally write mutations')
      .userSets('collection/key2', { foo: 'b' })
      .expectUserCallbacks({ rejected: ['collection/key2'] })
      .recoverDatabase()
      .userSets('collection/key3', { foo: 'c' })
      .expectEvents(query, {
        added: [doc3Local],
        fromCache: true,
        hasPendingWrites: true
      })
      .writeAcks('collection/key1', 1)
      .writeAcks('collection/key3', 2)
      .watchAcksFull(query, 2, doc1, doc3)
      .expectEvents(query, { metadata: [doc1, doc3] });
  });

  specTest('Recovers when write acknowledgment cannot be persisted', [], () => {
    return spec()
      .userSets('collection/a', { v: 1 })
      .userSets('collection/b', { v: 2 })
      .userSets('collection/c', { v: 3 })
      .writeAcks('collection/a', 1)
      .failDatabaseTransactions('Acknowledge batch')
      .writeAcks('collection/b', 2, { expectUserCallback: false })
      .recoverDatabase()
      .runTimer(TimerId.AsyncQueueRetry)
      .expectUserCallbacks({ acknowledged: ['collection/b'] })
      .writeAcks('collection/c', 1);
  });

  specTest('Recovers when write rejection cannot be persisted', [], () => {
    return spec()
      .userPatches('collection/a', { v: 1 })
      .userPatches('collection/a', { v: 2 })
      .userPatches('collection/c', { v: 3 })
      .failWrite(
        'collection/a',
        new RpcError(Code.FAILED_PRECONDITION, 'Simulated test error')
      )
      .failDatabaseTransactions('Reject batch')
      .failWrite(
        'collection/b',
        new RpcError(Code.FAILED_PRECONDITION, 'Simulated test error'),
        { expectUserCallback: false }
      )
      .recoverDatabase()
      .runTimer(TimerId.AsyncQueueRetry)
      .expectUserCallbacks({ rejected: ['collection/a'] })
      .failWrite(
        'collection/c',
        new RpcError(Code.FAILED_PRECONDITION, 'Simulated test error')
      );
  });

  specTest(
    'Recovers when write acknowledgment cannot be persisted (with restart)',
    ['durable-persistence'],
    () => {
      // This test verifies the current behavior of the client, which is not
      // ideal. Instead of resending the write to 'collection/b' (whose
      // rejection failed with an IndexedDB failure), the client should drop the
      // write.
      return spec()
        .userSets('collection/a', { v: 1 })
        .userSets('collection/b', { v: 2 })
        .userSets('collection/c', { v: 3 })
        .writeAcks('collection/a', 1)
        .failDatabaseTransactions('Acknowledge batch')
        .writeAcks('collection/b', 2, {
          expectUserCallback: false,
          keepInQueue: true
        })
        .restart()
        .expectNumOutstandingWrites(2)
        .writeAcks('collection/b', 2, { expectUserCallback: false })
        .writeAcks('collection/c', 3, { expectUserCallback: false });
    }
  );

  specTest('Writes are pending until acknowledgement is persisted', [], () => {
    const query = Query.atPath(path('collection'));
    const doc1Local = doc(
      'collection/a',
      0,
      { v: 1 },
      { hasLocalMutations: true }
    );
    const doc1 = doc('collection/a', 1001, { v: 1 });
    const doc2Local = doc(
      'collection/b',
      0,
      { v: 2 },
      { hasLocalMutations: true }
    );
    const doc2 = doc('collection/b', 1002, { v: 2 });
    return (
      spec()
        .userListens(query)
        .watchAcksFull(query, 1000)
        .expectEvents(query, {})
        .userSets('collection/a', { v: 1 })
        .expectEvents(query, { added: [doc1Local], hasPendingWrites: true })
        .userSets('collection/b', { v: 2 })
        .expectEvents(query, { added: [doc2Local], hasPendingWrites: true })
        .failDatabaseTransactions('Acknowledge batch')
        .writeAcks('collection/a', 1, { expectUserCallback: false })
        // The write ack cannot be persisted and the client goes offline, which
        // clears all active targets, but doesn't raise a new snapshot since
        // the document is still marked `hasPendingWrites`.
        .expectEvents(query, { fromCache: true, hasPendingWrites: true })
        .expectActiveTargets()
        .recoverDatabase()
        .runTimer(TimerId.AsyncQueueRetry)
        // Client is back online
        .expectActiveTargets({ query, resumeToken: 'resume-token-1000' })
        .expectUserCallbacks({ acknowledged: ['collection/a'] })
        .watchAcksFull(query, 1001, doc1)
        .expectEvents(query, { metadata: [doc1], hasPendingWrites: true })
        .writeAcks('collection/b', 2)
        .watchSends({ affects: [query] }, doc2)
        .watchSnapshots(1002)
        .expectEvents(query, { metadata: [doc2] })
    );
  });

  specTest(
    'Surfaces local documents if notifyLocalViewChanges fails',
    [],
    () => {
      const query = Query.atPath(path('collection'));
      const doc1Local = doc(
        'collection/key1',
        0,
        { foo: 'a' },
        { hasLocalMutations: true }
      );
      const doc1 = doc('collection/key1', 1, { foo: 'a' });
      const doc2 = doc('collection/key2', 2, { foo: 'b' });
      return spec()
        .userListens(query)
        .failDatabaseTransactions('notifyLocalViewChanges')
        .userSets('collection/key1', { foo: 'a' })
        .expectEvents(query, {
          added: [doc1Local],
          fromCache: true,
          hasPendingWrites: true
        })
        .recoverDatabase()
        .runTimer(TimerId.AsyncQueueRetry)
        .writeAcks('collection/key1', 1)
        .failDatabaseTransactions('notifyLocalViewChanges')
        .watchAcksFull(query, 1000, doc1, doc2)
        .expectEvents(query, {
          metadata: [doc1],
          added: [doc2]
        });
    }
  );

  specTest(
    'Excludes documents from future queries even if notifyLocalViewChanges fails',
    [],
    () => {
      const query = Query.atPath(path('collection'));
      const doc1 = doc('collection/key1', 1000, { foo: 'a' });
      const deletedDoc1 = deletedDoc('collection/key1', 2000);
      return (
        spec()
          .withGCEnabled(false)
          .userListens(query)
          .watchAcksFull(query, 1000, doc1)
          .expectEvents(query, {
            added: [doc1]
          })
          .failDatabaseTransactions('notifyLocalViewChanges')
          .watchSends({ removed: [query] }, deletedDoc1)
          .watchSnapshots(2000)
          .expectEvents(query, {
            removed: [doc1]
          })
          .recoverDatabase()
          .userUnlistens(query)
          // No event since the document was removed
          .userListens(query, 'resume-token-1000')
      );
    }
  );

  specTest('Fails targets that cannot be allocated', [], () => {
    const query1 = Query.atPath(path('collection1'));
    const query2 = Query.atPath(path('collection2'));
    const query3 = Query.atPath(path('collection3'));
    return spec()
      .userListens(query1)
      .watchAcksFull(query1, 1)
      .expectEvents(query1, {})
      .failDatabaseTransactions('Allocate target')
      .userListens(query2)
      .expectEvents(query2, { errorCode: Code.UNAVAILABLE })
      .recoverDatabase()
      .userListens(query3)
      .watchAcksFull(query3, 1)
      .expectEvents(query3, {});
  });

  specTest('Can re-add failed target', [], () => {
    const query1 = Query.atPath(path('collection1'));
    const query2 = Query.atPath(path('collection2'));
    return spec()
      .userListens(query1)
      .watchAcksFull(query1, 1)
      .expectEvents(query1, {})
      .failDatabaseTransactions('Allocate target')
      .userListens(query2)
      .expectEvents(query2, { errorCode: Code.UNAVAILABLE })
      .recoverDatabase()
      .userListens(query2)
      .watchAcksFull(query2, 1)
      .expectEvents(query2, {});
  });

  specTest('Recovers when watch update cannot be persisted', [], () => {
    const query = Query.atPath(path('collection'));
    const doc1 = doc('collection/key1', 1000, { foo: 'a' });
    const doc2 = doc('collection/key2', 2000, { foo: 'b' });
    return (
      spec()
        .withGCEnabled(false)
        .userListens(query)
        .watchAcksFull(query, 1000, doc1)
        .expectEvents(query, {
          added: [doc1]
        })
        .watchSends({ affects: [query] }, doc2)
        .failDatabaseTransactions('Get last remote snapshot version')
        .watchSnapshots(1500)
        // `failDatabaseTransactions()` causes us to go offline.
        .expectActiveTargets()
        .expectEvents(query, { fromCache: true })
        .recoverDatabase()
        .runTimer(TimerId.AsyncQueueRetry)
        .expectActiveTargets({ query, resumeToken: 'resume-token-1000' })
        .watchAcksFull(query, 2000, doc2)
        .expectEvents(query, {
          added: [doc2]
        })
    );
  });

  specTest('Recovers when watch rejection cannot be persisted', [], () => {
    const doc1Query = Query.atPath(path('collection/key1'));
    const doc2Query = Query.atPath(path('collection/key2'));
    const doc1a = doc('collection/key1', 1000, { foo: 'a' });
    const doc1b = doc('collection/key1', 4000, { foo: 'a', updated: true });
    const doc2 = doc('collection/key2', 2000, { foo: 'b' });
    return (
      spec()
        .withGCEnabled(false)
        .userListens(doc1Query)
        .watchAcksFull(doc1Query, 1000, doc1a)
        .expectEvents(doc1Query, {
          added: [doc1a]
        })
        .userListens(doc2Query)
        .watchAcksFull(doc2Query, 2000, doc2)
        .expectEvents(doc2Query, {
          added: [doc2]
        })
        .failDatabaseTransactions('Release target', ASYNC_QUEUE_PROBER)
        .watchRemoves(
          doc1Query,
          new RpcError(Code.PERMISSION_DENIED, 'Simulated target error')
        )
        // `failDatabaseTransactions()` causes us to go offline.
        .expectActiveTargets()
        .expectEvents(doc1Query, { fromCache: true })
        .expectEvents(doc2Query, { fromCache: true })
        .recoverDatabase()
        .runTimer(TimerId.AsyncQueueRetry)
        .expectActiveTargets(
          { query: doc1Query, resumeToken: 'resume-token-1000' },
          { query: doc2Query, resumeToken: 'resume-token-2000' }
        )
        .watchAcksFull(doc1Query, 3000)
        .expectEvents(doc1Query, {})
        .watchRemoves(
          doc2Query,
          new RpcError(Code.PERMISSION_DENIED, 'Simulated target error')
        )
        .expectEvents(doc2Query, { errorCode: Code.PERMISSION_DENIED })
        .watchSends({ affects: [doc1Query] }, doc1b)
        .watchSnapshots(4000)
        .expectEvents(doc1Query, {
          modified: [doc1b]
        })
    );
  });

  specTest(
    'Recovers when Limbo acknowledgement cannot be persisted',
    [],
    () => {
      const fullQuery = Query.atPath(path('collection'));
      const filteredQuery = Query.atPath(path('collection')).addFilter(
        filter('included', '==', true)
      );
      const doc1a = doc('collection/key1', 1, { included: true });
      const doc1b = doc('collection/key1', 1500, { included: false });
      const limboQuery = Query.atPath(doc1a.key.path);
      return spec()
        .withGCEnabled(false)
        .userListens(fullQuery)
        .watchAcksFull(fullQuery, 1000, doc1a)
        .expectEvents(fullQuery, {
          added: [doc1a]
        })
        .userUnlistens(fullQuery)
        .userListens(filteredQuery)
        .expectEvents(filteredQuery, {
          added: [doc1a],
          fromCache: true
        })
        .watchAcksFull(filteredQuery, 2000)
        .expectLimboDocs(doc1a.key)
        .failDatabaseTransactions('Get last remote snapshot version')
        .watchAcksFull(limboQuery, 3000, doc1b)
        .expectActiveTargets()
        .recoverDatabase()
        .runTimer(TimerId.AsyncQueueRetry)
        .expectActiveTargets(
          {
            query: filteredQuery,
            resumeToken: 'resume-token-2000'
          },
          { query: limboQuery }
        )
        .watchAcksFull(filteredQuery, 4000)
        .watchAcksFull(limboQuery, 4000, doc1b)
        .expectLimboDocs()
        .expectEvents(filteredQuery, {
          removed: [doc1a]
        });
    }
  );

  specTest('Recovers when Limbo rejection cannot be persisted', [], () => {
    const fullQuery = Query.atPath(path('collection'));
    const filteredQuery = Query.atPath(path('collection')).addFilter(
      filter('included', '==', true)
    );
    const doc1 = doc('collection/key1', 1, { included: true });
    const limboQuery = Query.atPath(doc1.key.path);
    return spec()
      .withGCEnabled(false)
      .userListens(fullQuery)
      .watchAcksFull(fullQuery, 1000, doc1)
      .expectEvents(fullQuery, {
        added: [doc1]
      })
      .userUnlistens(fullQuery)
      .userListens(filteredQuery)
      .expectEvents(filteredQuery, {
        added: [doc1],
        fromCache: true
      })
      .watchAcksFull(filteredQuery, 2000)
      .expectLimboDocs(doc1.key)
      .failDatabaseTransactions('Apply remote event', ASYNC_QUEUE_PROBER)
      .watchRemoves(
        limboQuery,
        new RpcError(Code.PERMISSION_DENIED, 'Test error')
      )
      .expectActiveTargets()
      .recoverDatabase()
      .runTimer(TimerId.AsyncQueueRetry)
      .expectActiveTargets(
        { query: filteredQuery, resumeToken: 'resume-token-2000' },
        { query: limboQuery }
      )
      .watchAcksFull(filteredQuery, 3000)
      .watchRemoves(
        limboQuery,
        new RpcError(Code.PERMISSION_DENIED, 'Test error')
      )
      .expectLimboDocs()
      .expectEvents(filteredQuery, {
        removed: [doc1]
      });
  });

  specTest(
    'User change handles transaction failures (with recovery)',
    ['durable-persistence'],
    () => {
      const query = Query.atPath(path('collection'));
      const doc1 = doc(
        'collection/key1',
        0,
        { foo: 'a' },
        { hasLocalMutations: true }
      );
      return (
        spec()
          .changeUser('user1')
          .userSets('collection/key1', { foo: 'a' })
          .userListens(query)
          .expectEvents(query, {
            added: [doc1],
            fromCache: true,
            hasPendingWrites: true
          })
          .failDatabaseTransactions('Handle user change')
          .changeUser('user2')
          // The network is offline due to the failed user change
          .expectActiveTargets()
          .recoverDatabase()
          .runTimer(TimerId.AsyncQueueRetry)
          .expectActiveTargets({ query })
          .expectEvents(query, { removed: [doc1], fromCache: true })
          .failDatabaseTransactions('Handle user change')
          .changeUser('user1')
          // The network is offline due to the failed user change
          .expectActiveTargets()
          .recoverDatabase()
          .runTimer(TimerId.AsyncQueueRetry)
          .expectActiveTargets({ query })
          .expectEvents(query, {
            added: [doc1],
            fromCache: true,
            hasPendingWrites: true
          })
      );
    }
  );

  specTest(
    'Multiple user changes during transaction failure (with recovery)',
    ['durable-persistence'],
    () => {
      const query = Query.atPath(path('collection'));
      const doc1 = doc(
        'collection/key1',
        0,
        { foo: 'a' },
        { hasLocalMutations: true }
      );
      return (
        spec()
          .changeUser('user1')
          .userSets('collection/key1', { foo: 'a' })
          .userListens(query)
          .expectEvents(query, {
            added: [doc1],
            fromCache: true,
            hasPendingWrites: true
          })
          // Change the user to user2 and back to user1 while IndexedDB is failed
          .failDatabaseTransactions('Handle user change')
          .changeUser('user2')
          // The network is offline due to the failed user change
          .expectActiveTargets()
          .changeUser('user1')
          .recoverDatabase()
          .runTimer(TimerId.AsyncQueueRetry)
          .expectActiveTargets({ query })
          // We are now user 2
          .expectEvents(query, { removed: [doc1], fromCache: true })
          .runTimer(TimerId.AsyncQueueRetry)
          // We are now user 1
          .expectEvents(query, {
            added: [doc1],
            fromCache: true,
            hasPendingWrites: true
          })
      );
    }
  );
});
