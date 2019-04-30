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
import { clear, get, remove, set, update } from './idb-manager';
import './testing/setup';

describe('idb manager', () => {
  afterEach(async () => {
    // Clear the database after each test.
    await clear();
  });

  describe('get / set', () => {
    it('sets a value and then gets the same value back', async () => {
      await set('key', 'value');
      const value = await get<string>('key');
      expect(value).to.equal('value');
    });

    it('gets undefined for a key that does not exist', async () => {
      const value = await get<string>('key');
      expect(value).to.be.undefined;
    });

    it('sets and gets multiple values with different keys', async () => {
      await set('key', 'value');
      await set('key2', 'value2');
      expect(await get<string>('key')).to.equal('value');
      expect(await get<string>('key2')).to.equal('value2');
    });

    it('overwrites a value', async () => {
      await set('key', 'value');
      await set('key', 'newValue');
      expect(await get<string>('key')).to.equal('newValue');
    });
  });

  describe('remove', () => {
    it('deletes a key', async () => {
      await set('key', 'value');
      await remove('key');
      expect(await get<string>('key')).to.be.undefined;
    });

    it('does not throw if key does not exist', async () => {
      await remove('key');
      expect(await get<string>('key')).to.be.undefined;
    });
  });

  describe('clear', () => {
    it('deletes all keys', async () => {
      await set('key', 'value');
      await set('key2', 'value2');
      await clear();
      expect(await get('key')).to.be.undefined;
      expect(await get('key2')).to.be.undefined;
    });
  });

  describe('update', () => {
    it('gets and sets a value atomically, returns the new value', async () => {
      let isGetCalled = false;

      await set('key', 'value');

      const resultPromise = update<string, string>('key', oldValue => {
        // get is already called for the same key, but it will only complete
        // after update transaction finishes, at which point it will return the
        // new value.
        expect(isGetCalled).to.be.true;

        expect(oldValue).to.equal('value');
        return 'newValue';
      });

      // Called immediately after update, but before update completed.
      const getPromise = get<string>('key');
      isGetCalled = true;

      // Update returns the new value
      expect(await resultPromise).to.equal('newValue');

      // If update weren't atomic, this would return the old value.
      expect(await getPromise).to.equal('newValue');
    });

    it('can change the type of the value', async () => {
      let isGetCalled = false;

      await set('key', 'value');

      const resultPromise = update<string, number>('key', oldValue => {
        // get is already called for the same key, but it will only complete
        // after update transaction finishes, at which point it will return the
        // new value.
        expect(isGetCalled).to.be.true;

        expect(oldValue).to.equal('value');
        return 123;
      });

      // Called immediately after update, but before update completed.
      const getPromise = get<number>('key');
      isGetCalled = true;

      // Update returns the new value
      expect(await resultPromise).to.equal(123);

      // If update weren't atomic, this would return the old value.
      expect(await getPromise).to.equal(123);
    });
  });
});
