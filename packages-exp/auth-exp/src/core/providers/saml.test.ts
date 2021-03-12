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

import { OperationType } from '../../model/public_types';

import { TEST_ID_TOKEN_RESPONSE } from '../../../test/helpers/id_token_response';
import { testUser, testAuth } from '../../../test/helpers/mock_auth';
import { TaggedWithTokenResponse } from '../../model/id_token';
import { AuthErrorCode } from '../errors';
import { UserCredentialImpl } from '../user/user_credential_impl';
import { _createError } from '../util/assert';
import { SAMLAuthProvider } from './saml';

describe('core/providers/saml', () => {
  it('credentialFromResult creates the cred from a tagged result', async () => {
    const auth = await testAuth();
    const userCred = new UserCredentialImpl({
      user: testUser(auth, 'uid'),
      providerId: 'firebase',
      _tokenResponse: {
        ...TEST_ID_TOKEN_RESPONSE,
        pendingToken: 'pending-token',
        providerId: 'saml.provider'
      },
      operationType: OperationType.SIGN_IN
    });
    const cred = SAMLAuthProvider.credentialFromResult(userCred)!;
    expect(cred.providerId).to.eq('saml.provider');
    expect(cred.signInMethod).to.eq('saml.provider');
  });

  it('credentialFromResult returns null if provider ID not specified', async () => {
    const auth = await testAuth();
    const userCred = new UserCredentialImpl({
      user: testUser(auth, 'uid'),
      providerId: 'firebase',
      _tokenResponse: {
        ...TEST_ID_TOKEN_RESPONSE,
        pendingToken: 'pending-token'
      },
      operationType: OperationType.SIGN_IN
    });
    expect(SAMLAuthProvider.credentialFromResult(userCred)).to.be.null;
  });

  it('credentialFromError creates the cred from a tagged error', () => {
    const error = _createError(AuthErrorCode.NEED_CONFIRMATION, {
      appName: 'foo'
    });
    (error.customData! as TaggedWithTokenResponse)._tokenResponse = {
      ...TEST_ID_TOKEN_RESPONSE,
      pendingToken: 'pending-token',
      providerId: 'saml.provider'
    };

    const cred = SAMLAuthProvider.credentialFromError(error)!;
    expect(cred.providerId).to.eq('saml.provider');
    expect(cred.signInMethod).to.eq('saml.provider');
  });
});
