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
import { Query } from '../../../../src/firestore/core/query';
import { doc, path } from '../../util/helpers';

import { describeSpec, specTest } from './describe_spec';
import { spec } from './spec_builder';

describeSpec('Persistence:', ['persistence'], () => {
  specTest('Local mutations are persisted and re-sent', [], () => {
    return spec()
      .userSets('collection/key1', { foo: 'bar' })
      .userSets('collection/key2', { baz: 'quu' })
      .restart()
      .expectNumOutstandingWrites(2)
      .writeAcks(1, { expectUserCallback: false })
      .writeAcks(2, { expectUserCallback: false })
      .expectNumOutstandingWrites(0);
  });

  specTest('Persisted local mutations are visible to listeners', [], () => {
    const query = Query.atPath(path('collection'));
    return (
      spec()
        .userSets('collection/key1', { foo: 'bar' })
        .userSets('collection/key2', { baz: 'quu' })
        .restart()
        // It should be visible to listens.
        .userListens(query)
        .expectEvents(query, {
          added: [
            doc(
              'collection/key1',
              0,
              { foo: 'bar' },
              { hasLocalMutations: true }
            ),
            doc(
              'collection/key2',
              0,
              { baz: 'quu' },
              { hasLocalMutations: true }
            )
          ],
          fromCache: true,
          hasPendingWrites: true
        })
    );
  });

  specTest('Remote documents are persisted', [], () => {
    const query = Query.atPath(path('collection'));
    const doc1 = doc('collection/key', 1000, { foo: 'bar' });
    return spec()
      .userListens(query)
      .watchAcksFull(query, 1000, doc1)
      .expectEvents(query, { added: [doc1] })
      .restart()
      .userListens(query, 'resume-token-1000')
      .expectEvents(query, { added: [doc1], fromCache: true });
  });

  specTest("Remote documents from watch are not GC'd", [], () => {
    const query = Query.atPath(path('collection'));
    const doc1 = doc('collection/key', 1000, { foo: 'bar' });
    return (
      spec()
        .withGCEnabled(false)
        .userListens(query)
        .watchAcksFull(query, 1000, doc1)
        .expectEvents(query, { added: [doc1] })
        // Normally this would clear the cached remote documents.
        .userUnlistens(query)
        .userListens(query, 'resume-token-1000')
        .expectEvents(query, { added: [doc1], fromCache: true })
    );
  });

  specTest("Remote documents from user sets are not GC'd", [], () => {
    const query = Query.atPath(path('collection'));
    return (
      spec()
        .withGCEnabled(false)
        .userSets('collection/key', { foo: 'bar' })
        // Normally the write would get GC'd from remote documents here.
        .writeAcks(1000)
        .userListens(query)
        // Version is 0 since we never received a server version via watch.
        .expectEvents(query, {
          added: [doc('collection/key', 0, { foo: 'bar' })],
          fromCache: true
        })
    );
  });

  specTest('Mutation Queue is persisted across uid switches', [], () => {
    return spec()
      .userSets('users/anon', { uid: 'anon' })
      .changeUser('user1')
      .expectNumOutstandingWrites(0)
      .userSets('users/user1', { uid: 'user1' })
      .userSets('users/user1', { uid: 'user1', extra: true })
      .changeUser(null)
      .expectNumOutstandingWrites(1)
      .writeAcks(1000)
      .changeUser('user1')
      .expectNumOutstandingWrites(2)
      .writeAcks(2000)
      .writeAcks(3000);
  });

  specTest(
    'Mutation Queue is persisted across uid switches (with restarts)',
    [],
    () => {
      return spec()
        .userSets('users/anon', { uid: 'anon' })
        .changeUser('user1')
        .expectNumOutstandingWrites(0)
        .userSets('users/user1', { uid: 'user1' })
        .userSets('users/user1', { uid: 'user1', extra: true })
        .changeUser(null)
        .restart()
        .expectNumOutstandingWrites(1)
        .writeAcks(1000, { expectUserCallback: false })
        .changeUser('user1')
        .restart()
        .expectNumOutstandingWrites(2)
        .writeAcks(2000, { expectUserCallback: false })
        .writeAcks(3000, { expectUserCallback: false });
    }
  );

  specTest('Visible mutations reflect uid switches', [], () => {
    const query = Query.atPath(path('users'));
    const existingDoc = doc('users/existing', 0, { uid: 'existing' });
    const anonDoc = doc(
      'users/anon',
      0,
      { uid: 'anon' },
      { hasLocalMutations: true }
    );
    const user1Doc = doc(
      'users/user1',
      0,
      { uid: 'user1' },
      { hasLocalMutations: true }
    );
    return (
      spec()
        .userListens(query)
        .watchAcksFull(query, 500, existingDoc)
        .expectEvents(query, { added: [existingDoc] })
        .userSets('users/anon', { uid: 'anon' })
        .expectEvents(query, { added: [anonDoc], hasPendingWrites: true })
        .changeUser('user1')
        // A user change will re-send the query with the current resume token
        .expectActiveTargets({ query, resumeToken: 'resume-token-500' })
        .expectEvents(query, { removed: [anonDoc] })
        .userSets('users/user1', { uid: 'user1' })
        .expectEvents(query, { added: [user1Doc], hasPendingWrites: true })
        .changeUser(null)
        .expectEvents(query, {
          removed: [user1Doc],
          added: [anonDoc],
          hasPendingWrites: true
        })
    );
  });
});
