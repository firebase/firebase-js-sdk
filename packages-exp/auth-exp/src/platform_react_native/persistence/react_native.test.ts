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

import { expect } from 'chai';

import { ReactNativeAsyncStorage } from '@firebase/auth-types-exp';

import { testUser, testAuth } from '../../../test/helpers/mock_auth';
import { _getInstance } from '../../core/util/instantiator';
import {
  PersistedBlob,
  Persistence,
  PersistenceType
} from '../../core/persistence';
import { getReactNativePersistence } from './react_native';

/**
 * Wraps in-memory storage with the react native AsyncStorage API.
 */
class FakeAsyncStorage implements ReactNativeAsyncStorage {
  storage: {
    [key: string]: string;
  } = {};

  async getItem(key: string): Promise<string | null> {
    const value = this.storage[key];
    return value ?? null;
  }
  async removeItem(key: string): Promise<void> {
    delete this.storage[key];
  }
  async setItem(key: string, value: string): Promise<void> {
    this.storage[key] = value;
  }
  clear(): void {
    this.storage = {};
  }
}

describe('core/persistence/react', () => {
  const fakeAsyncStorage = new FakeAsyncStorage();
  const persistence: Persistence = _getInstance(
    getReactNativePersistence(fakeAsyncStorage)
  );

  beforeEach(() => {
    fakeAsyncStorage.clear();
  });

  it('should work with persistence type', async () => {
    const key = 'my-super-special-persistence-type';
    const value = PersistenceType.LOCAL;
    expect(await persistence._get(key)).to.be.null;
    await persistence._set(key, value);
    expect(await persistence._get(key)).to.be.eq(value);
    expect(await persistence._get('other-key')).to.be.null;
    await persistence._remove(key);
    expect(await persistence._get(key)).to.be.null;
  });

  it('should return persistedblob from user', async () => {
    const key = 'my-super-special-user';
    const auth = await testAuth();
    const value = testUser(auth, 'some-uid');

    expect(await persistence._get(key)).to.be.null;
    await persistence._set(key, value.toJSON());
    const out = await persistence._get<PersistedBlob>(key);
    expect(out!['uid']).to.eql(value.uid);
    await persistence._remove(key);
    expect(await persistence._get(key)).to.be.null;
  });
});
