import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import * as persistenceHelpers from './persistence_test_helpers';
import {
  PersistedWebStorage,
  WebStorage
} from '../../../src/local/web_storage';
import { VisibilityState } from '../../../src/core/types';
import { AutoId } from '../../../src/util/misc';
import { expect } from 'chai';

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

const ALLOWED_TIME_OFFSET_MS = 500;

describe('WebStorageTests', () => {
  if (!PersistedWebStorage.isAvailable()) {
    console.warn('No WebStorage. Skipping WebStorageTests tests.');
    return;
  }

  let webStorage: WebStorage;
  let storage = window.localStorage;
  let ownerId;

  beforeEach(() => {
    ownerId = AutoId.newId();
    return persistenceHelpers.testWebStoragePersistence(ownerId).then(ws => {
      webStorage = ws;
    });
  });

  function assertInstanceState(
    key: string,
    expecetedContents: { [key: string]: string }
  ) {
    const actual = JSON.parse(
      storage[`${key}_${persistenceHelpers.testPersistencePrefix}_${ownerId}`]
    );
    expect(actual.lastUpdateTime).to.be.a('number');
    expect(actual.lastUpdateTime).to.be.greaterThan(
      Date.now() - ALLOWED_TIME_OFFSET_MS
    );
    expect(actual.lastUpdateTime).to.be.at.most(Date.now());

    Object.keys(expecetedContents).forEach(key => {
      expect(actual[key]).to.be.equal(expecetedContents[key]);
    });
  }

  describe('persists visibility state', () => {
    it.only('unknown', () => {
      webStorage.setVisibility(VisibilityState.Unknown);
      assertInstanceState('visibility', { visibilityState: 'Unknown' });
    });

    it.only('foreground', () => {
      webStorage.setVisibility(VisibilityState.Foreground);
      assertInstanceState('visibility', { visibilityState: 'Foreground' });
    });

    it.only('background', () => {
      webStorage.setVisibility(VisibilityState.Background);
      assertInstanceState('visibility', { visibilityState: 'Background' });
    });
  });
});
