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

import { OperationType, ProviderId } from '../../model/enums';

import { mockEndpoint } from '../../../test/helpers/api/helper';
import { TEST_ID_TOKEN_RESPONSE } from '../../../test/helpers/id_token_response';
import { testAuth, TestAuth, testUser } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { APIUserInfo } from '../../api/account_management/account';
import { IdTokenResponse, IdTokenResponseKind } from '../../model/id_token';
import { UserInternal } from '../../model/user';
import { UserCredentialImpl } from './user_credential_impl';
describe('core/user/user_credential_impl', () => {
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

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
    mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
      users: [serverUser]
    });
  });
  afterEach(mockFetch.tearDown);

  describe('fromIdTokenResponse', () => {
    const idTokenResponse: IdTokenResponse = {
      idToken: 'my-id-token',
      refreshToken: 'my-refresh-token',
      expiresIn: '1234',
      localId: serverUser.localId!,
      kind: IdTokenResponseKind.CreateAuthUri
    };

    it('should initialize a UserCredential', async () => {
      const userCredential = await UserCredentialImpl._fromIdTokenResponse(
        auth,
        OperationType.SIGN_IN,
        idTokenResponse
      );
      expect(userCredential.providerId).toBeNull();
      expect(userCredential._tokenResponse).toBe(idTokenResponse);
      expect(userCredential.operationType).toBe(OperationType.SIGN_IN);
      expect(userCredential.user.uid).toBe('local-id');
    });

    it('should not trigger callbacks', async () => {
      const cb = vi.fn();
      auth.onAuthStateChanged(cb);
      await auth._updateCurrentUser(null);
      cb.mockClear();

      await UserCredentialImpl._fromIdTokenResponse(
        auth,
        OperationType.SIGN_IN,
        idTokenResponse
      );
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('forOperation', () => {
    let user: UserInternal;

    beforeEach(async () => {
      user = testUser(auth, 'uid', 'email', true);
      await auth._updateCurrentUser(user);
    });

    it('gets a credential based on the response', async () => {
      const cred = await UserCredentialImpl._forOperation(
        user,
        OperationType.REAUTHENTICATE,
        {
          ...TEST_ID_TOKEN_RESPONSE,
          temporaryProof: 'temporary-proof',
          phoneNumber: 'phone-number'
        }
      );

      expect(cred.providerId).toBe(ProviderId.PHONE);
      expect(cred.operationType).toBe(OperationType.REAUTHENTICATE);
    });

    it('persists the user', async () => {
      await UserCredentialImpl._forOperation(user, OperationType.LINK, {
        ...TEST_ID_TOKEN_RESPONSE
      });
      expect(auth.persistenceLayer.lastObjectSet).toEqual(user.toJSON());
    });
  });
});
