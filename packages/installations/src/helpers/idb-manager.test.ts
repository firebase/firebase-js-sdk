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

import { describe, beforeEach, it, expect, vi } from 'vitest';
import * as fidChangedModule from './fid-changed';

vi.mock('./fid-changed', { spy: true });

import { AppConfig } from '../interfaces/installation-impl';
import {
  InstallationEntry,
  RequestStatus
} from '../interfaces/installation-entry';
import { getFakeAppConfig } from '../testing/fake-generators';
import '../testing/setup';
import { clear, get, remove, set, update } from './idb-manager';

const VALUE_A: InstallationEntry = {
  fid: 'VALUE_A',
  registrationStatus: RequestStatus.NOT_STARTED
};
const VALUE_B: InstallationEntry = {
  fid: 'VALUE_B',
  registrationStatus: RequestStatus.NOT_STARTED
};

describe('idb manager', () => {
  let appConfig: AppConfig;

  beforeEach(() => {
    vi.mocked(fidChangedModule.fidChanged).mockClear();
    appConfig = { ...getFakeAppConfig(), appName: 'appName1' };
  });

  describe('get / set', () => {
    it('sets a value and then gets the same value back', async () => {
      await set(appConfig, VALUE_A);
      const value = await get(appConfig);
      expect(value).toEqual(VALUE_A);
    });

    it('gets undefined for a key that does not exist', async () => {
      const value = await get(appConfig);
      expect(value).toBeUndefined();
    });

    it('sets and gets multiple values with different keys', async () => {
      const appConfig2: AppConfig = {
        ...getFakeAppConfig(),
        appName: 'appName2'
      };

      await set(appConfig, VALUE_A);
      await set(appConfig2, VALUE_B);
      expect(await get(appConfig)).toEqual(VALUE_A);
      expect(await get(appConfig2)).toEqual(VALUE_B);
    });

    it('overwrites a value', async () => {
      await set(appConfig, VALUE_A);
      await set(appConfig, VALUE_B);
      expect(await get(appConfig)).toEqual(VALUE_B);
    });

    it('calls fidChanged when a new FID is generated', async () => {
      await set(appConfig, VALUE_A);

      expect(fidChangedModule.fidChanged).toHaveBeenCalledTimes(1);
      expect(fidChangedModule.fidChanged).toHaveBeenCalledWith(
        appConfig,
        VALUE_A.fid
      );
    });

    it('calls fidChanged when the FID changes', async () => {
      await set(appConfig, VALUE_A);
      vi.mocked(fidChangedModule.fidChanged).mockClear();

      await set(appConfig, VALUE_B);

      expect(fidChangedModule.fidChanged).toHaveBeenCalledTimes(1);
      expect(fidChangedModule.fidChanged).toHaveBeenCalledWith(
        appConfig,
        VALUE_B.fid
      );
    });

    it('does not call fidChanged when the FID is the same', async () => {
      await set(appConfig, VALUE_A);
      vi.mocked(fidChangedModule.fidChanged).mockClear();

      await set(appConfig, /* Same value */ VALUE_A);

      expect(fidChangedModule.fidChanged).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes a key', async () => {
      await set(appConfig, VALUE_A);
      await remove(appConfig);
      expect(await get(appConfig)).toBeUndefined();
    });

    it('does not throw if key does not exist', async () => {
      await remove(appConfig);
      expect(await get(appConfig)).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('deletes all keys', async () => {
      const appConfig2: AppConfig = {
        ...getFakeAppConfig(),
        appName: 'appName2'
      };

      await set(appConfig, VALUE_A);
      await set(appConfig2, VALUE_B);
      await clear();
      expect(await get(appConfig)).toBeUndefined();
      expect(await get(appConfig2)).toBeUndefined();
    });
  });

  describe('update', () => {
    it('gets and sets a value atomically, returns the new value', async () => {
      let isGetCalled = false;

      await set(appConfig, VALUE_A);

      const resultPromise = update(appConfig, oldValue => {
        // get is already called for the same key, but it will only complete
        // after update transaction finishes, at which point it will return the
        // new value.
        expect(isGetCalled).toBe(true);

        expect(oldValue).toEqual(VALUE_A);
        return VALUE_B;
      });

      // Called immediately after update, but before update completed.
      const getPromise = get(appConfig);
      isGetCalled = true;

      // Update returns the new value
      expect(await resultPromise).toEqual(VALUE_B);

      // If update weren't atomic, this would return the old value.
      expect(await getPromise).toEqual(VALUE_B);
    });

    it('calls fidChanged when a new FID is generated', async () => {
      await update(appConfig, () => VALUE_A);

      expect(fidChangedModule.fidChanged).toHaveBeenCalledTimes(1);
      expect(fidChangedModule.fidChanged).toHaveBeenCalledWith(
        appConfig,
        VALUE_A.fid
      );
    });

    it('calls fidChanged when the FID changes', async () => {
      await set(appConfig, VALUE_A);
      vi.mocked(fidChangedModule.fidChanged).mockClear();

      await update(appConfig, () => VALUE_B);

      expect(fidChangedModule.fidChanged).toHaveBeenCalledTimes(1);
      expect(fidChangedModule.fidChanged).toHaveBeenCalledWith(
        appConfig,
        VALUE_B.fid
      );
    });

    it('does not call fidChanged when the FID is the same', async () => {
      await set(appConfig, VALUE_A);
      vi.mocked(fidChangedModule.fidChanged).mockClear();

      await update(appConfig, () => /* Same value */ VALUE_A);

      expect(fidChangedModule.fidChanged).not.toHaveBeenCalled();
    });
  });
});
