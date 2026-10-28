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
import { TwitterAuthProvider } from './twitter';
import { _createError } from '../util/assert';

describe('core/providers/twitter', () => {
  it('generates the correct type of oauth credential', () => {
    const cred = TwitterAuthProvider.credential('token', 'secret');
    expect(cred.accessToken).toBe('token');
    expect(cred.secret).toBe('secret');
    expect(cred.providerId).toBe(ProviderId.TWITTER);
    expect(cred.signInMethod).toBe(SignInMethod.TWITTER);
  });

  it('credentialFromResult creates the cred from a tagged result', async () => {
    const auth = await testAuth();
    const userCred = new UserCredentialImpl({
      user: testUser(auth, 'uid'),
      providerId: ProviderId.TWITTER,
      _tokenResponse: {
        ...TEST_ID_TOKEN_RESPONSE,
        oauthAccessToken: 'access-token',
        oauthTokenSecret: 'token-secret'
      },
      operationType: OperationType.SIGN_IN
    });
    const cred = TwitterAuthProvider.credentialFromResult(userCred)!;
    expect(cred.accessToken).toBe('access-token');
    expect(cred.secret).toBe('token-secret');
    expect(cred.providerId).toBe(ProviderId.TWITTER);
    expect(cred.signInMethod).toBe(SignInMethod.TWITTER);
  });

  it('credentialFromError creates the cred from a tagged error', () => {
    const error = _createError(AuthErrorCode.NEED_CONFIRMATION, {
      appName: 'foo'
    });
    (error.customData! as TaggedWithTokenResponse)._tokenResponse = {
      ...TEST_ID_TOKEN_RESPONSE,
      oauthAccessToken: 'access-token',
      oauthTokenSecret: 'token-secret'
    };

    const cred = TwitterAuthProvider.credentialFromError(error)!;
    expect(cred.accessToken).toBe('access-token');
    expect(cred.secret).toBe('token-secret');
    expect(cred.providerId).toBe(ProviderId.TWITTER);
    expect(cred.signInMethod).toBe(SignInMethod.TWITTER);
  });
});
