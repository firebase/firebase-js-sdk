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

import { OperationType } from '../../model/enums';

import { mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, testUser, TestAuth } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { APIUserInfo } from '../../api/account_management/account';
import { signInAnonymously } from './anonymous';

describe('core/strategies/anonymous', () => {
  let auth: TestAuth;
  const serverUser: APIUserInfo = {
    localId: 'local-id'
  };

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
    mockEndpoint(Endpoint.SIGN_UP, {
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      expiresIn: '1234',
      localId: serverUser.localId!
    });
    mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
      users: [serverUser]
    });
  });
  afterEach(mockFetch.tearDown);

  describe('signInAnonymously', () => {
    it('should sign in an anonymous user', async () => {
      const { user, operationType } = await signInAnonymously(auth);
      expect(operationType).toBe(OperationType.SIGN_IN);
      expect(user.uid).toBe(serverUser.localId);
      expect(user.isAnonymous).toBe(true);
    });

    describe('already signed in anonymously', () => {
      it('should return the current user', async () => {
        const userCredential = await signInAnonymously(auth);
        expect(userCredential.user.isAnonymous).toBe(true);

        const { user, operationType } = await signInAnonymously(auth);
        expect(operationType).toBe(OperationType.SIGN_IN);
        expect(user.uid).toBe(userCredential.user.uid);
        expect(user.isAnonymous).toBe(true);
      });
    });

    describe('already signed in with a non-anonymous account', () => {
      it('should sign in as a new user user', async () => {
        const fakeUser = testUser(auth, 'other-uid');
        await auth._updateCurrentUser(fakeUser);
        expect(fakeUser.isAnonymous).toBe(false);

        const { user, operationType } = await signInAnonymously(auth);
        expect(operationType).toBe(OperationType.SIGN_IN);
        expect(user.uid).not.toBe(fakeUser.uid);
        expect(user.isAnonymous).toBe(true);
      });
    });
  });
});
