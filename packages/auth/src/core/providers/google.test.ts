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

import { OperationType, ProviderId, SignInMethod } from '../../model/enums';

import { TEST_ID_TOKEN_RESPONSE } from '../../../test/helpers/id_token_response';
import { testUser, testAuth } from '../../../test/helpers/mock_auth';
import { TaggedWithTokenResponse } from '../../model/id_token';
import { AuthErrorCode } from '../errors';
import { UserCredentialImpl } from '../user/user_credential_impl';
import { GoogleAuthProvider } from './google';
import { _createError } from '../util/assert';

describe('core/providers/google', () => {
  it('generates the correct type of oauth credential', () => {
    const cred = GoogleAuthProvider.credential('id-token', 'access-token');
    expect(cred.accessToken).toBe('access-token');
    expect(cred.idToken).toBe('id-token');
    expect(cred.providerId).toBe(ProviderId.GOOGLE);
    expect(cred.signInMethod).toBe(SignInMethod.GOOGLE);
  });

  it('adds the profile scope by default', () => {
    const provider = new GoogleAuthProvider();
    expect(provider.providerId).toBe(ProviderId.GOOGLE);
    expect(provider.getScopes()).toEqual(['profile']);
  });

  it('credentialFromResult creates the cred from a tagged result', async () => {
    const auth = await testAuth();
    const userCred = new UserCredentialImpl({
      user: testUser(auth, 'uid'),
      providerId: ProviderId.GOOGLE,
      _tokenResponse: {
        ...TEST_ID_TOKEN_RESPONSE,
        oauthAccessToken: 'access-token',
        oauthIdToken: 'id-token'
      },
      operationType: OperationType.SIGN_IN
    });
    const cred = GoogleAuthProvider.credentialFromResult(userCred)!;
    expect(cred.accessToken).toBe('access-token');
    expect(cred.idToken).toBe('id-token');
    expect(cred.providerId).toBe(ProviderId.GOOGLE);
    expect(cred.signInMethod).toBe(SignInMethod.GOOGLE);
  });

  it('credentialFromError creates the cred from a tagged error', () => {
    const error = _createError(AuthErrorCode.NEED_CONFIRMATION, {
      appName: 'foo'
    });
    (error.customData! as TaggedWithTokenResponse)._tokenResponse = {
      ...TEST_ID_TOKEN_RESPONSE,
      oauthAccessToken: 'access-token',
      oauthIdToken: 'id-token'
    };

    const cred = GoogleAuthProvider.credentialFromError(error)!;
    expect(cred.accessToken).toBe('access-token');
    expect(cred.idToken).toBe('id-token');
    expect(cred.providerId).toBe(ProviderId.GOOGLE);
    expect(cred.signInMethod).toBe(SignInMethod.GOOGLE);
  });
});
