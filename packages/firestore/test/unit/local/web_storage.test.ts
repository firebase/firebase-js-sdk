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
  PersistedWebStorage,
  WebStorage
} from '../../../src/local/web_storage';
import { VisibilityState } from '../../../src/core/types';
import { AutoId } from '../../../src/util/misc';
import { expect } from 'chai';
import {AsyncQueue} from '../../../src/util/async_queue';
import {Deferred} from '../../../src/util/promise';

const GRACE_INTERVAL_MS = 100;

describe('WebStorageTests', () => {
  if (!PersistedWebStorage.isAvailable()) {
    console.warn('No WebStorage. Skipping WebStorageTests tests.');
    return;
  }

  const localStorage = window.localStorage;

  let webStorage: WebStorage;
  let queue: AsyncQueue;
  let ownerId;

  beforeEach(() => {
    ownerId = AutoId.newId();
    queue = new AsyncQueue();
    expect(queue.periodicOperationsCount).to.be.equal(0);
    return persistenceHelpers.testWebStoragePersistence(ownerId, queue).then(ws => {
      webStorage = ws;
      expect(queue.periodicOperationsCount).to.be.equal(1);
    });
  });

  afterEach(() => {
    queue.drain(/* executeDelayedTasks= */ false);
    expect(queue.periodicOperationsCount).to.be.equal(0);
  });

  function assertInstanceState(
    key: string,
    expectedContents: { [key: string]: string },
  ) {
    const actual = JSON.parse(
        localStorage[`${key}_${persistenceHelpers.TEST_PERSISTENCE_PREFIX}_${ownerId}`]
    );
    expect(actual.lastUpdateTime).to.be.a('number');
    expect(actual.lastUpdateTime).to.be.greaterThan(
      Date.now() - GRACE_INTERVAL_MS
    );
    expect(actual.lastUpdateTime).to.be.at.most(Date.now());

    Object.keys(expectedContents).forEach(key => {
      expect(actual[key]).to.be.equal(expectedContents[key]);
    });
  }

  describe('persists visibility state', () => {
    it('unknown', () => {
      webStorage.setVisibility(VisibilityState.Unknown);
      assertInstanceState('visibility', { visibilityState: 'Unknown' });
    });

    it('foreground', () => {
      webStorage.setVisibility(VisibilityState.Foreground);
      assertInstanceState('visibility', { visibilityState: 'Foreground' });
    });

    it('background', () => {
      webStorage.setVisibility(VisibilityState.Background);
      assertInstanceState('visibility', { visibilityState: 'Background' });
    });
  });

  it('refreshes state periodically', () => {
    webStorage.setVisibility(VisibilityState.Foreground);
    assertInstanceState('visibility', { visibilityState: 'Foreground' });
    localStorage.clear();

    // Verify that the state is written again.
    const deferred = new Deferred<void>();
    setTimeout(() => {
      // Note that LocalStorage observers can't be used here since they don't fire for changes
      // in the originating tab.
      assertInstanceState('visibility', { visibilityState: 'Foreground' });
      deferred.resolve();
    }, persistenceHelpers.TEST_WEB_STORAGE_REFRESH_INTERVAL_MS + GRACE_INTERVAL_MS);
    return deferred.promise;
  });
});
