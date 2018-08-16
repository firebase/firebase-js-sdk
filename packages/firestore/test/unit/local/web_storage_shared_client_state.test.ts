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
import {
  BatchId,
  MutationBatchState,
  OnlineState,
  TargetId
} from '../../../src/core/types';
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
import { PlatformSupport } from '../../../src/platform/platform';
import * as objUtils from '../../../src/util/obj';
import { targetIdSet } from '../../../src/model/collections';
import { SortedSet } from '../../../src/util/sorted_set';

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
    return `firestore_mutations_${
      persistenceHelpers.TEST_PERSISTENCE_PREFIX
    }_${batchId}_${user.uid}`;
  } else {
    return `firestore_mutations_${
      persistenceHelpers.TEST_PERSISTENCE_PREFIX
    }_${batchId}`;
  }
}

function targetKey(targetId: TargetId): string {
  return `firestore_targets_${
    persistenceHelpers.TEST_PERSISTENCE_PREFIX
  }_${targetId}`;
}

function onlineStateKey(): string {
  return 'firestore_online_state';
}

interface TestSharedClientState {
  mutationCount: number;
  mutationState: {
    [batchId: number]: { state: MutationBatchState; error?: FirestoreError };
  };
  targetIds: SortedSet<number>;
  targetState: {
    [targetId: number]: { state: QueryTargetState; error?: FirestoreError };
  };
  onlineState: OnlineState;
}

/**
 * Implementation of `SharedClientStateSyncer` that aggregates its callback
 * data and exposes it via `.sharedClientState`.
 */
class TestSharedClientSyncer implements SharedClientStateSyncer {
  private mutationState: {
    [batchId: number]: { state: MutationBatchState; error?: FirestoreError };
  } = {};
  private queryState: {
    [targetId: number]: { state: QueryTargetState; error?: FirestoreError };
  } = {};
  private activeTargets = targetIdSet();
  private onlineState = OnlineState.Unknown;

  constructor(public activeClients: ClientId[]) {}

  get sharedClientState(): TestSharedClientState {
    return {
      mutationCount: objUtils.size(this.mutationState),
      mutationState: this.mutationState,
      targetIds: this.activeTargets,
      targetState: this.queryState,
      onlineState: this.onlineState
    };
  }

  async applyBatchState(
    batchId: BatchId,
    state: MutationBatchState,
    error?: FirestoreError
  ): Promise<void> {
    this.mutationState[batchId] = { state, error };
  }

  async applyTargetState(
    targetId: TargetId,
    state: QueryTargetState,
    error?: FirestoreError
  ): Promise<void> {
    this.queryState[targetId] = { state, error };
  }

  async getActiveClients(): Promise<ClientId[]> {
    return this.activeClients;
  }

  async applyActiveTargetsChange(
    added: TargetId[],
    removed: TargetId[]
  ): Promise<void> {
    for (const targetId of added) {
      expect(this.activeTargets.has(targetId)).to.be.false;
      this.activeTargets = this.activeTargets.add(targetId);
    }
    for (const targetId of removed) {
      expect(this.activeTargets.has(targetId)).to.be.true;
      this.activeTargets = this.activeTargets.delete(targetId);
    }
  }

  applyOnlineStateChange(onlineState: OnlineState): void {
    this.onlineState = onlineState;
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
  let previousRemoveEventListener;

  let localStorageCallbacks = [];

  function writeToLocalStorage(key: string, value: string | null): void {
    for (const callback of localStorageCallbacks) {
      callback({
        key,
        storageArea: window.localStorage,
        newValue: value
      });
    }
  }

  beforeEach(() => {
    clearWebStorage();
    localStorageCallbacks = [];

    previousAddEventListener = window.addEventListener;
    previousRemoveEventListener = window.removeEventListener;

    // We capture the listener here so that we can invoke it from the local
    // client. If we directly relied on LocalStorage listeners, we would not
    // receive events for local writes.
    window.addEventListener = (type, callback) => {
      expect(type).to.equal('storage');
      localStorageCallbacks.push(callback);
    };
    window.removeEventListener = () => {};

    primaryClientId = AutoId.newId();
    queue = new AsyncQueue();
    sharedClientState = new WebStorageSharedClientState(
      queue,
      PlatformSupport.getPlatform(),
      TEST_PERSISTENCE_PREFIX,
      primaryClientId,
      AUTHENTICATED_USER
    );
    clientSyncer = new TestSharedClientSyncer([primaryClientId]);
    sharedClientState.syncEngine = clientSyncer;
    sharedClientState.onlineStateHandler = clientSyncer.applyOnlineStateChange.bind(
      clientSyncer
    );
  });

  afterEach(() => {
    sharedClientState.shutdown();
    window.addEventListener = previousAddEventListener;
    window.removeEventListener = previousRemoveEventListener;
  });

  function assertClientState(activeTargetIds: TargetId[]): void {
    const actual = JSON.parse(
      localStorage.getItem(
        `firestore_clients_${
          persistenceHelpers.TEST_PERSISTENCE_PREFIX
        }_${primaryClientId}`
      )
    );

    expect(Object.keys(actual)).to.have.members([
      'lastUpdateTime',
      'activeTargetIds'
    ]);
    expect(actual.lastUpdateTime)
      .to.be.a('number')
      .greaterThan(Date.now() - GRACE_INTERVAL_MS)
      .and.at.most(Date.now());
    expect(actual.activeTargetIds)
      .to.be.an('array')
      .and.have.members(activeTargetIds);
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

    function assertNoBatchState(batchId: BatchId): void {
      expect(localStorage.getItem(mutationKey(AUTHENTICATED_USER, batchId))).to
        .be.null;
    }

    beforeEach(() => {
      return sharedClientState.start();
    });

    it('with a pending batch', () => {
      sharedClientState.addPendingMutation(0);
      assertBatchState(0, 'pending');
    });

    it('with an acknowledged batch', () => {
      sharedClientState.addPendingMutation(0);
      assertBatchState(0, 'pending');
      sharedClientState.updateMutationState(0, 'acknowledged');
      // The entry is garbage collected immediately.
      assertNoBatchState(0);
    });

    it('with a rejected batch', () => {
      sharedClientState.addPendingMutation(0);
      assertBatchState(0, 'pending');
      sharedClientState.updateMutationState(0, 'rejected', TEST_ERROR);
      // The entry is garbage collected immediately.
      assertNoBatchState(0);
    });
  });

  describe('persists query targets', () => {
    function assertTargetState(
      targetId: TargetId,
      queryTargetState: string,
      err?: FirestoreError
    ): void {
      if (queryTargetState === 'pending') {
        expect(localStorage.getItem(targetKey(targetId))).to.be.null;
      } else {
        const actual = JSON.parse(localStorage.getItem(targetKey(targetId)));
        expect(actual.state).to.equal(queryTargetState);

        const expectedMembers = ['state', 'lastUpdateTime'];
        if (queryTargetState === 'rejected') {
          expectedMembers.push('error');
          expect(actual.error.code).to.equal(err.code);
          expect(actual.error.message).to.equal(err.message);
        }
        expect(Object.keys(actual)).to.have.members(expectedMembers);
      }
    }

    beforeEach(() => {
      return sharedClientState.start();
    });

    it('when empty', () => {
      assertClientState([]);
    });

    it('with multiple targets', () => {
      sharedClientState.addLocalQueryTarget(0);
      assertClientState([0]);
      assertTargetState(0, 'pending');

      sharedClientState.addLocalQueryTarget(1);
      sharedClientState.addLocalQueryTarget(2);
      assertClientState([0, 1, 2]);
      assertTargetState(1, 'pending');
      assertTargetState(2, 'pending');

      sharedClientState.removeLocalQueryTarget(1);
      assertClientState([0, 2]);
    });

    it('with a not-current target', () => {
      sharedClientState.addLocalQueryTarget(0);
      assertClientState([0]);
      assertTargetState(0, 'pending');
      sharedClientState.updateQueryState(0, 'not-current');
      assertTargetState(0, 'not-current');
    });

    it('with a current target', () => {
      sharedClientState.addLocalQueryTarget(0);
      assertClientState([0]);
      assertTargetState(0, 'pending');
      sharedClientState.updateQueryState(0, 'not-current');
      assertTargetState(0, 'not-current');
      sharedClientState.updateQueryState(0, 'current');
      assertTargetState(0, 'current');
    });

    it('with an errored target', () => {
      sharedClientState.addLocalQueryTarget(0);
      assertClientState([0]);
      assertTargetState(0, 'pending');
      sharedClientState.updateQueryState(0, 'rejected', TEST_ERROR);
      assertTargetState(0, 'rejected', TEST_ERROR);
    });

    it('garbage collects entry', () => {
      sharedClientState.addLocalQueryTarget(0);
      sharedClientState.updateQueryState(0, 'current');
      assertTargetState(0, 'current');
      sharedClientState.removeLocalQueryTarget(0);
      assertTargetState(0, 'current');
      sharedClientState.clearQueryState(0);
      expect(localStorage.getItem(targetKey(0))).to.be.null;
    });
  });

  describe('combines client state', () => {
    const secondaryClientId = AutoId.newId();
    const secondaryClientStateKey = `firestore_clients_${
      persistenceHelpers.TEST_PERSISTENCE_PREFIX
    }_${secondaryClientId}`;

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
      expectedTargets: TargetId[],
      expectedOnlineState: OnlineState
    ): Promise<void> {
      await queue.drain();
      const actualOnlineState = clientSyncer.sharedClientState.onlineState;
      const actualTargets = sharedClientState.getAllActiveQueryTargets();

      expect(actualTargets.toArray()).to.have.members(expectedTargets);
      expect(actualOnlineState).to.equal(expectedOnlineState);
    }

    it('with targets from existing client', async () => {
      // The prior client has two active query targets
      await verifyState([3, 4], OnlineState.Unknown);

      sharedClientState.addLocalQueryTarget(4);
      await verifyState([3, 4], OnlineState.Unknown);

      sharedClientState.addLocalQueryTarget(5);
      await verifyState([3, 4, 5], OnlineState.Unknown);

      sharedClientState.removeLocalQueryTarget(5);
      await verifyState([3, 4], OnlineState.Unknown);
    });

    it('with targets from new client', async () => {
      // The prior client has two active query targets
      await verifyState([3, 4], OnlineState.Unknown);

      const oldState = new LocalClientState();
      oldState.addQueryTarget(5);

      writeToLocalStorage(
        secondaryClientStateKey,
        oldState.toLocalStorageJSON()
      );
      await verifyState([3, 4, 5], OnlineState.Unknown);

      const updatedState = new LocalClientState();
      updatedState.addQueryTarget(5);
      updatedState.addQueryTarget(6);

      writeToLocalStorage(
        secondaryClientStateKey,
        updatedState.toLocalStorageJSON()
      );
      await verifyState([3, 4, 5, 6], OnlineState.Unknown);

      writeToLocalStorage(secondaryClientStateKey, null);
      await verifyState([3, 4], OnlineState.Unknown);
    });

    it('with online state from new client', async () => {
      // The prior client has two active query targets
      await verifyState([3, 4], OnlineState.Unknown);

      // Ensure that client is considered active
      const oldState = new LocalClientState();
      writeToLocalStorage(
        secondaryClientStateKey,
        oldState.toLocalStorageJSON()
      );

      writeToLocalStorage(
        onlineStateKey(),
        JSON.stringify({
          onlineState: 'Unknown',
          clientId: secondaryClientId
        })
      );
      await verifyState([3, 4], OnlineState.Unknown);

      writeToLocalStorage(
        onlineStateKey(),
        JSON.stringify({
          onlineState: 'Offline',
          clientId: secondaryClientId
        })
      );
      await verifyState([3, 4], OnlineState.Offline);

      writeToLocalStorage(
        onlineStateKey(),
        JSON.stringify({
          onlineState: 'Online',
          clientId: secondaryClientId
        })
      );
      await verifyState([3, 4], OnlineState.Online);
    });

    it('ignores online state from inactive client', async () => {
      // The prior client has two active query targets
      await verifyState([3, 4], OnlineState.Unknown);

      // The secondary client is inactive and its online state is ignored.
      writeToLocalStorage(
        onlineStateKey(),
        JSON.stringify({
          onlineState: 'Online',
          clientId: secondaryClientId
        })
      );

      await verifyState([3, 4], OnlineState.Unknown);

      // Ensure that client is considered active
      const oldState = new LocalClientState();
      writeToLocalStorage(
        secondaryClientStateKey,
        oldState.toLocalStorageJSON()
      );

      writeToLocalStorage(
        onlineStateKey(),
        JSON.stringify({
          onlineState: 'Online',
          clientId: secondaryClientId
        })
      );

      await verifyState([3, 4], OnlineState.Online);
    });

    it('ignores invalid data', async () => {
      const secondaryClientStateKey = `firestore_clients_${
        persistenceHelpers.TEST_PERSISTENCE_PREFIX
      }_${AutoId.newId()}`;

      const invalidState = {
        activeTargetIds: [5, 'invalid']
      };

      // The prior instance has two active query targets
      await verifyState([3, 4], OnlineState.Unknown);

      // We ignore the newly added target.
      writeToLocalStorage(
        secondaryClientStateKey,
        JSON.stringify(invalidState)
      );
      await verifyState([3, 4], OnlineState.Unknown);
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
        expect(clientState.mutationCount).to.equal(1);
        expect(clientState.mutationState[1].state).to.equal('pending');
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
        expect(clientState.mutationCount).to.equal(1);
        expect(clientState.mutationState[1].state).to.equal('acknowledged');
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
        expect(clientState.mutationCount).to.equal(1);
        expect(clientState.mutationState[1].state).to.equal('rejected');

        const firestoreError = clientState.mutationState[1].error;
        expect(firestoreError.code).to.equal('internal');
        expect(firestoreError.message).to.equal('Test Error');
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
        expect(clientState.mutationCount).to.equal(1);
        expect(clientState.mutationState[1].state).to.equal('pending');
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
        expect(clientState.mutationCount).to.equal(1);
        expect(clientState.mutationState[1].state).to.equal('pending');
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
        expect(clientState.mutationCount).to.equal(0);
      });
    });
  });

  describe('processes target updates', () => {
    const firstClientTargetId: TargetId = 1;
    const secondClientTargetId: TargetId = 2;

    const firstClientStorageKey = `firestore_clients_${
      persistenceHelpers.TEST_PERSISTENCE_PREFIX
    }_${AutoId.newId()}`;
    const secondClientStorageKey = `firestore_clients_${
      persistenceHelpers.TEST_PERSISTENCE_PREFIX
    }_${AutoId.newId()}`;

    let firstClient: LocalClientState;
    let secondClientState: LocalClientState;

    beforeEach(() => {
      firstClient = new LocalClientState();
      firstClient.addQueryTarget(firstClientTargetId);
      secondClientState = new LocalClientState();
      return sharedClientState.start();
    });

    async function withClientState(
      fn: () => Promise<void>
    ): Promise<TestSharedClientState> {
      writeToLocalStorage(
        firstClientStorageKey,
        firstClient.toLocalStorageJSON()
      );
      await fn();
      await queue.drain();
      return clientSyncer.sharedClientState;
    }

    it('for added target', async () => {
      let clientState = await withClientState(async () => {
        // Add a target that only exists in the second client
        secondClientState.addQueryTarget(secondClientTargetId);
        writeToLocalStorage(
          secondClientStorageKey,
          secondClientState.toLocalStorageJSON()
        );
      });

      expect(clientState.targetIds.size).to.equal(2);

      clientState = await withClientState(async () => {
        // Add a target that already exist in the first client
        secondClientState.addQueryTarget(firstClientTargetId);
        writeToLocalStorage(
          secondClientStorageKey,
          secondClientState.toLocalStorageJSON()
        );
      });

      expect(clientState.targetIds.size).to.equal(2);
    });

    it('for removed target', async () => {
      let clientState = await withClientState(async () => {
        secondClientState.addQueryTarget(firstClientTargetId);
        secondClientState.addQueryTarget(secondClientTargetId);
        writeToLocalStorage(
          secondClientStorageKey,
          secondClientState.toLocalStorageJSON()
        );
      });

      expect(clientState.targetIds.size).to.equal(2);

      clientState = await withClientState(async () => {
        // Remove a target that also exists in the first client
        secondClientState.removeQueryTarget(firstClientTargetId);
        writeToLocalStorage(
          secondClientStorageKey,
          secondClientState.toLocalStorageJSON()
        );
      });

      expect(clientState.targetIds.size).to.equal(2);

      clientState = await withClientState(async () => {
        // Remove a target that only exists in the second client
        secondClientState.removeQueryTarget(secondClientTargetId);
        writeToLocalStorage(
          secondClientStorageKey,
          secondClientState.toLocalStorageJSON()
        );
      });

      expect(clientState.targetIds.size).to.equal(1);
    });

    it('for not-current target', () => {
      return withClientState(async () => {
        writeToLocalStorage(
          targetKey(firstClientTargetId),
          new QueryTargetMetadata(
            firstClientTargetId,
            new Date(),
            'not-current'
          ).toLocalStorageJSON()
        );
      }).then(clientState => {
        expect(clientState.targetIds.size).to.equal(1);
        expect(clientState.targetState[firstClientTargetId].state).to.equal(
          'not-current'
        );
      });
    });

    it('for current target', () => {
      return withClientState(async () => {
        writeToLocalStorage(
          targetKey(firstClientTargetId),
          new QueryTargetMetadata(
            firstClientTargetId,
            new Date(),
            'current'
          ).toLocalStorageJSON()
        );
      }).then(clientState => {
        expect(clientState.targetIds.size).to.equal(1);
        expect(clientState.targetState[firstClientTargetId].state).to.equal(
          'current'
        );
      });
    });

    it('for errored target', () => {
      return withClientState(async () => {
        writeToLocalStorage(
          targetKey(1),
          new QueryTargetMetadata(
            firstClientTargetId,
            new Date(),
            'rejected',
            TEST_ERROR
          ).toLocalStorageJSON()
        );
      }).then(clientState => {
        expect(clientState.targetIds.size).to.equal(1);
        expect(clientState.targetState[firstClientTargetId].state).to.equal(
          'rejected'
        );

        const firestoreError =
          clientState.targetState[firstClientTargetId].error;
        expect(firestoreError.code).to.equal('internal');
        expect(firestoreError.message).to.equal('Test Error');
      });
    });

    it('ignores invalid data', () => {
      return withClientState(async () => {
        writeToLocalStorage(
          targetKey(firstClientTargetId),
          new QueryTargetMetadata(
            firstClientTargetId,
            new Date(),
            'invalid' as any // tslint:disable-line:no-any
          ).toLocalStorageJSON()
        );
      }).then(clientState => {
        expect(clientState.targetIds.size).to.equal(1);
        expect(clientState.targetState[firstClientTargetId]).to.be.undefined;
      });
    });
  });
});
