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
import { doc, path } from '../../util/helpers';
import { Code } from '../../../src/util/error';
import { RpcError } from './spec_rpc_error';

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
          .failDatabase()
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
    'Query raises events in secondary client  (with recovery)',
    ['multi-client'],
    () => {
      const query = Query.atPath(path('collection'));

      return client(0)
        .expectPrimaryState(true)
        .client(1)
        .expectPrimaryState(false)
        .userListens(query)
        .failDatabase()
        .client(0)
        .expectListen(query)
        .watchAcksFull(query, 1000)
        .client(1)
        .recoverDatabase()
        .runTimer(TimerId.AsyncQueueRetry)
        .expectEvents(query, {});
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
          .failDatabase()
          .client(1)
          .userListens(query)
          .client(0)
          // The primary client 0 receives a WebStorage notification about the
          // new query, but it cannot load the target from IndexedDB. The
          // query will only be listened to once we recover the database.
          .recoverDatabase()
          .runTimer(TimerId.AsyncQueueRetry)
          .expectListen(query)
          .failDatabase()
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

  specTest('Recovers when write cannot be persisted', [], () => {
    return spec()
      .userSets('collection/key1', { foo: 'a' })
      .expectNumOutstandingWrites(1)
      .failDatabase()
      .userSets('collection/key2', { bar: 'b' })
      .expectUserCallbacks({ rejected: ['collection/key2'] })
      .recoverDatabase()
      .expectNumOutstandingWrites(1)
      .userSets('collection/key3', { baz: 'c' })
      .expectNumOutstandingWrites(2)
      .writeAcks('collection/key1', 1)
      .writeAcks('collection/key3', 2)
      .expectNumOutstandingWrites(0);
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
      .failDatabase()
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
      .failDatabase()
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
      .failDatabase()
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
        .failDatabase()
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
        .failDatabase()
        .writeAcks('collection/a', 1, { expectUserCallback: false })
        // The write ack cannot be persisted and the client goes offline, which
        // clears all active targets, but doesn't raise a new snapshot since
        // the document is still marked `hasPendingWrites`.
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
});
