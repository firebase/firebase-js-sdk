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
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { APIUserInfo } from '../../api/account_management/account';
import { IdTokenResponse, IdTokenResponseKind } from '../../model/id_token';
import { UserCredentialInternal } from '../../model/user';
import { signInWithCustomToken } from './custom_token';
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
  let signInRoute: mockFetch.Route;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
    signInRoute = mockEndpoint(
      Endpoint.SIGN_IN_WITH_CUSTOM_TOKEN,
      idTokenResponse
    );
    mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
      users: [serverUser]
    });
  });
  afterEach(mockFetch.tearDown);

  it('should return a valid user credential', async () => {
    const { user, operationType, _tokenResponse } =
      (await signInWithCustomToken(
        auth,
        'look-at-me-im-a-jwt'
      )) as UserCredentialInternal;
    expect(_tokenResponse).toEqual(idTokenResponse);
    expect(user.uid).toBe('local-id');
    expect(user.displayName).toBe('display-name');
    expect(operationType).toBe(OperationType.SIGN_IN);
  });

  it('should send with a valid request', async () => {
    await signInWithCustomToken(auth, 'j.w.t');
    expect(signInRoute.calls[0].request).toEqual({
      token: 'j.w.t',
      returnSecureToken: true
    });
  });

  it('should update the current user', async () => {
    const { user } = await signInWithCustomToken(auth, 'oh.no');
    expect(auth.currentUser).toBe(user);
  });

  it('wraps persistence failure into FirebaseError (auth/internal-error) after network token exchange', async () => {
    const persistenceError = new Error('Database is closing/hidden');
    (auth as any).persistenceManager.setCurrentUser = () =>
      Promise.reject(persistenceError);

    let caughtError: any;
    try {
      await signInWithCustomToken(auth, 'single-use-token');
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeTruthy();
    expect(caughtError.code).toBe('auth/internal-error');
    expect(caughtError.message).toContain('Database is closing/hidden');
    expect(caughtError.customData?.originalError).toBe(persistenceError);
    // Note: The network request already consumed the token
    expect(signInRoute.calls.length).toBe(1);
    expect(signInRoute.calls[0].request).toEqual({
      token: 'single-use-token',
      returnSecureToken: true
    });
  });
});
