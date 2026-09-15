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
import { expect, vi } from 'vitest';
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
      const customSignals = { 'key': 'value' };

      storage.getLastFetchStatus = vi.fn().mockResolvedValue(status);
      storage.getLastSuccessfulFetchTimestampMillis = vi
        .fn()
        .mockResolvedValue(lastSuccessfulFetchTimestampMillis);
      storage.getActiveConfig = vi.fn().mockResolvedValue(activeConfig);
      storage.getCustomSignals = vi.fn().mockResolvedValue(customSignals);

      await storageCache.loadFromStorage();

      expect(storage.getLastFetchStatus).toHaveBeenCalled();
      expect(storage.getLastSuccessfulFetchTimestampMillis).toHaveBeenCalled();
      expect(storage.getActiveConfig).toHaveBeenCalled();
      expect(storage.getCustomSignals).toHaveBeenCalled();

      expect(storageCache.getLastFetchStatus()).toBe(status);
      expect(storageCache.getLastSuccessfulFetchTimestampMillis()).toEqual(
        lastSuccessfulFetchTimestampMillis
      );
      expect(storageCache.getActiveConfig()).toEqual(activeConfig);
    });
  });

  describe('setActiveConfig', () => {
    const activeConfig = { key: 'value2' };

    beforeEach(() => {
      storage.setActiveConfig = vi.fn().mockResolvedValue(undefined);
    });

    it('writes to memory cache', async () => {
      await storageCache.setActiveConfig(activeConfig);

      expect(storageCache.getActiveConfig()).toEqual(activeConfig);
    });

    it('writes to persistent storage', async () => {
      await storageCache.setActiveConfig(activeConfig);

      expect(storage.setActiveConfig).toHaveBeenCalledWith(activeConfig);
    });
  });

  describe('setCustomSignals', () => {
    const customSignals = { key: 'value' };

    beforeEach(() => {
      storage.setCustomSignals = vi.fn().mockResolvedValue(customSignals);
    });

    it('writes to memory cache', async () => {
      await storageCache.setCustomSignals(customSignals);

      expect(storageCache.getCustomSignals()).toEqual(customSignals);
    });

    it('writes to persistent storage', async () => {
      await storageCache.setCustomSignals(customSignals);

      expect(storage.setCustomSignals).toHaveBeenCalledWith(customSignals);
    });
  });
});
