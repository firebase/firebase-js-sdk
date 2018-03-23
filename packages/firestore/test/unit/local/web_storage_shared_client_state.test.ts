/**
 * Copyright 2018 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * withOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as persistenceHelpers from './persistence_test_helpers';
import {
  WebStorageSharedClientState,
  SharedClientState,
  LocalClientState,
  MutationMetadata,
  ClientKey
} from '../../../src/local/shared_client_state';
import { BatchId, TargetId } from '../../../src/core/types';
import { AutoId } from '../../../src/util/misc';
import { expect } from 'chai';
import { User } from '../../../src/auth/user';
import { FirestoreError } from '../../../src/util/error';
import { SharedClientStateSyncer } from '../../../src/local/shared_client_state_syncer';

/**
 * The tests assert that the lastUpdateTime of each row in LocalStorage gets
 * updated. We allow a 0.1s difference in update time to account for processing
 * and locking time in LocalStorage.
 */
const GRACE_INTERVAL_MS = 100;

const TEST_USER = new User('test');

function mutationKey(batchId: BatchId) {
  return `fs_mutations_${
    persistenceHelpers.TEST_PERSISTENCE_PREFIX
  }_${batchId}_${TEST_USER.uid}`;
}

/**
 * Implementation of `SharedClientStateSyncer` that aggregates its callback data.
 */
class TestClientSyncer implements SharedClientStateSyncer {
  readonly pendingBatches: BatchId[] = [];
  readonly acknowledgedBatches: BatchId[] = [];
  readonly rejectedBatches: { [batchId: number]: FirestoreError } = {};

  constructor(private readonly activeClients: ClientKey[]) {}

  async applyPendingBatch(batchId: BatchId): Promise<void> {
    this.pendingBatches.push(batchId);
  }

  async applySuccessfulWrite(batchId: BatchId): Promise<void> {
    this.acknowledgedBatches.push(batchId);
  }

  async rejectFailedWrite(
    batchId: BatchId,
    err: FirestoreError
  ): Promise<void> {
    this.rejectedBatches[batchId] = err;
  }

  async getActiveClients(): Promise<ClientKey[]> {
    return this.activeClients;
  }
}

describe('WebStorageSharedClientState', () => {
  if (!WebStorageSharedClientState.isAvailable()) {
    console.warn(
      'No LocalStorage. Skipping WebStorageSharedClientState tests.'
    );
    return;
  }

  const localStorage = window.localStorage;

  let sharedClientState: SharedClientState;
  let previousAddEventListener;
  let primaryClientId;

  let writeToLocalStorage: (
    key: string,
    value: string | null
  ) => void = () => {};

  beforeEach(() => {
    primaryClientId = AutoId.newId();
    previousAddEventListener = window.addEventListener;

    // We capture the listener here so that we can invoke it from the local
    // client. If we directly relied on LocalStorage listeners, we would not
    // receive events for local writes.
    window.addEventListener = (type, callback) => {
      expect(type).to.equal('storage');
      writeToLocalStorage = (key, value) => {
        callback({
          key: key,
          storageArea: window.localStorage,
          newValue: value
        });
      };
    };
  });

  afterEach(() => {
    window.addEventListener = previousAddEventListener;
  });

  function assertClientState(
    activeTargetIds: number[],
    minMutationBatchId: number | null,
    maxMutationBatchId: number | null
  ): void {
    const actual = JSON.parse(
      localStorage.getItem(
        `fs_clients_${
          persistenceHelpers.TEST_PERSISTENCE_PREFIX
        }_${primaryClientId}`
      )
    );

    expect(Object.keys(actual)).to.have.members([
      'lastUpdateTime',
      'activeTargetIds',
      'minMutationBatchId',
      'maxMutationBatchId'
    ]);
    expect(actual.lastUpdateTime)
      .to.be.a('number')
      .greaterThan(Date.now() - GRACE_INTERVAL_MS)
      .and.at.most(Date.now());
    expect(actual.activeTargetIds)
      .to.be.an('array')
      .and.have.members(activeTargetIds);
    expect(actual.minMutationBatchId).to.equal(minMutationBatchId);
    expect(actual.maxMutationBatchId).to.equal(maxMutationBatchId);
  }

  function assertBatchState(
    batchId: BatchId,
    mutationBatchState: string,
    err?: FirestoreError
  ): void {
    const actual = JSON.parse(localStorage.getItem(mutationKey(batchId)));

    expect(actual.state).to.equal(mutationBatchState);

    const expectedMembers = ['state'];

    if (mutationBatchState === 'error') {
      expectedMembers.push('error');
      expect(actual.error.code).to.equal(err.code);
      expect(actual.error.message).to.equal(err.message);
    }

    expect(Object.keys(actual)).to.have.members(expectedMembers);
  }

  // TODO(multitab): Add tests for acknowledged and failed batches once
  // SharedClientState can handle these updates.
  describe('persists mutation batches', () => {
    beforeEach(() => {
      return persistenceHelpers
        .testWebStorageSharedClientState(TEST_USER, primaryClientId)
        .then(clientState => {
          sharedClientState = clientState;
        });
    });

    afterEach(() => {
      sharedClientState.shutdown();
    });

    it('when empty', () => {
      assertClientState([], null, null);
    });

    it('with one pending batch', () => {
      sharedClientState.addLocalPendingMutation(0);
      assertClientState([], 0, 0);
      assertBatchState(0, 'pending');
    });

    it('with multiple pending batches', () => {
      sharedClientState.addLocalPendingMutation(0);
      sharedClientState.addLocalPendingMutation(1);
      assertClientState([], 0, 1);
      assertBatchState(0, 'pending');
      assertBatchState(1, 'pending');

      sharedClientState.addLocalPendingMutation(2);
      sharedClientState.addLocalPendingMutation(3);
      assertClientState([], 0, 3);
      assertBatchState(2, 'pending');
      assertBatchState(3, 'pending');

      // Note: The Firestore client only ever removes mutations in order.
      sharedClientState.removeLocalPendingMutation(0);
      sharedClientState.removeLocalPendingMutation(2);
      assertClientState([], 1, 3);
    });
  });

  describe('persists query targets', () => {
    beforeEach(() => {
      return persistenceHelpers
        .testWebStorageSharedClientState(TEST_USER, primaryClientId)
        .then(clientState => {
          sharedClientState = clientState;
        });
    });

    afterEach(() => {
      sharedClientState.shutdown();
    });

    it('when empty', () => {
      assertClientState([], null, null);
    });

    it('with multiple targets', () => {
      sharedClientState.addLocalQueryTarget(0);
      assertClientState([0], null, null);

      sharedClientState.addLocalQueryTarget(1);
      sharedClientState.addLocalQueryTarget(2);
      assertClientState([0, 1, 2], null, null);

      sharedClientState.removeLocalQueryTarget(1);
      assertClientState([0, 2], null, null);
    });
  });

  describe('combines client state', () => {
    beforeEach(() => {
      return persistenceHelpers
        .testWebStorageSharedClientState(
          TEST_USER,
          primaryClientId,
          undefined,
          [1, 2],
          [3, 4]
        )
        .then(nc => {
          sharedClientState = nc;
          expect(writeToLocalStorage).to.exist;
        });
    });

    afterEach(() => {
      sharedClientState.shutdown();
    });

    function verifyState(
      minBatchId: BatchId | null,
      expectedTargets: TargetId[]
    ) {
      const actualTargets = sharedClientState.getAllActiveQueryTargets();

      expect(actualTargets.toArray()).to.have.members(expectedTargets);
      expect(sharedClientState.getMinimumGlobalPendingMutation()).to.equal(
        minBatchId
      );
    }

    it('with data from existing client', () => {
      // The prior client has one pending mutation and two active query targets
      verifyState(1, [3, 4]);

      sharedClientState.addLocalPendingMutation(3);
      sharedClientState.addLocalQueryTarget(4);
      verifyState(1, [3, 4]);

      // This is technically invalid as IDs of minimum mutation batches should
      // never decrease over the lifetime of a client, but we use it here to
      // test the underlying logic that extracts the mutation batch IDs.
      sharedClientState.addLocalPendingMutation(0);
      sharedClientState.addLocalQueryTarget(5);
      verifyState(0, [3, 4, 5]);

      sharedClientState.removeLocalPendingMutation(0);
      sharedClientState.removeLocalQueryTarget(5);
      verifyState(1, [3, 4]);
    });

    it('with data from new clients', () => {
      const secondaryClientKey = `fs_clients_${
        persistenceHelpers.TEST_PERSISTENCE_PREFIX
      }_${AutoId.newId()}`;

      // The prior client has one pending mutation and two active query targets
      verifyState(1, [3, 4]);

      const oldState = new LocalClientState();
      oldState.addQueryTarget(5);

      writeToLocalStorage(secondaryClientKey, oldState.toLocalStorageJSON());
      verifyState(1, [3, 4, 5]);

      const updatedState = new LocalClientState();
      updatedState.addQueryTarget(5);
      updatedState.addQueryTarget(6);
      updatedState.addPendingMutation(0);

      writeToLocalStorage(
        secondaryClientKey,
        updatedState.toLocalStorageJSON()
      );
      verifyState(0, [3, 4, 5, 6]);

      writeToLocalStorage(secondaryClientKey, null);
      verifyState(1, [3, 4]);
    });

    it('ignores invalid data', () => {
      const secondaryClientKey = `fs_clients_${
        persistenceHelpers.TEST_PERSISTENCE_PREFIX
      }_${AutoId.newId()}`;

      const invalidState = {
        lastUpdateTime: 'invalid',
        activeTargetIds: [5]
      };

      // The prior instance has one pending mutation and two active query targets
      verifyState(1, [3, 4]);

      // We ignore the newly added target.
      writeToLocalStorage(secondaryClientKey, JSON.stringify(invalidState));
      verifyState(1, [3, 4]);
    });
  });

  describe('processes mutation updates', () => {
    let clientSyncer;

    beforeEach(() => {
      clientSyncer = new TestClientSyncer(primaryClientId);

      return persistenceHelpers
        .testWebStorageSharedClientState(
          TEST_USER,
          primaryClientId,
          clientSyncer
        )
        .then(clientState => {
          sharedClientState = clientState;
          expect(writeToLocalStorage).to.exist;
        });
    });

    afterEach(() => {
      sharedClientState.shutdown();
    });

    it('for pending mutation', () => {
      writeToLocalStorage(
        mutationKey(1),
        new MutationMetadata(TEST_USER, 1, 'pending').toLocalStorageJSON()
      );

      expect(clientSyncer.pendingBatches).to.have.members([1]);
      expect(clientSyncer.acknowledgedBatches).to.be.empty;
      expect(clientSyncer.rejectedBatches).to.be.empty;
    });

    it('for acknowledged mutation', () => {
      writeToLocalStorage(
        mutationKey(1),
        new MutationMetadata(TEST_USER, 1, 'acknowledged').toLocalStorageJSON()
      );

      expect(clientSyncer.pendingBatches).to.be.empty;
      expect(clientSyncer.acknowledgedBatches).to.have.members([1]);
      expect(clientSyncer.rejectedBatches).to.be.empty;
    });

    it('for rejected mutation', () => {
      writeToLocalStorage(
        mutationKey(1),
        new MutationMetadata(
          TEST_USER,
          1,
          'rejected',
          new FirestoreError('internal', 'Test Error')
        ).toLocalStorageJSON()
      );

      expect(clientSyncer.pendingBatches).to.be.empty;
      expect(clientSyncer.acknowledgedBatches).to.be.empty;
      expect(clientSyncer.rejectedBatches[1].code).to.equal('internal');
      expect(clientSyncer.rejectedBatches[1].message).to.equal('Test Error');
    });

    it('ignores invalid data', () => {
      writeToLocalStorage(
        mutationKey(1),
        new MutationMetadata(
          TEST_USER,
          1,
          'invalid' as any
        ).toLocalStorageJSON()
      );

      expect(clientSyncer.pendingBatches).to.be.empty;
      expect(clientSyncer.acknowledgedBatches).to.be.empty;
      expect(clientSyncer.rejectedBatches).to.be.empty;
    });
  });
});
