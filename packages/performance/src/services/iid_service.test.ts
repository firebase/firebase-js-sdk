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

import {
  getIid,
  getIidPromise,
  getAuthenticationToken,
  getAuthTokenPromise
} from './iid_service';
import '../../test/setup';
import { _FirebaseInstallationsInternal } from '@firebase/installations';
import { vi } from 'vitest';

describe('Firebase Performance > iid_service', () => {
  const IID = 'fid';
  const AUTH_TOKEN = 'authToken';

  let fakeInstallations: _FirebaseInstallationsInternal;
  beforeAll(() => {
    const getId = vi.fn().mockResolvedValue(IID);
    const getToken = vi.fn().mockResolvedValue(AUTH_TOKEN);
    fakeInstallations = {
      getId,
      getToken
    } as unknown as _FirebaseInstallationsInternal;
  });

  describe('getIidPromise', () => {
    it('provides iid', async () => {
      const iid = await getIidPromise(fakeInstallations);

      expect(iid).toBe(IID);
      expect(getIid()).toBe(IID);
    });
  });

  describe('getAuthTokenPromise', () => {
    it('provides authentication token', async () => {
      const token = await getAuthTokenPromise(fakeInstallations);

      expect(token).toBe(AUTH_TOKEN);
      expect(getAuthenticationToken()).toBe(AUTH_TOKEN);
    });
  });
});
