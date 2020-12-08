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

import {
  OperationType,
  ProviderId,
  SignInMethod
} from '@firebase/auth-types-exp';

import { TEST_ID_TOKEN_RESPONSE } from '../../../test/helpers/id_token_response';
import { testUser, testAuth } from '../../../test/helpers/mock_auth';
import { TaggedWithTokenResponse } from '../../model/id_token';
import { AuthErrorCode } from '../errors';
import { UserCredentialImpl } from '../user/user_credential_impl';
import { _createError } from '../util/assert';
import { OAuthProvider } from './oauth';

describe('core/providers/oauth', () => {
  it('generates the correct type of oauth credential', () => {
    const cred = new OAuthProvider('google.com').credential({
      idToken: 'id-token',
      accessToken: 'access-token'
    });
    expect(cred.accessToken).to.eq('access-token');
    expect(cred.idToken).to.eq('id-token');
    expect(cred.providerId).to.eq(ProviderId.GOOGLE);
    expect(cred.signInMethod).to.eq(SignInMethod.GOOGLE);
  });

  it('credentialFromResult creates the cred from a tagged result', async () => {
    const auth = await testAuth();
    const userCred = new UserCredentialImpl({
      user: testUser(auth, 'uid'),
      providerId: ProviderId.GOOGLE,
      _tokenResponse: {
        ...TEST_ID_TOKEN_RESPONSE,
        oauthAccessToken: 'access-token',
        oauthIdToken: 'id-token',
        providerId: ProviderId.FACEBOOK
      },
      operationType: OperationType.SIGN_IN
    });
    const cred = OAuthProvider.credentialFromResult(userCred)!;
    expect(cred.accessToken).to.eq('access-token');
    expect(cred.idToken).to.eq('id-token');
    expect(cred.providerId).to.eq(ProviderId.FACEBOOK);
    expect(cred.signInMethod).to.eq(SignInMethod.FACEBOOK);
  });

  it('credentialFromResult returns null if provider ID not specified', async () => {
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
    expect(OAuthProvider.credentialFromResult(userCred)).to.be.null;
  });

  it('credentialFromError creates the cred from a tagged error', () => {
    const error = _createError(AuthErrorCode.NEED_CONFIRMATION, {
      appName: 'foo'
    });
    (error.customData! as TaggedWithTokenResponse)._tokenResponse = {
      ...TEST_ID_TOKEN_RESPONSE,
      oauthAccessToken: 'access-token',
      oauthIdToken: 'id-token',
      providerId: ProviderId.FACEBOOK
    };

    const cred = OAuthProvider.credentialFromError(error)!;
    expect(cred.accessToken).to.eq('access-token');
    expect(cred.idToken).to.eq('id-token');
    expect(cred.providerId).to.eq(ProviderId.FACEBOOK);
    expect(cred.signInMethod).to.eq(SignInMethod.FACEBOOK);
  });
});
