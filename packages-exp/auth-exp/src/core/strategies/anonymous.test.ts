/**
 * @license
 * Copyright 2020 Google LLC
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

import { OperationType, ProviderId, SignInMethod } from '@firebase/auth-types-exp';

import { mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, testUser } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { APIUserInfo } from '../../api/account_management/account';
import { Auth } from '../../model/auth';
import { signInAnonymously } from './anonymous';

describe('core/strategies/anonymous', () => {
  let auth: Auth;
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
      expect(operationType).to.eq(OperationType.SIGN_IN);
      expect(user.uid).to.eq(serverUser.localId);
      expect(user.isAnonymous).to.be.true;
    });

    context('already signed in anonymously', () => {
      it('should return the current user', async () => {
        const userCredential = await signInAnonymously(auth);
        expect(userCredential.user.isAnonymous).to.be.true;

        const { user, operationType } = await signInAnonymously(
          auth
        );
        expect(operationType).to.eq(OperationType.SIGN_IN);
        expect(user.uid).to.eq(userCredential.user.uid);
        expect(user.isAnonymous).to.be.true;
      });
    });

    context('already signed in with a non-anonymous account', () => {
      it('should sign in as a new user user', async () => {
        const fakeUser = testUser(auth, 'other-uid');
        await auth.updateCurrentUser(fakeUser);
        expect(fakeUser.isAnonymous).to.be.false;

        const { user, operationType } = await signInAnonymously(
          auth
        );
        expect(operationType).to.eq(OperationType.SIGN_IN);
        expect(user.uid).to.not.eq(fakeUser.uid);
        expect(user.isAnonymous).to.be.true;
      });
    });
  });
});
