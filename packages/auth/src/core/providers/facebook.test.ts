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

import { OperationType, ProviderId, SignInMethod } from '../../model/enums';

import { TEST_ID_TOKEN_RESPONSE } from '../../../test/helpers/id_token_response';
import { testUser, testAuth } from '../../../test/helpers/mock_auth';
import { TaggedWithTokenResponse } from '../../model/id_token';
import { AuthErrorCode } from '../errors';
import { UserCredentialImpl } from '../user/user_credential_impl';
import { FacebookAuthProvider } from './facebook';
import { _createError } from '../util/assert';

describe('core/providers/facebook', () => {
  it('generates the correct type of oauth credential', () => {
    const cred = FacebookAuthProvider.credential('access-token');
    expect(cred.accessToken).to.eq('access-token');
    expect(cred.providerId).to.eq(ProviderId.FACEBOOK);
    expect(cred.signInMethod).to.eq(SignInMethod.FACEBOOK);
  });

  it('generates Facebook provider', () => {
    const provider = new FacebookAuthProvider();
    expect(provider.providerId).to.eq(ProviderId.FACEBOOK);
  });

  it('credentialFromResult creates the cred from a tagged result', async () => {
    const auth = await testAuth();
    const userCred = new UserCredentialImpl({
      user: testUser(auth, 'uid'),
      providerId: ProviderId.FACEBOOK,
      _tokenResponse: {
        ...TEST_ID_TOKEN_RESPONSE,
        oauthAccessToken: 'access-token'
      },
      operationType: OperationType.SIGN_IN
    });
    const cred = FacebookAuthProvider.credentialFromResult(userCred)!;
    expect(cred.accessToken).to.eq('access-token');
    expect(cred.providerId).to.eq(ProviderId.FACEBOOK);
    expect(cred.signInMethod).to.eq(SignInMethod.FACEBOOK);
  });

  it('credentialFromError creates the cred from a tagged error', () => {
    const error = _createError(AuthErrorCode.NEED_CONFIRMATION, {
      appName: 'foo'
    });
    (error.customData! as TaggedWithTokenResponse)._tokenResponse = {
      ...TEST_ID_TOKEN_RESPONSE,
      oauthAccessToken: 'access-token'
    };

    const cred = FacebookAuthProvider.credentialFromError(error)!;
    expect(cred.accessToken).to.eq('access-token');
    expect(cred.providerId).to.eq(ProviderId.FACEBOOK);
    expect(cred.signInMethod).to.eq(SignInMethod.FACEBOOK);
  });

  it('returns null when _tokenResponse is missing', () => {
    const error = _createError(AuthErrorCode.NEED_CONFIRMATION, {
      appName: 'foo'
    });
    error.customData = {}; // no _tokenResponse

    const cred = FacebookAuthProvider.credentialFromError(error);
    expect(cred).to.be.null;
  });

  it('returns null when _tokenResponse is missing oauthAccessToken key', () => {
    const error = _createError(AuthErrorCode.NEED_CONFIRMATION, {
      appName: 'foo'
    });
    error.customData = {
      _tokenResponse: {
        // intentionally missing oauthAccessToken
        idToken: 'some-id-token',
        oauthAccessToken: null
      }
    };

    const cred = FacebookAuthProvider.credentialFromError(error);
    expect(cred).to.be.null;
  });

  it('returns null when FacebookAuthProvider.credential throws', () => {
    // Temporarily stub credential method to throw
    const original = FacebookAuthProvider.credential;
    FacebookAuthProvider.credential = () => {
      throw new Error('Simulated failure');
    };

    const error = _createError(AuthErrorCode.NEED_CONFIRMATION, {
      appName: 'foo'
    });
    error.customData = {
      _tokenResponse: {
        oauthAccessToken: 'valid-token'
      }
    };

    const cred = FacebookAuthProvider.credentialFromError(error);
    expect(cred).to.be.null;

    // Restore original method
    FacebookAuthProvider.credential = original;
  });

  it('returns null when error.customData is undefined (falls back to empty object)', () => {
    const error = _createError(AuthErrorCode.NEED_CONFIRMATION, {
      appName: 'foo'
    });

    // Don't set `customData` at all → fallback to {}
    delete (error as any).customData;

    const cred = FacebookAuthProvider.credentialFromError(error);
    expect(cred).to.be.null;
  });
});
