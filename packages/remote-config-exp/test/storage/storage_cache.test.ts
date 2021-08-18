/**
 * @license
 * Copyright 2019 Google LLC
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

import '../setup';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Storage } from '../../src/storage/storage';
import { StorageCache } from '../../src/storage/storage_cache';

describe('StorageCache', () => {
  const storage = {} as Storage;
  let storageCache: StorageCache;

  beforeEach(() => {
    storageCache = new StorageCache(storage);
  });

  /**
   * Read-ahead getter.
   */
  describe('loadFromStorage', () => {
    it('populates memory cache with persisted data', async () => {
      const status = 'success';
      const lastSuccessfulFetchTimestampMillis = 123;
      const activeConfig = { key: 'value' };

      storage.getLastFetchStatus = sinon
        .stub()
        .returns(Promise.resolve(status));
      storage.getLastSuccessfulFetchTimestampMillis = sinon
        .stub()
        .returns(Promise.resolve(lastSuccessfulFetchTimestampMillis));
      storage.getActiveConfig = sinon
        .stub()
        .returns(Promise.resolve(activeConfig));

      await storageCache.loadFromStorage();

      expect(storage.getLastFetchStatus).to.have.been.called;
      expect(storage.getLastSuccessfulFetchTimestampMillis).to.have.been.called;
      expect(storage.getActiveConfig).to.have.been.called;

      expect(storageCache.getLastFetchStatus()).to.eq(status);
      expect(storageCache.getLastSuccessfulFetchTimestampMillis()).to.deep.eq(
        lastSuccessfulFetchTimestampMillis
      );
      expect(storageCache.getActiveConfig()).to.deep.eq(activeConfig);
    });
  });

  describe('setActiveConfig', () => {
    const activeConfig = { key: 'value2' };

    beforeEach(() => {
      storage.setActiveConfig = sinon.stub().returns(Promise.resolve());
    });

    it('writes to memory cache', async () => {
      await storageCache.setActiveConfig(activeConfig);

      expect(storageCache.getActiveConfig()).to.deep.eq(activeConfig);
    });

    it('writes to persistent storage', async () => {
      await storageCache.setActiveConfig(activeConfig);

      expect(storage.setActiveConfig).to.have.been.calledWith(activeConfig);
    });
  });
});
