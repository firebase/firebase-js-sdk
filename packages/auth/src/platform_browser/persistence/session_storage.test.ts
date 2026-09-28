/**
 * @license
 * Copyright 2026 Google LLC
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

import { testAuth, testUser } from '../../../test/helpers/mock_auth';
import {
  PersistedBlob,
  PersistenceInternal,
  PersistenceType
} from '../../core/persistence';
import { _getInstance } from '../../core/util/instantiator';
import { browserSessionPersistence } from './session_storage';
describe('platform_browser/persistence/session_storage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => vi.restoreAllMocks());
  describe('browserSessionPersistence', () => {
    const persistence: PersistenceInternal = _getInstance(
      browserSessionPersistence
    );

    it('should work with persistence type', async () => {
      const key = 'my-super-special-persistence-type';
      const value = PersistenceType.SESSION;
      expect(await persistence._get(key)).toBeNull();
      await persistence._set(key, value);
      expect(await persistence._get(key)).toBe(value);
      expect(await persistence._get('other-key')).toBeNull();
      await persistence._remove(key);
      expect(await persistence._get(key)).toBeNull();
    });

    it('should emit blobified persisted user', async () => {
      const key = 'my-super-special-user';
      const auth = await testAuth();
      const value = testUser(auth, 'some-uid');

      expect(await persistence._get(key)).toBeNull();
      await persistence._set(key, value.toJSON());
      const out = await persistence._get<PersistedBlob>(key);
      expect(out!['uid']).toEqual(value.uid);
      await persistence._remove(key);
      expect(await persistence._get(key)).toBeNull();
    });

    describe('#isAvailable', () => {
      afterEach(() => vi.restoreAllMocks());

      it('should emit false if sessionStorage setItem throws', async () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
          throw new Error('nope');
        });
        expect(await persistence._isAvailable()).toBe(false);
      });

      it('should emit false if sessionStorage removeItem throws', async () => {
        vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
          throw new Error('nope');
        });
        expect(await persistence._isAvailable()).toBe(false);
      });

      it('should emit true if everything works properly', async () => {
        expect(await persistence._isAvailable()).toBe(true);
      });
    });
  });
});
