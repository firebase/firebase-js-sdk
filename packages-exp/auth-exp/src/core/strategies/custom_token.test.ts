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

import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import { OperationType } from '@firebase/auth-types-exp';

import { mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { APIUserInfo } from '../../api/account_management/account';
import { IdTokenResponse, IdTokenResponseKind } from '../../model/id_token';
import { UserCredential } from '../../model/user';
import { signInWithCustomToken } from './custom_token';

use(chaiAsPromised);

describe('core/strategies/signInWithCustomToken', () => {
  const serverUser: APIUserInfo = {
    localId: 'local-id',
    displayName: 'display-name',
    photoUrl: 'photo-url',
    email: 'email',
    emailVerified: true,
    phoneNumber: 'phone-number',
    createdAt: 123,
    lastLoginAt: 456
  };

  const idTokenResponse: IdTokenResponse = {
    idToken: 'my-id-token',
    refreshToken: 'my-refresh-token',
    expiresIn: '1234',
    localId: serverUser.localId!,
    kind: IdTokenResponseKind.CreateAuthUri
  };

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
    mockEndpoint(Endpoint.SIGN_IN_WITH_CUSTOM_TOKEN, idTokenResponse);
    mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
      users: [serverUser]
    });
  });
  afterEach(mockFetch.tearDown);

  it('should return a valid user credential', async () => {
    const {
      user,
      operationType,
      _tokenResponse
    } = (await signInWithCustomToken(
      auth,
      'look-at-me-im-a-jwt'
    )) as UserCredential;
    expect(_tokenResponse).to.eql(idTokenResponse);
    expect(user.uid).to.eq('local-id');
    expect(user.displayName).to.eq('display-name');
    expect(operationType).to.eq(OperationType.SIGN_IN);
  });

  it('should update the current user', async () => {
    const { user } = await signInWithCustomToken(auth, 'oh.no');
    expect(auth.currentUser).to.eq(user);
  });
});
