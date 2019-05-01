/**
 * @license
 * Copyright 2019 Google Inc.
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

import { expect } from 'chai';
import { AppConfig } from '../interfaces/app-config';
import { getFakeAppConfig } from '../testing/get-fake-app';
import '../testing/setup';
import { clear, get, remove, set, update } from './idb-manager';

describe('idb manager', () => {
  let appConfig1: AppConfig;
  let appConfig2: AppConfig;

  beforeEach(() => {
    appConfig1 = { ...getFakeAppConfig(), appName: 'appName1' };
    appConfig2 = { ...getFakeAppConfig(), appName: 'appName2' };
  });

  afterEach(async () => {
    // Clear the database after each test.
    await clear();
  });

  describe('get / set', () => {
    it('sets a value and then gets the same value back', async () => {
      await set(appConfig1, 'value');
      const value = await get<string>(appConfig1);
      expect(value).to.equal('value');
    });

    it('gets undefined for a key that does not exist', async () => {
      const value = await get<string>(appConfig1);
      expect(value).to.be.undefined;
    });

    it('sets and gets multiple values with different keys', async () => {
      await set(appConfig1, 'value');
      await set(appConfig2, 'value2');
      expect(await get<string>(appConfig1)).to.equal('value');
      expect(await get<string>(appConfig2)).to.equal('value2');
    });

    it('overwrites a value', async () => {
      await set(appConfig1, 'value');
      await set(appConfig1, 'newValue');
      expect(await get<string>(appConfig1)).to.equal('newValue');
    });
  });

  describe('remove', () => {
    it('deletes a key', async () => {
      await set(appConfig1, 'value');
      await remove(appConfig1);
      expect(await get<string>(appConfig1)).to.be.undefined;
    });

    it('does not throw if key does not exist', async () => {
      await remove(appConfig1);
      expect(await get<string>(appConfig1)).to.be.undefined;
    });
  });

  describe('clear', () => {
    it('deletes all keys', async () => {
      await set(appConfig1, 'value');
      await set(appConfig2, 'value2');
      await clear();
      expect(await get(appConfig1)).to.be.undefined;
      expect(await get(appConfig2)).to.be.undefined;
    });
  });

  describe('update', () => {
    it('gets and sets a value atomically, returns the new value', async () => {
      let isGetCalled = false;

      await set(appConfig1, 'value');

      const resultPromise = update<string, string>(appConfig1, oldValue => {
        // get is already called for the same key, but it will only complete
        // after update transaction finishes, at which point it will return the
        // new value.
        expect(isGetCalled).to.be.true;

        expect(oldValue).to.equal('value');
        return 'newValue';
      });

      // Called immediately after update, but before update completed.
      const getPromise = get<string>(appConfig1);
      isGetCalled = true;

      // Update returns the new value
      expect(await resultPromise).to.equal('newValue');

      // If update weren't atomic, this would return the old value.
      expect(await getPromise).to.equal('newValue');
    });

    it('can change the type of the value', async () => {
      let isGetCalled = false;

      await set(appConfig1, 'value');

      const resultPromise = update<string, number>(appConfig1, oldValue => {
        // get is already called for the same key, but it will only complete
        // after update transaction finishes, at which point it will return the
        // new value.
        expect(isGetCalled).to.be.true;

        expect(oldValue).to.equal('value');
        return 123;
      });

      // Called immediately after update, but before update completed.
      const getPromise = get<number>(appConfig1);
      isGetCalled = true;

      // Update returns the new value
      expect(await resultPromise).to.equal(123);

      // If update weren't atomic, this would return the old value.
      expect(await getPromise).to.equal(123);
    });
  });
});
