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

import { doc, query } from '../../util/helpers';

import { TimerId } from '../../../src/util/async_queue';
import { describeSpec, specTest } from './describe_spec';
import { client, spec } from './spec_builder';

describeSpec('Persistence:', [], () => {
  specTest(
    'Local mutations are persisted and re-sent',
    ['durable-persistence'],
    () => {
      return spec()
        .userSets('collection/key1', { foo: 'bar' })
        .userSets('collection/key2', { baz: 'quu' })
        .restart()
        .expectNumOutstandingWrites(2)
        .writeAcks('collection/key1', 1, { expectUserCallback: false })
        .writeAcks('collection/key2', 2, { expectUserCallback: false })
        .expectNumOutstandingWrites(0);
    }
  );

  specTest(
    'Persisted local mutations are visible to listeners',
    ['durable-persistence'],
    () => {
      const query1 = query('collection');
      return (
        spec()
          .userSets('collection/key1', { foo: 'bar' })
          .userSets('collection/key2', { baz: 'quu' })
          .restart()
          // It should be visible to listens.
          .userListens(query1)
          .expectEvents(query1, {
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
    }
  );

  specTest('Remote documents are persisted', ['durable-persistence'], () => {
    const query1 = query('collection');
    const doc1 = doc('collection/key', 1000, { foo: 'bar' });
    return spec()
      .userListens(query1)
      .watchAcksFull(query1, 1000, doc1)
      .expectEvents(query1, { added: [doc1] })
      .restart()
      .userListens(query1, 'resume-token-1000')
      .expectEvents(query1, { added: [doc1], fromCache: true });
  });

  specTest("Remote documents from watch are not GC'd", [], () => {
    const query1 = query('collection');
    const doc1 = doc('collection/key', 1000, { foo: 'bar' });
    return (
      spec()
        .withGCEnabled(false)
        .userListens(query1)
        .watchAcksFull(query1, 1000, doc1)
        .expectEvents(query1, { added: [doc1] })
        // Normally this would clear the cached remote documents.
        .userUnlistens(query1)
        .userListens(query1, 'resume-token-1000')
        .expectEvents(query1, { added: [doc1], fromCache: true })
    );
  });

  specTest("Remote documents from user sets are not GC'd", [], () => {
    const query1 = query('collection');
    return (
      spec()
        .withGCEnabled(false)
        .userSets('collection/key', { foo: 'bar' })
        // Normally the write would get GC'd from remote documents here.
        .writeAcks('collection/key', 1000)
        .userListens(query1)
        // Version is 0 since we never received a server version via watch.
        .expectEvents(query1, {
          added: [
            doc(
              'collection/key',
              1000,
              { foo: 'bar' },
              { hasCommittedMutations: true }
            )
          ],
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
      .writeAcks('users/anon', 1000)
      .changeUser('user1')
      .expectNumOutstandingWrites(2)
      .writeAcks('users/user1', 2000)
      .writeAcks('users/user1', 3000);
  });

  specTest(
    'Mutation Queue is persisted across uid switches (with restarts)',
    ['durable-persistence'],
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
        .writeAcks('users/anon', 1000, { expectUserCallback: false })
        .changeUser('user1')
        .restart()
        .expectNumOutstandingWrites(2)
        .writeAcks('users/user1', 2000, { expectUserCallback: false })
        .writeAcks('users/user2', 3000, { expectUserCallback: false });
    }
  );

  specTest('Visible mutations reflect uid switches', [], () => {
    const query1 = query('users');
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
        .userListens(query1)
        .watchAcksFull(query1, 500, existingDoc)
        .expectEvents(query1, { added: [existingDoc] })
        .userSets('users/anon', { uid: 'anon' })
        .expectEvents(query1, { added: [anonDoc], hasPendingWrites: true })
        .changeUser('user1')
        // A user change will re-send the query with the current resume token
        .expectActiveTargets({ query: query1, resumeToken: 'resume-token-500' })
        .expectEvents(query1, { removed: [anonDoc] })
        .userSets('users/user1', { uid: 'user1' })
        .expectEvents(query1, { added: [user1Doc], hasPendingWrites: true })
        .changeUser(null)
        .expectEvents(query1, {
          removed: [user1Doc],
          added: [anonDoc],
          hasPendingWrites: true
        })
    );
  });

  specTest('Detects all active clients', ['multi-client'], () => {
    return (
      client(0)
        // While we don't verify the client's visibility in this test, the spec
        // test framework requires an explicit action before setting an
        // expectation.
        .becomeHidden()
        .expectNumActiveClients(1)
        .client(1)
        .becomeVisible()
        .expectNumActiveClients(2)
    );
  });

  specTest('Single tab acquires primary lease', ['multi-client'], () => {
    // This test simulates primary state handoff between two background tabs.
    // With all instances in the background, the first active tab acquires
    // ownership.
    return client(0)
      .becomeHidden()
      .expectPrimaryState(true)
      .client(1)
      .becomeHidden()
      .expectPrimaryState(false)
      .client(0)
      .shutdown()
      .client(1)
      .runTimer(TimerId.ClientMetadataRefresh)
      .expectPrimaryState(true);
  });

  specTest('Foreground tab acquires primary lease', ['multi-client'], () => {
    // This test verifies that in a multi-client scenario, a foreground tab
    // takes precedence when a new primary client is elected.
    return (
      client(0)
        .becomeHidden()
        .expectPrimaryState(true)
        .client(1)
        .becomeHidden()
        .expectPrimaryState(false)
        .client(2)
        .becomeVisible()
        .expectPrimaryState(false)
        .client(0)
        // Shutdown the client that is currently holding the primary lease.
        .shutdown()
        .client(1)
        // Client 1 is in the background and doesn't grab the primary lease as
        // client 2 is in the foreground.
        .runTimer(TimerId.ClientMetadataRefresh)
        .expectPrimaryState(false)
        .client(2)
        .runTimer(TimerId.ClientMetadataRefresh)
        .expectPrimaryState(true)
    );
  });

  specTest('Primary lease bound to network state', ['multi-client'], () => {
    return (
      client(0)
        // If there is only a single tab, the online state is ignored and the
        // tab is always primary
        .expectPrimaryState(true)
        .disableNetwork()
        .expectPrimaryState(true)
        .client(1)
        .expectPrimaryState(false)
        .client(0)
        // If the primary tab is offline, and another tab becomes active, the
        // primary tab releases its primary lease.
        .runTimer(TimerId.ClientMetadataRefresh)
        .expectPrimaryState(false)
        .client(1)
        .runTimer(TimerId.ClientMetadataRefresh)
        .expectPrimaryState(true)
        .disableNetwork()
        // If all tabs are offline, the primary lease is retained.
        .expectPrimaryState(true)
        .client(0)
        .enableNetwork()
        .expectPrimaryState(false)
        .client(1)
        .runTimer(TimerId.ClientMetadataRefresh)
        // The offline primary tab releases its lease since another tab is now
        // online.
        .expectPrimaryState(false)
        .client(0)
        .runTimer(TimerId.ClientMetadataRefresh)
        .expectPrimaryState(true)
    );
  });

  specTest(
    'clearPersistence() shuts down other clients',
    ['multi-client'],
    () => {
      return client(0)
        .becomeVisible()
        .client(1)
        .client(2)
        .client(0)
        .shutdown()
        .clearPersistence()
        .client(1)
        .expectIsShutdown()
        .client(2)
        .expectIsShutdown();
    }
  );
});
