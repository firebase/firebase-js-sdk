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
  ClientStateSchema,
  WebStorageSynchronizedClientState,
  SharedClientState
} from '../../../src/local/shared_client_state';
import { BatchId, TargetId } from '../../../src/core/types';
import { AutoId } from '../../../src/util/misc';
import { expect } from 'chai';

const GRACE_INTERVAL_MS = 100;

describe('WebStorageSynchronizedClientState', () => {
  if (!WebStorageSynchronizedClientState.isAvailable()) {
    console.warn(
      'No LocalStorage. Skipping WebStorageSynchronizedClientState tests.'
    );
    return;
  }

  const localStorage = window.localStorage;

  let notificationChannel: SharedClientState;
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

    expect(actual.lastUpdateTime).to.be.a('number');
    expect(actual.lastUpdateTime).to.be.greaterThan(
      Date.now() - GRACE_INTERVAL_MS
    );
    expect(actual.lastUpdateTime).to.be.at.most(Date.now());

    expect(actual.activeTargetIds).to.be.an('array');
    expect(actual.activeTargetIds).to.be.deep.equal(activeTargetIds);

    if (minMutationBatchId !== undefined) {
      ++expectedKeyCount;
      expect(actual.minMutationBatchId).to.be.equal(minMutationBatchId);
    }

    if (maxMutationBatchId !== undefined) {
      ++expectedKeyCount;
      expect(actual.maxMutationBatchId).to.be.equal(maxMutationBatchId);
    }

    expect(Object.keys(actual).length).to.be.equal(expectedKeyCount);
  }

  describe('persists mutation batches', () => {
    beforeEach(() => {
      return persistenceHelpers
        .testLocalStorageNotificationChannel(ownerId, [], [])
        .then(nc => {
          notificationChannel = nc;
        });
    });

    afterEach(() => {
      notificationChannel.shutdown();
    });

    it('with empty batch', () => {
      assertClientState([]);
    });

    it('with one batch', () => {
      notificationChannel.addLocalPendingMutation(0);
      assertClientState([], 0, 0);
    });

    it('with multiple batches', () => {
      notificationChannel.addLocalPendingMutation(0);
      notificationChannel.addLocalPendingMutation(1);
      assertClientState([], 0, 1);

      notificationChannel.addLocalPendingMutation(2);
      notificationChannel.addLocalPendingMutation(3);
      assertClientState([], 0, 3);

      notificationChannel.removeLocalPendingMutation(0);
      notificationChannel.removeLocalPendingMutation(2);
      assertClientState([], 1, 3);
    });
  });

  describe('persists query targets', () => {
    beforeEach(() => {
      return persistenceHelpers
        .testLocalStorageNotificationChannel(ownerId, [], [])
        .then(nc => {
          notificationChannel = nc;
        });
    });

    afterEach(() => {
      notificationChannel.shutdown();
    });

    it('with empty targets', () => {
      assertClientState([]);
    });

    it('with multiple targets', () => {
      notificationChannel.addLocallyActiveQueryTarget(0);
      assertClientState([0]);

      notificationChannel.addLocallyActiveQueryTarget(1);
      notificationChannel.addLocallyActiveQueryTarget(2);
      assertClientState([0, 1, 2]);

      notificationChannel.removeLocallyActiveQueryTarget(1);
      assertClientState([0, 2]);
    });
  });

  describe('combines client data', () => {
    let previousAddEventListener;
    let storageCallback: (StorageEvent) => void;

    beforeEach(() => {
      previousAddEventListener = window.addEventListener;
      window.addEventListener = (type, callback) => {
        expect(type).to.be.equal('storage');
        storageCallback = callback;
      };

      return persistenceHelpers
        .testLocalStorageNotificationChannel(ownerId, [1, 2], [3, 4])
        .then(nc => {
          notificationChannel = nc;
          expect(storageCallback).to.not.be.undefined;
        });
    });

    afterEach(() => {
      notificationChannel.shutdown();
      window.addEventListener = previousAddEventListener;
    });

    const verifyState = (minBatchId: BatchId, expectedTargets: TargetId[]) => {
      const actualTargets = notificationChannel.getGloballyActiveQueryTargets();
      expect(actualTargets.size).to.equal(expectedTargets.length);

      let missingTargets = actualTargets;
      for (const targetId of expectedTargets) {
        missingTargets = missingTargets.delete(targetId);
      }
      expect(missingTargets.size).to.equal(0);

      expect(
        notificationChannel.getMinimumGloballyPendingMutation()
      ).to.be.equal(minBatchId);
    };

    it('with existing client', () => {
      // The prior client has one pending mutation and two active query targets
      verifyState(1, [3, 4]);

      notificationChannel.addLocalPendingMutation(3);
      notificationChannel.addLocallyActiveQueryTarget(4);
      verifyState(1, [3, 4]);

      notificationChannel.addLocalPendingMutation(0);
      notificationChannel.addLocallyActiveQueryTarget(5);
      verifyState(0, [3, 4, 5]);

      notificationChannel.removeLocalPendingMutation(0);
      notificationChannel.removeLocallyActiveQueryTarget(5);
      verifyState(1, [3, 4]);
    });

    it('from new clients', () => {
      const secondaryClientKey = `fs_clients_${
        persistenceHelpers.TEST_PERSISTENCE_PREFIX
      }_${AutoId.newId()}`;

      const oldState: ClientStateSchema = {
        lastUpdateTime: Date.now(),
        activeTargetIds: [5],
        minMutationBatchId: 0,
        maxMutationBatchId: 0
      };

      const updatedState: ClientStateSchema = {
        lastUpdateTime: Date.now(),
        activeTargetIds: [5, 6],
        minMutationBatchId: 0,
        maxMutationBatchId: 0
      };

      // The prior client has one pending mutation and two active query targets
      verifyState(1, [3, 4]);

      storageCallback({
        key: secondaryClientKey,
        storageArea: window.localStorage,
        newValue: JSON.stringify(oldState)
      });
      verifyState(0, [3, 4, 5]);

      storageCallback({
        key: secondaryClientKey,
        storageArea: window.localStorage,
        newValue: JSON.stringify(updatedState),
        oldValue: JSON.stringify(oldState)
      });
      verifyState(0, [3, 4, 5, 6]);

      storageCallback({
        key: secondaryClientKey,
        storageArea: window.localStorage,
        oldValue: JSON.stringify(updatedState)
      });
      verifyState(1, [3, 4]);
    });

    it('rejects invalid state', () => {
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
