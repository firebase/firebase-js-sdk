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
import { mockEndpoint } from '../../../test/api/helper';
import { mockAuth } from "../../../test/mock_auth";
import * as mockFetch from '../../../test/mock_fetch';
import { Endpoint } from '../../api';
import { OperationType } from '../../model/user_credential';
import { ProviderId, SignInMethod } from '../providers';
import { signInAnonymously } from './anonymous';
import { APIUserInfo } from '../../api/account_management/account';

describe('core/strategies/anonymous', () => {
  const serverUser: APIUserInfo = {
    localId: 'local-id',
  };

  beforeEach(() => {
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
      const { credential, user, operationType } = await signInAnonymously(mockAuth);
      expect(credential?.providerId).to.eq(ProviderId.ANONYMOUS);
      expect(credential?.signInMethod).to.eq(SignInMethod.ANONYMOUS);
      expect(operationType).to.eq(OperationType.SIGN_IN);
      expect(user.uid).to.eq(serverUser.localId);
      expect(user.isAnonymous).to.be.true;
    });

    context('already signed in anonymousl', () => {

    });

    context('already signed in with a non-anonymous account', () => {

    });
  });
 });