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

/**
 * @license
 * Copyright 2020 Twitter LLC
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
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';
import { UserCredentialImpl } from '../user/user_credential_impl';
import { TwitterAuthProvider } from './twitter';

describe('core/providers/twitter', () => {
  it('generates the correct type of oauth credential', () => {
    const cred = TwitterAuthProvider.credential('token', 'secret');
    expect(cred.accessToken).to.eq('token');
    expect(cred.secret).to.eq('secret');
    expect(cred.providerId).to.eq(ProviderId.TWITTER);
    expect(cred.signInMethod).to.eq(SignInMethod.TWITTER);
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
    expect(cred.accessToken).to.eq('access-token');
    expect(cred.secret).to.eq('token-secret');
    expect(cred.providerId).to.eq(ProviderId.TWITTER);
    expect(cred.signInMethod).to.eq(SignInMethod.TWITTER);
  });

  it('credentialFromError creates the cred from a tagged error', () => {
    const error = AUTH_ERROR_FACTORY.create(AuthErrorCode.NEED_CONFIRMATION, {
      appName: 'foo'
    });
    (error.customData! as TaggedWithTokenResponse)._tokenResponse = {
      ...TEST_ID_TOKEN_RESPONSE,
      oauthAccessToken: 'access-token',
      oauthTokenSecret: 'token-secret'
    };

    const cred = TwitterAuthProvider.credentialFromError(error)!;
    expect(cred.accessToken).to.eq('access-token');
    expect(cred.secret).to.eq('token-secret');
    expect(cred.providerId).to.eq(ProviderId.TWITTER);
    expect(cred.signInMethod).to.eq(SignInMethod.TWITTER);
  });
});
