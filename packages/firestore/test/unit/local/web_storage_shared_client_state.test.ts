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
  LocalClientState,
  MutationMetadata,
  ClientId,
  SharedClientState
} from '../../../src/local/shared_client_state';
import { BatchId, TargetId } from '../../../src/core/types';
import { AutoId } from '../../../src/util/misc';
import { expect } from 'chai';
import { User } from '../../../src/auth/user';
import { FirestoreError } from '../../../src/util/error';
import { SharedClientStateSyncer } from '../../../src/local/shared_client_state_syncer';
import { AsyncQueue } from '../../../src/util/async_queue';
import {
  clearWebStorage,
  TEST_PERSISTENCE_PREFIX
} from './persistence_test_helpers';

/**
 * The tests assert that the lastUpdateTime of each row in LocalStorage gets
 * updated. We allow a 0.1s difference in update time to account for processing
 * and locking time in LocalStorage.
 */
const GRACE_INTERVAL_MS = 100;

const AUTHENTICATED_USER = new User('test');
const UNAUTHENTICATED_USER = User.UNAUTHENTICATED;

function mutationKey(user: User, batchId: BatchId) {
  if (user.isAuthenticated()) {
    return `fs_mutations_${
      persistenceHelpers.TEST_PERSISTENCE_PREFIX
    }_${batchId}_${user.uid}`;
  } else {
    return `fs_mutations_${
      persistenceHelpers.TEST_PERSISTENCE_PREFIX
    }_${batchId}`;
  }
}

interface TestSharedClientState {
  pendingBatches: BatchId[];
  acknowledgedBatches: BatchId[];
  rejectedBatches: { [batchId: number]: FirestoreError };
}

/**
 * Implementation of `SharedClientStateSyncer` that aggregates its callback
 * data and exposes it via `.sharedClientState`.
 */
class TestSharedClientSyncer implements SharedClientStateSyncer {
  private pendingBatches: BatchId[] = [];
  private acknowledgedBatches: BatchId[] = [];
  private rejectedBatches: { [batchId: number]: FirestoreError } = {};

  constructor(public activeClients: ClientId[]) {}

  get sharedClientState(): TestSharedClientState {
    return {
      pendingBatches: this.pendingBatches,
      acknowledgedBatches: this.acknowledgedBatches,
      rejectedBatches: this.rejectedBatches
    };
  }

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

  async getActiveClients(): Promise<ClientId[]> {
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

  let queue: AsyncQueue;
  let primaryClientId;
  let sharedClientState: SharedClientState;
  let clientSyncer: TestSharedClientSyncer;

  let previousAddEventListener;

  let writeToLocalStorage: (
    key: string,
    value: string | null
  ) => void = () => {};

  beforeEach(() => {
    clearWebStorage();
    previousAddEventListener = window.addEventListener;

    // We capture the listener here so that we can invoke it from the local
    // client. If we directly relied on LocalStorage listeners, we would not
    // receive events for local writes.
    window.addEventListener = (type, callback) => {
      expect(type).to.equal('storage');
      writeToLocalStorage = (key, value) => {
        callback({
          key,
          storageArea: window.localStorage,
          newValue: value
        });
      };
    };

    primaryClientId = AutoId.newId();
    queue = new AsyncQueue();
    sharedClientState = new WebStorageSharedClientState(
      queue,
      TEST_PERSISTENCE_PREFIX,
      primaryClientId,
      AUTHENTICATED_USER
    );
    clientSyncer = new TestSharedClientSyncer([primaryClientId]);
    sharedClientState.syncEngine = clientSyncer;
  });

  afterEach(() => {
    sharedClientState.shutdown();
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

  // TODO(multitab): Add tests for acknowledged and failed batches once
  // SharedClientState can handle these updates.
  describe('persists mutation batches', () => {
    function assertBatchState(
      batchId: BatchId,
      mutationBatchState: string,
      err?: FirestoreError
    ): void {
      const actual = JSON.parse(
        localStorage.getItem(mutationKey(AUTHENTICATED_USER, batchId))
      );

      expect(actual.state).to.equal(mutationBatchState);

      const expectedMembers = ['state'];

      if (mutationBatchState === 'error') {
        expectedMembers.push('error');
        expect(actual.error.code).to.equal(err.code);
        expect(actual.error.message).to.equal(err.message);
      }

      expect(Object.keys(actual)).to.have.members(expectedMembers);
    }

    beforeEach(() => {
      return sharedClientState.start();
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
      return sharedClientState.start();
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
      const existingClientId = AutoId.newId();

      return persistenceHelpers
        .populateWebStorage(
          AUTHENTICATED_USER,
          existingClientId,
          [1, 2],
          [3, 4]
        )
        .then(() => {
          clientSyncer.activeClients = [primaryClientId, existingClientId];
          return sharedClientState.start();
        });
    });

    async function verifyState(
      minBatchId: BatchId | null,
      expectedTargets: TargetId[]
    ) {
      await queue.drain();
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
      const secondaryClientStateKey = `fs_clients_${
        persistenceHelpers.TEST_PERSISTENCE_PREFIX
      }_${AutoId.newId()}`;

      // The prior client has one pending mutation and two active query targets
      verifyState(1, [3, 4]);

      const oldState = new LocalClientState();
      oldState.addQueryTarget(5);

      writeToLocalStorage(
        secondaryClientStateKey,
        oldState.toLocalStorageJSON()
      );
      verifyState(1, [3, 4, 5]);

      const updatedState = new LocalClientState();
      updatedState.addQueryTarget(5);
      updatedState.addQueryTarget(6);
      updatedState.addPendingMutation(0);

      writeToLocalStorage(
        secondaryClientStateKey,
        updatedState.toLocalStorageJSON()
      );
      verifyState(0, [3, 4, 5, 6]);

      writeToLocalStorage(secondaryClientStateKey, null);
      verifyState(1, [3, 4]);
    });

    it('ignores invalid data', () => {
      const secondaryClientStateKey = `fs_clients_${
        persistenceHelpers.TEST_PERSISTENCE_PREFIX
      }_${AutoId.newId()}`;

      const invalidState = {
        lastUpdateTime: 'invalid',
        activeTargetIds: [5]
      };

      // The prior instance has one pending mutation and two active query targets
      verifyState(1, [3, 4]);

      // We ignore the newly added target.
      writeToLocalStorage(
        secondaryClientStateKey,
        JSON.stringify(invalidState)
      );
      verifyState(1, [3, 4]);
    });
  });

  describe('processes mutation updates', () => {
    beforeEach(() => {
      return sharedClientState.start();
    });

    async function withUser(
      user: User,
      fn: () => Promise<void>
    ): Promise<TestSharedClientState> {
      await sharedClientState.handleUserChange(user);
      await fn();
      await queue.drain();
      return clientSyncer.sharedClientState;
    }

    it('for pending mutation', () => {
      return withUser(AUTHENTICATED_USER, async () => {
        writeToLocalStorage(
          mutationKey(AUTHENTICATED_USER, 1),
          new MutationMetadata(
            AUTHENTICATED_USER,
            1,
            'pending'
          ).toLocalStorageJSON()
        );
      }).then(clientState => {
        expect(clientState.pendingBatches).to.have.members([1]);
        expect(clientState.acknowledgedBatches).to.be.empty;
        expect(clientState.rejectedBatches).to.be.empty;
      });
    });

    it('for acknowledged mutation', () => {
      return withUser(AUTHENTICATED_USER, async () => {
        writeToLocalStorage(
          mutationKey(AUTHENTICATED_USER, 1),
          new MutationMetadata(
            AUTHENTICATED_USER,
            1,
            'acknowledged'
          ).toLocalStorageJSON()
        );
      }).then(clientState => {
        expect(clientState.pendingBatches).to.be.empty;
        expect(clientState.acknowledgedBatches).to.have.members([1]);
        expect(clientState.rejectedBatches).to.be.empty;
      });
    });

    it('for rejected mutation', () => {
      return withUser(AUTHENTICATED_USER, async () => {
        writeToLocalStorage(
          mutationKey(AUTHENTICATED_USER, 1),
          new MutationMetadata(
            AUTHENTICATED_USER,
            1,
            'rejected',
            new FirestoreError('internal', 'Test Error')
          ).toLocalStorageJSON()
        );
      }).then(clientState => {
        expect(clientState.pendingBatches).to.be.empty;
        expect(clientState.acknowledgedBatches).to.be.empty;
        expect(clientState.rejectedBatches[1].code).to.equal('internal');
        expect(clientState.rejectedBatches[1].message).to.equal('Test Error');
      });
    });

    it('handles unauthenticated user', () => {
      return withUser(UNAUTHENTICATED_USER, async () => {
        writeToLocalStorage(
          mutationKey(UNAUTHENTICATED_USER, 1),
          new MutationMetadata(
            UNAUTHENTICATED_USER,
            1,
            'pending'
          ).toLocalStorageJSON()
        );
      }).then(clientState => {
        expect(clientState.pendingBatches).to.have.members([1]);
      });
    });

    it('ignores different user', () => {
      return withUser(AUTHENTICATED_USER, async () => {
        const otherUser = new User('foobar');

        writeToLocalStorage(
          mutationKey(AUTHENTICATED_USER, 1),
          new MutationMetadata(
            AUTHENTICATED_USER,
            1,
            'pending'
          ).toLocalStorageJSON()
        );
        writeToLocalStorage(
          mutationKey(otherUser, 1),
          new MutationMetadata(otherUser, 2, 'pending').toLocalStorageJSON()
        );
      }).then(clientState => {
        expect(clientState.pendingBatches).to.have.members([1]);
      });
    });

    it('ignores invalid data', () => {
      return withUser(AUTHENTICATED_USER, async () => {
        writeToLocalStorage(
          mutationKey(AUTHENTICATED_USER, 1),
          new MutationMetadata(
            AUTHENTICATED_USER,
            1,
            'invalid' as any
          ).toLocalStorageJSON()
        );
      }).then(clientState => {
        expect(clientState.pendingBatches).to.be.empty;
        expect(clientState.acknowledgedBatches).to.be.empty;
        expect(clientState.rejectedBatches).to.be.empty;
      });
    });
  });
});
