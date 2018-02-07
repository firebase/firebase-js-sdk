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
  LocalClientState
} from '../../../src/local/shared_client_state';
import { BatchId, TargetId } from '../../../src/core/types';
import { AutoId } from '../../../src/util/misc';
import { expect } from 'chai';

/**
 * The test asserts that update time of each row in LocalStorage. We allow a
 * 0.1s difference in update time and local time to account for processing and
 * locking in LocalStorage.
 */
const GRACE_INTERVAL_MS = 100;

describe('WebStorageSharedClientState', () => {
  if (!WebStorageSharedClientState.isAvailable()) {
    console.warn(
      'No LocalStorage. Skipping WebStorageSharedClientState tests.'
    );
    return;
  }

  const localStorage = window.localStorage;

  let sharedClientState: SharedClientState;
  let ownerId;

  beforeEach(() => {
    ownerId = AutoId.newId();
  });

  function assertClientState(
    activeTargetIds: number[],
    minMutationBatchId?: number,
    maxMutationBatchId?: number
  ): void {
    const actual = JSON.parse(
      localStorage.getItem(
        `fs_clients_${persistenceHelpers.TEST_PERSISTENCE_PREFIX}_${ownerId}`
      )
    );

    let expectedKeyCount = /* lastUpdateTime + activeTargetIds */ 2;

    expect(actual.lastUpdateTime)
      .to.be.a('number')
      .greaterThan(Date.now() - GRACE_INTERVAL_MS)
      .and.at.most(Date.now());

    expect(actual.activeTargetIds)
      .to.be.an('array')
      .and.have.members(activeTargetIds);

    if (minMutationBatchId !== undefined) {
      ++expectedKeyCount;
      expect(actual.minMutationBatchId).to.equal(minMutationBatchId);
    }

    if (maxMutationBatchId !== undefined) {
      ++expectedKeyCount;
      expect(actual.maxMutationBatchId).to.equal(maxMutationBatchId);
    }

    expect(Object.keys(actual).length).to.equal(expectedKeyCount);
  }

  describe('persists mutation batches', () => {
    beforeEach(() => {
      return persistenceHelpers
        .testWebStorageSharedClientState(ownerId, [], [])
        .then(nc => {
          sharedClientState = nc;
        });
    });

    afterEach(() => {
      sharedClientState.shutdown();
    });

    it('when empty', () => {
      assertClientState([]);
    });

    it('with one batch', () => {
      sharedClientState.addLocalPendingMutation(0);
      assertClientState([], 0, 0);
    });

    it('with multiple batches', () => {
      sharedClientState.addLocalPendingMutation(0);
      sharedClientState.addLocalPendingMutation(1);
      assertClientState([], 0, 1);

      sharedClientState.addLocalPendingMutation(2);
      sharedClientState.addLocalPendingMutation(3);
      assertClientState([], 0, 3);

      sharedClientState.removeLocalPendingMutation(0);
      sharedClientState.removeLocalPendingMutation(2);
      assertClientState([], 1, 3);
    });
  });

  describe('persists query targets', () => {
    beforeEach(() => {
      return persistenceHelpers
        .testWebStorageSharedClientState(ownerId, [], [])
        .then(nc => {
          sharedClientState = nc;
        });
    });

    afterEach(() => {
      sharedClientState.shutdown();
    });

    it('when empty', () => {
      assertClientState([]);
    });

    it('with multiple targets', () => {
      sharedClientState.addLocalQueryTarget(0);
      assertClientState([0]);

      sharedClientState.addLocalQueryTarget(1);
      sharedClientState.addLocalQueryTarget(2);
      assertClientState([0, 1, 2]);

      sharedClientState.removeLocalQueryTarget(1);
      assertClientState([0, 2]);
    });
  });

  describe('combines data', () => {
    let previousAddEventListener;
    let storageCallback: (StorageEvent) => void;

    beforeEach(() => {
      previousAddEventListener = window.addEventListener;

      // We capture the listener here so that we can invoke it from the local
      // client. If we directly relied on LocalStorage listeners, we would not
      // receive events for local writes.
      window.addEventListener = (type, callback) => {
        expect(type).to.equal('storage');
        storageCallback = callback;
      };

      return persistenceHelpers
        .testWebStorageSharedClientState(ownerId, [1, 2], [3, 4])
        .then(nc => {
          sharedClientState = nc;
          expect(storageCallback).to.not.be.undefined;
        });
    });

    afterEach(() => {
      sharedClientState.shutdown();
      window.addEventListener = previousAddEventListener;
    });

    function verifyState(minBatchId: BatchId, expectedTargets: TargetId[]) {
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

      // This is technically invalid as ID of the minimum mutation batch should
      // never decrease over the lifetime of a client, but we use it here to
      // test the underlying logic that extracts the mutation batch IDs.
      sharedClientState.addLocalPendingMutation(0);
      sharedClientState.addLocalQueryTarget(5);
      verifyState(0, [3, 4, 5]);

      sharedClientState.removeLocalPendingMutation(0);
      sharedClientState.removeLocalQueryTarget(5);
      verifyState(1, [3, 4]);
    });

    it.only('with data from new clients', () => {
      const secondaryClientKey = `fs_clients_${
        persistenceHelpers.TEST_PERSISTENCE_PREFIX
      }_${AutoId.newId()}`;

      const oldState = new LocalClientState();
      oldState.addQueryTarget(5);

      const updatedState = new LocalClientState();
      updatedState.addQueryTarget(5);
      updatedState.addQueryTarget(6);

      // The prior client has one pending mutation and two active query targets
      verifyState(1, [3, 4]);

      storageCallback({
        key: secondaryClientKey,
        storageArea: window.localStorage,
        newValue: oldState.toLocalStorageJSON()
      });
      verifyState(0, [3, 4, 5]);

      storageCallback({
        key: secondaryClientKey,
        storageArea: window.localStorage,
        newValue: updatedState.toLocalStorageJSON(),
        oldValue: oldState.toLocalStorageJSON()
      });
      verifyState(0, [3, 4, 5, 6]);

      storageCallback({
        key: secondaryClientKey,
        storageArea: window.localStorage,
        oldValue: updatedState.toLocalStorageJSON()
      });
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
      storageCallback({
        key: secondaryClientKey,
        storageArea: window.localStorage,
        newValue: JSON.stringify(invalidState)
      });
      verifyState(1, [3, 4]);
    });
  });
});
