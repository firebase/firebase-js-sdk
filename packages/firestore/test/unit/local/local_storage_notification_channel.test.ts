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
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as persistenceHelpers from './persistence_test_helpers';
import {
  InstanceStateSchema,
  LocalStorageNotificationChannel,
  TabNotificationChannel
} from '../../../src/local/tab_notification_channel';
import { BatchId, TargetId } from '../../../src/core/types';
import { AutoId } from '../../../src/util/misc';
import { expect } from 'chai';

const GRACE_INTERVAL_MS = 100;

describe('LocalStorageNotificationChannel', () => {
  if (!LocalStorageNotificationChannel.isAvailable()) {
    console.warn(
      'No LocalStorage. Skipping LocalStorageNotificationChannelTests tests.'
    );
    return;
  }

  const localStorage = window.localStorage;

  let notificationChannel: TabNotificationChannel;
  let ownerId;

  beforeEach(() => {
    ownerId = AutoId.newId();
  });

  function assertInstanceState(
    activeTargets: number[],
    minMutationBatch?: number,
    maxMutationBatch?: number
  ): void {
    const actual = JSON.parse(
      localStorage.getItem(
        `fs_instances_${persistenceHelpers.TEST_PERSISTENCE_PREFIX}_${ownerId}`
      )
    );

    let expectedKeyCount = /* instanceKey + updateTime + activeTargets */ 3;

    expect(actual.instanceKey).to.be.a('string');

    expect(actual.updateTime).to.be.a('number');
    expect(actual.updateTime).to.be.greaterThan(Date.now() - GRACE_INTERVAL_MS);
    expect(actual.updateTime).to.be.at.most(Date.now());

    expect(actual.activeTargets).to.be.an('array');
    expect(actual.activeTargets).to.be.deep.equal(activeTargets);

    if (minMutationBatch !== undefined) {
      ++expectedKeyCount;
      expect(actual.minMutationBatch).to.be.equal(minMutationBatch);
    }

    if (maxMutationBatch !== undefined) {
      ++expectedKeyCount;
      expect(actual.maxMutationBatch).to.be.equal(maxMutationBatch);
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

    it('with empty batch', () => {
      assertInstanceState([]);
    });

    it('with one batch', () => {
      notificationChannel.addPendingMutation(0);
      assertInstanceState([], 0, 0);
    });

    it('with multiple batches', () => {
      notificationChannel.addPendingMutation(0);
      notificationChannel.addPendingMutation(1);
      assertInstanceState([], 0, 1);

      notificationChannel.addPendingMutation(2);
      notificationChannel.addPendingMutation(3);
      assertInstanceState([], 0, 3);

      notificationChannel.removePendingMutation(0);
      notificationChannel.removePendingMutation(2);
      assertInstanceState([], 1, 3);
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

    it('with empty targets', () => {
      assertInstanceState([]);
    });

    it('with multiple targets', () => {
      notificationChannel.addActiveQueryTarget(0);
      assertInstanceState([0]);

      notificationChannel.addActiveQueryTarget(1);
      notificationChannel.addActiveQueryTarget(2);
      assertInstanceState([0, 1, 2]);

      notificationChannel.removeActiveQueryTarget(1);
      assertInstanceState([0, 2]);
    });
  });

  describe('combines instance data', () => {
    let browserCallback;
    let eventCallback;

    beforeEach(() => {
      browserCallback = window.addEventListener;
      window.addEventListener = (type, callback) => {
        expect(type).to.be.equal('storage');
        eventCallback = callback;
      };

      return persistenceHelpers
        .testLocalStorageNotificationChannel(ownerId, [1, 2], [3, 4])
        .then(nc => {
          notificationChannel = nc;
          expect(eventCallback).to.not.be.undefined;
        });
    });

    afterEach(() => {
      window.addEventListener = browserCallback;
    });

    const verifyState = (minBatchId: BatchId, activeTargets: TargetId[]) => {
      const actualTargets = Array.from(
        notificationChannel.getAllActiveQueryTargets()
      ).sort();
      expect(actualTargets).to.deep.equal(activeTargets);
      expect(notificationChannel.getMinPendingMutation()).to.be.equal(
        minBatchId
      );
    };

    it('with existing instance', () => {
      // The prior instance has one pending mutation and two active query targets
      verifyState(1, [3, 4]);

      notificationChannel.addPendingMutation(3);
      notificationChannel.addActiveQueryTarget(4);
      verifyState(1, [3, 4]);

      notificationChannel.addPendingMutation(0);
      notificationChannel.addActiveQueryTarget(5);
      verifyState(0, [3, 4, 5]);

      notificationChannel.removePendingMutation(0);
      notificationChannel.removeActiveQueryTarget(5);
      verifyState(1, [3, 4]);
    });

    it('from new instances', () => {
      const oldState: InstanceStateSchema = {
        instanceKey: 'other',
        updateTime: Date.now(),
        activeTargets: [5],
        minMutationBatch: 0,
        maxMutationBatch: 0
      };

      const updatedState: InstanceStateSchema = {
        instanceKey: 'other',
        updateTime: Date.now(),
        activeTargets: [5, 6],
        minMutationBatch: 0,
        maxMutationBatch: 0
      };

      // The prior instance has one pending mutation and two active query targets
      verifyState(1, [3, 4]);

      eventCallback({ newValue: JSON.stringify(oldState) });
      verifyState(0, [3, 4, 5]);

      eventCallback({
        newValue: JSON.stringify(updatedState),
        oldValue: JSON.stringify(oldState)
      });
      verifyState(0, [3, 4, 5, 6]);

      eventCallback({ oldValue: JSON.stringify(updatedState) });
      verifyState(1, [3, 4]);
    });
  });
});
