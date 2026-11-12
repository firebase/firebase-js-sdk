/**
 * @license
 * Copyright 2026 Google LLC
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
import { createSandbox } from 'sinon';

import {
  ReferenceImpl,
  ValueEventRegistration
} from '../src/api/Reference_impl';
import { Repo, repoStartTransaction, repoUpdate } from '../src/core/Repo';
import { RepoInfo } from '../src/core/RepoInfo';
import { ServerActions } from '../src/core/ServerActions';
import { nodeFromJSON } from '../src/core/snap/nodeFromJSON';
import { SnapshotHolder } from '../src/core/SnapshotHolder';
import {
  SyncTree,
  syncTreeAddEventRegistration,
  syncTreeApplyServerOverwrite,
  syncTreeCalcCompleteEventCache
} from '../src/core/SyncTree';
import { Path } from '../src/core/util/Path';
import { CallbackContext } from '../src/core/view/EventRegistration';

describe('Repo transaction cancellation', () => {
  const sandbox = createSandbox();

  afterEach(() => sandbox.restore());

  for (const applyLocally of [false, true]) {
    for (const multiPathUpdate of [false, true]) {
      it(`cleans up a stale transaction after ${
        multiPathUpdate ? 'a multi-path update' : 'two overlapping updates'
      } (applyLocally=${applyLocally})`, () => {
        const clock = sandbox.useFakeTimers();
        const repo = new Repo(
          new RepoInfo('test.firebaseio.com', true, 'test', false),
          false,
          null,
          null
        );
        const server = sandbox.createStubInstance(ServerActions);
        repo.server_ = server;
        repo.infoData_ = new SnapshotHolder();
        repo.serverSyncTree_ = new SyncTree({
          startListening: () => [],
          stopListening: () => {}
        });

        const path = new Path('task');
        syncTreeAddEventRegistration(
          repo.serverSyncTree_,
          new ReferenceImpl(repo, path),
          new ValueEventRegistration(new CallbackContext(() => {}))
        );
        const initial = { value: 'initial' };
        syncTreeApplyServerOverwrite(
          repo.serverSyncTree_,
          path,
          nodeFromJSON(initial)
        );

        const onComplete = sandbox.spy();
        const unwatcher = sandbox.spy();
        repoStartTransaction(
          repo,
          path,
          () => ({ value: 'pending transaction' }),
          onComplete,
          unwatcher,
          applyLocally
        );
        expect(server.put.callCount).to.equal(1);

        // Each updated path tries to abort the same outstanding transaction.
        if (multiPathUpdate) {
          repoUpdate(repo, path, { 'events/a': 1, 'events/b': 2 }, null);
        } else {
          repoUpdate(repo, path, { 'events/a': 1 }, null);
          repoUpdate(repo, path, { 'events/b': 2 }, null);
        }
        expect(onComplete.called).to.equal(false);

        const serverValue = { ...initial, events: { a: 1, b: 2 } };
        syncTreeApplyServerOverwrite(
          repo.serverSyncTree_,
          path,
          nodeFromJSON(serverValue)
        );
        for (const call of server.merge.getCalls()) {
          call.args[2]('ok', null);
        }
        server.put.firstCall.args[2](
          'datastale',
          'Transaction ETag does not match'
        );
        clock.runAll();

        expect(onComplete.callCount).to.equal(1);
        expect(onComplete.firstCall.args[0].message).to.equal('set');
        expect(onComplete.firstCall.args[1]).to.equal(false);
        expect(unwatcher.callCount).to.equal(1);
        expect(repo.serverSyncTree_.pendingWriteTree_.allWrites).to.be.empty;
        expect(
          syncTreeCalcCompleteEventCache(repo.serverSyncTree_, path).val()
        ).to.deep.equal(serverValue);

        // A later transaction must use server data, not the abandoned output.
        const update = sandbox.spy(value => value);
        repoStartTransaction(
          repo,
          path,
          update,
          () => {},
          () => {},
          false
        );
        expect(update.firstCall.args[0]).to.deep.equal(serverValue);
        server.put.secondCall.args[2]('ok', null);
        expect(repo.serverSyncTree_.pendingWriteTree_.allWrites).to.be.empty;
      });
    }
  }
});
