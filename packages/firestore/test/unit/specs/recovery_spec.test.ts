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
import { spec } from './spec_builder';
import { Query } from '../../../src/core/query';
import { doc, path } from '../../util/helpers';
import { Code } from '../../../src/util/error';
import { RpcError } from './spec_rpc_error';

describeSpec(
  'Persistence Recovery',
  ['durable-persistence', 'no-ios', 'no-android'],
  () => {
    specTest('Recovers when write cannot be persisted', [], () => {
      return spec()
        .userSets('collection/key1', { foo: 'a' })
        .expectNumOutstandingWrites(1)
        .userSets('collection/key2', { bar: 'b' })
        .failDatabaseTransaction({ rejectedDocs: ['collection/key2'] })
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
        .userSets('collection/key2', { foo: 'b' })
        .failDatabaseTransaction({ rejectedDocs: ['collection/key2'] })
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

    specTest(
      'Recovers when write acknowledgement cannot be persisted (with restart)',
      [],
      () => {
        return (
          spec()
            .userSets('collection/key1', { foo: 'a' })
            .userSets('collection/key2', { foo: 'b' })
            // Fail the write ack. We don't reject the user promise since we don't
            // want the user to retry the write
            .writeAcks('collection/key1', 1, { expectUserCallback: true })
            .failDatabaseTransaction()
            .expectNumOutstandingWrites(1)
            // The write stream is now offline. It will reconnect when a new write
            // is issued or upon client restart.
            .restart()
            .expectNumOutstandingWrites(2)
            .failWrite(
              'collection/key1',
              new RpcError(Code.FAILED_PRECONDITION, 'Stream token invalid'),
              { expectUserCallback: false }
            )
            .expectNumOutstandingWrites(1)
            .writeAcks('collection/key2', 2, { expectUserCallback: false })
            .expectNumOutstandingWrites(0)
        );
      }
    );

    specTest(
      'Recovers when write acknowledgement cannot be persisted (with new write)',
      [],
      () => {
        return (
          spec()
            .userSets('collection/key1', { foo: 'a' })
            // Fail the write ack. We resolve the user promise since we don't want
            // the user to retry the write
            .writeAcks('collection/key1', 1, { expectUserCallback: true })
            .failDatabaseTransaction()
            // The write stream is now offline. It will reconnect when a new write
            // is issued or upon client restart.
            .userSets('collection/key2', { foo: 'b' })
            .expectNumOutstandingWrites(2)
            .failWrite(
              'collection/key1',
              new RpcError(Code.FAILED_PRECONDITION, 'Stream token invalid'),
              { expectUserCallback: false }
            )
            .expectNumOutstandingWrites(1)
            .writeAcks('collection/key2', 2)
            .expectNumOutstandingWrites(0)
        );
      }
    );

    specTest(
      'Recovers when write rejection cannot be persisted (with new write)',
      [],
      () => {
        return (
          spec()
            .userPatches('collection/key1', { foo: 'a' })
            .failWrite(
              'collection/key1',
              new RpcError(Code.FAILED_PRECONDITION, 'No document to update'),
              { expectUserCallback: true }
            )
            .failDatabaseTransaction()
            // The write stream is now offline. Re-opening the stream causes both
            // writes to be send.
            .userPatches('collection/key2', { foo: 'b' })
            .expectNumOutstandingWrites(2)
            .failWrite(
              'collection/key1',
              new RpcError(Code.FAILED_PRECONDITION, 'Stream token invalid'),
              { expectUserCallback: false }
            )
            .expectNumOutstandingWrites(1)
            .writeAcks('collection/key2', 2)
            .expectNumOutstandingWrites(0)
        );
      }
    );

    specTest(
      'Recovers when watch update cannot be persisted',
      [],
      () => {
        const query = Query.atPath(path('collection'));
        const doc1 = doc('collection/key1', 1, { foo: 'a' });
        const doc2 = doc('collection/key2', 2, { foo: 'b' });
        return spec()
          .userListens(query)
          .watchAcksFull(query, 1000, doc1)
          .expectEvents(query, {
            added: [doc1]
          })
          .watchSends({ affects: [query] }, doc2)
          .watchSnapshots(2000)
          .failDatabaseTransaction({ rejectedTargets: [query] })
          .expectEvents(query, { errorCode: Code.INTERNAL })
          .watchRemoves(query)
          .userListens(query, 'resume-token-1000')
          .expectEvents(query, {
            added: [doc1],
            fromCache: true
          })
          .watchAcksFull(query, 2000, doc2)
          .expectEvents(query, {
            added: [doc2]
          });
      }
    );

    specTest('Only fails targets that cannot be persisted', [], () => {
      const query1 = Query.atPath(path('collection1'));
      const query2 = Query.atPath(path('collection2'));
      const doc1a = doc('collection1/keyA', 1, { foo: 'a' });
      const doc2a = doc('collection2/keyA', 2, { foo: 'b' });
      const doc1b = doc('collection1/keyB', 3, { foo: 'b' });
      const doc2b = doc('collection2/keyB', 4, { foo: 'b' });
      return spec()
        .userListens(query1)
        .watchAcksFull(query1, 1, doc1a)
        .expectEvents(query1, {
          added: [doc1a]
        })
        .userListens(query2)
        .watchAcksFull(query2, 2, doc2a)
        .expectEvents(query2, {
          added: [doc2a]
        })
        .watchSends({ affects: [query1] }, doc1b)
        .watchSnapshots(3)
        .failDatabaseTransaction({ rejectedTargets: [query1] })
        .expectEvents(query1, { errorCode: Code.INTERNAL })
        .watchSends({ affects: [query2] }, doc2b)
        .watchSnapshots(4)
        .expectEvents(query2, {
          added: [doc2b]
        });
    });
  }
);
