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
import { mockAuth } from '../../../test/mock_auth';
import { MockAuthCredential } from '../../../test/mock_auth_credential';
import * as mockFetch from '../../../test/mock_fetch';
import { APIUserInfo } from '../../api/account_management/account';
import { IdTokenResponse } from '../../model/id_token';
import { ProviderId, SignInMethod } from '../providers';
import { signInWithCredential } from './credential';
import { mockEndpoint } from '../../../test/api/helper';
import { Endpoint } from '../../api';
import { OperationType } from '../../model/user_credential';

use(chaiAsPromised);

describe('core/strategies/signInWithCredential', () => {
  const serverUser: APIUserInfo = {
    localId: 'local-id',
    displayName: 'display-name',
    photoUrl: 'photo-url',
    email: 'email',
    emailVerified: true,
    phoneNumber: 'phone-number',
    tenantId: 'tenant-id',
    createdAt: 123,
    lastLoginAt: 456
  };
  
  const idTokenResponse: IdTokenResponse = {
    idToken: 'my-id-token',
    refreshToken: 'my-refresh-token',
    expiresIn: '1234',
    localId: serverUser.localId!,
    kind: 'my-kind'
  };

  const authCredential = new MockAuthCredential(ProviderId.FIREBASE, SignInMethod.EMAIL_LINK);

  beforeEach(() => {
    mockFetch.setUp();
    authCredential._setIdTokenResponse(idTokenResponse);
    mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
      users: [serverUser]
    });
  });
  afterEach(mockFetch.tearDown);

  it('should return a valid user credential', async () => {
    const {credential, user, operationType } = await signInWithCredential(mockAuth, authCredential);
    expect(credential!.providerId).to.eq(ProviderId.FIREBASE);
    expect(credential!.signInMethod).to.eq(SignInMethod.EMAIL_LINK);
    expect(user.uid).to.eq('local-id');
    expect(user.tenantId).to.eq('tenant-id');
    expect(user.displayName).to.eq('display-name');
    expect(operationType).to.eq(OperationType.SIGN_IN);
  });
  
  it('should update the current user', async () => {
    const { user } = await signInWithCredential(mockAuth, authCredential);
    expect(mockAuth.currentUser).to.eq(user);
  });
});