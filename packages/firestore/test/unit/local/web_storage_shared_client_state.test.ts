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
  SharedClientState,
  QueryTargetMetadata
} from '../../../src/local/shared_client_state';
import { BatchId, MutationBatchState, TargetId } from '../../../src/core/types';
import { AutoId } from '../../../src/util/misc';
import { expect } from 'chai';
import { User } from '../../../src/auth/user';
import { FirestoreError } from '../../../src/util/error';
import {
  SharedClientStateSyncer,
  QueryTargetState
} from '../../../src/local/shared_client_state_syncer';
import { AsyncQueue } from '../../../src/util/async_queue';
import {
  clearWebStorage,
  TEST_PERSISTENCE_PREFIX
} from './persistence_test_helpers';
import { BrowserPlatform } from '../../../src/platform_browser/browser_platform';
import { fail } from '../../../src/util/assert';
import { PlatformSupport } from '../../../src/platform/platform';
import * as objUtils from '../../../src/util/obj';

/**
 * The tests assert that the lastUpdateTime of each row in LocalStorage gets
 * updated. We allow a 0.1s difference in update time to account for processing
 * and locking time in LocalStorage.
 */
const GRACE_INTERVAL_MS = 100;

const AUTHENTICATED_USER = new User('test');
const UNAUTHENTICATED_USER = User.UNAUTHENTICATED;
const TEST_ERROR = new FirestoreError('internal', 'Test Error');

function mutationKey(user: User, batchId: BatchId): string {
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

function targetKey(targetId: TargetId): string {
  return `fs_targets_${persistenceHelpers.TEST_PERSISTENCE_PREFIX}_${targetId}`;
}

interface TestSharedClientState {
  pendingBatches: BatchId[];
  acknowledgedBatches: BatchId[];
  rejectedBatches: { [batchId: number]: FirestoreError };
  pendingTargets: TargetId[];
  activeTargets: TargetId[];
  currentTargets: TargetId[];
  rejectedTargets: { [batchId: number]: FirestoreError };
}

/**
 * Implementation of `SharedClientStateSyncer` that aggregates its callback
 * data and exposes it via `.sharedClientState`.
 */
class TestSharedClientSyncer implements SharedClientStateSyncer {
  private mutationBatches: {
    [batchId: number]: { state: MutationBatchState; error?: FirestoreError };
  } = {};
  private queryTargets: {
    [targetId: number]: { state: QueryTargetState; error?: FirestoreError };
  } = {};

  constructor(public activeClients: ClientId[]) {}

  get sharedClientState(): TestSharedClientState {
    const state: TestSharedClientState = {
      pendingBatches: [],
      acknowledgedBatches: [],
      rejectedBatches: {},
      pendingTargets: [],
      activeTargets: [],
      currentTargets: [],
      rejectedTargets: {}
    };

    objUtils.forEachNumber(this.mutationBatches, (batchId, val) => {
      switch (val.state) {
        case 'pending':
          state.pendingBatches.push(batchId);
          return;
        case 'acknowledged':
          state.acknowledgedBatches.push(batchId);
          return;
        case 'rejected':
          state.rejectedBatches[batchId] = val.error;
          return;
        default:
          fail('Unknown mutation batch state: ' + val.state);
      }
    });

    objUtils.forEachNumber(this.queryTargets, (targetId, val) => {
      switch (val.state) {
        case 'pending':
          state.pendingTargets.push(targetId);
          return;
        case 'active':
          state.activeTargets.push(targetId);
          return;
        case 'current':
          state.currentTargets.push(targetId);
          return;
        case 'rejected':
          state.rejectedTargets[targetId] = val.error;
          return;
        default:
          fail('Unknown query target state: ' + val.state);
      }
    });

    return state;
  }

  async applyBatchState(
    batchId: BatchId,
    state: MutationBatchState,
    error?: FirestoreError
  ): Promise<void> {
    this.mutationBatches[batchId] = { state, error };
  }

  async applyTargetState(
    targetId: TargetId,
    state: QueryTargetState,
    error?: FirestoreError
  ): Promise<void> {
    this.queryTargets[targetId] = { state, error };
  }

  async getActiveClients(): Promise<ClientId[]> {
    return this.activeClients;
  }
}

describe('WebStorageSharedClientState', () => {
  if (!WebStorageSharedClientState.isAvailable(PlatformSupport.getPlatform())) {
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
      new BrowserPlatform(),
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

      if (mutationBatchState === 'rejected') {
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
      expect(sharedClientState.hasLocalPendingMutation(0)).to.be.false;
      assertClientState([], null, null);

      sharedClientState.addLocalPendingMutation(0);
      expect(sharedClientState.hasLocalPendingMutation(0)).to.be.true;
      assertClientState([], 0, 0);
      assertBatchState(0, 'pending');

      sharedClientState.removeLocalPendingMutation(0);
      expect(sharedClientState.hasLocalPendingMutation(0)).to.be.false;
      assertClientState([], null, null);
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

    it('with an acknowledged batch', () => {
      sharedClientState.addLocalPendingMutation(0);
      assertClientState([], 0, 0);
      assertBatchState(0, 'pending');
      sharedClientState.trackMutationResult(0, 'acknowledged');
      assertBatchState(0, 'acknowledged');
    });

    it('with a rejected batch', () => {
      sharedClientState.addLocalPendingMutation(0);
      assertClientState([], 0, 0);
      assertBatchState(0, 'pending');
      sharedClientState.trackMutationResult(0, 'rejected', TEST_ERROR);
      assertBatchState(0, 'rejected', TEST_ERROR);
    });
  });

  describe('persists query targets', () => {
    function assertTargetState(
      targetId: BatchId,
      watchTargetState: string,
      err?: FirestoreError
    ): void {
      const actual = JSON.parse(localStorage.getItem(targetKey(targetId)));

      expect(actual.state).to.equal(watchTargetState);

      const expectedMembers = ['state', 'lastUpdateTime'];

      if (watchTargetState === 'rejected') {
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

    it('with multiple targets', () => {
      sharedClientState.addLocalQueryTarget(0);
      assertClientState([0], null, null);
      assertTargetState(0, 'pending');

      sharedClientState.addLocalQueryTarget(1);
      sharedClientState.addLocalQueryTarget(2);
      assertClientState([0, 1, 2], null, null);
      assertTargetState(1, 'pending');
      assertTargetState(2, 'pending');

      sharedClientState.removeLocalQueryTarget(1);
      assertClientState([0, 2], null, null);
    });

    it('with an active target', () => {
      sharedClientState.addLocalQueryTarget(0);
      assertClientState([0], null, null);
      assertTargetState(0, 'pending');
      sharedClientState.trackQueryUpdate(0, 'active');
      assertTargetState(0, 'active');
    });

    it('with a current target', () => {
      sharedClientState.addLocalQueryTarget(0);
      assertClientState([0], null, null);
      assertTargetState(0, 'pending');
      sharedClientState.trackQueryUpdate(0, 'active');
      sharedClientState.trackQueryUpdate(0, 'current');
      assertTargetState(0, 'current');
    });

    it('with an errored target', () => {
      sharedClientState.addLocalQueryTarget(0);
      assertClientState([0], null, null);
      assertTargetState(0, 'pending');
      sharedClientState.trackQueryUpdate(0, 'rejected', TEST_ERROR);
      assertTargetState(0, 'rejected', TEST_ERROR);
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
    ): Promise<void> {
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
      await sharedClientState.handleUserChange(user, [], []);
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
            TEST_ERROR
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
            'invalid' as any // tslint:disable-line:no-any
          ).toLocalStorageJSON()
        );
      }).then(clientState => {
        expect(clientState.pendingBatches).to.be.empty;
        expect(clientState.acknowledgedBatches).to.be.empty;
        expect(clientState.rejectedBatches).to.be.empty;
      });
    });
  });

  describe('processes target updates', () => {
    beforeEach(() => {
      return sharedClientState.start();
    });

    async function withClientState(
      fn: () => Promise<void>
    ): Promise<TestSharedClientState> {
      await fn();
      await queue.drain();
      return clientSyncer.sharedClientState;
    }

    it('for pending target', () => {
      return withClientState(async () => {
        writeToLocalStorage(
          targetKey(1),
          new QueryTargetMetadata(1, new Date(), 'pending').toLocalStorageJSON()
        );
      }).then(clientState => {
        expect(clientState.pendingTargets).to.have.members([1]);
        expect(clientState.activeTargets).to.be.empty;
        expect(clientState.currentTargets).to.be.empty;
        expect(clientState.rejectedTargets).to.be.empty;
      });
    });

    it('for active target', () => {
      return withClientState(async () => {
        writeToLocalStorage(
          targetKey(1),
          new QueryTargetMetadata(1, new Date(), 'active').toLocalStorageJSON()
        );
      }).then(clientState => {
        expect(clientState.pendingTargets).to.be.empty;
        expect(clientState.activeTargets).to.have.members([1]);
        expect(clientState.currentTargets).to.be.empty;
        expect(clientState.rejectedTargets).to.be.empty;
      });
    });

    it('for current target', () => {
      return withClientState(async () => {
        writeToLocalStorage(
          targetKey(1),
          new QueryTargetMetadata(1, new Date(), 'current').toLocalStorageJSON()
        );
      }).then(clientState => {
        expect(clientState.pendingTargets).to.be.empty;
        expect(clientState.activeTargets).to.be.empty;
        expect(clientState.currentTargets).to.have.members([1]);
        expect(clientState.rejectedTargets).to.be.empty;
      });
    });

    it('for errored target', () => {
      return withClientState(async () => {
        writeToLocalStorage(
          targetKey(1),
          new QueryTargetMetadata(
            1,
            new Date(),
            'rejected',
            TEST_ERROR
          ).toLocalStorageJSON()
        );
      }).then(clientState => {
        expect(clientState.pendingTargets).to.be.empty;
        expect(clientState.activeTargets).to.be.empty;
        expect(clientState.currentTargets).to.be.empty;
        expect(clientState.rejectedTargets[1].code).to.equal('internal');
        expect(clientState.rejectedTargets[1].message).to.equal('Test Error');
      });
    });

    it('ignores invalid data', () => {
      return withClientState(async () => {
        writeToLocalStorage(
          targetKey(1),
          new QueryTargetMetadata(
            1,
            new Date(),
            'invalid' as any // tslint:disable-line:no-any
          ).toLocalStorageJSON()
        );
      }).then(clientState => {
        expect(clientState.pendingTargets).to.be.empty;
        expect(clientState.activeTargets).to.be.empty;
        expect(clientState.currentTargets).to.be.empty;
        expect(clientState.rejectedTargets).to.be.empty;
      });
    });
  });
});
