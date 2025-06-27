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

import { OperationType } from '../../model/enums';

import { TEST_ID_TOKEN_RESPONSE } from '../../../test/helpers/id_token_response';
import { testUser, testAuth } from '../../../test/helpers/mock_auth';
import { TaggedWithTokenResponse } from '../../model/id_token';
import { SAMLAuthCredential } from '../credentials/saml';
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

  it('generates SAML provider', () => {
      const provider = new SAMLAuthProvider('saml.provider');
      expect(provider.providerId).to.eq('saml.provider');
  });

  it('returns error for invalid SAML provdier', () => {
    expect(() => {
      new SAMLAuthProvider('provider');
    }).throw(/auth\/argument-error/);
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

  it('credentialFromJSON returns SAML credential from valid object', () => {
    const json = {
      providerId: 'saml.provider',
      signInMethod: 'saml.provider',
      pendingToken: 'fake-pending-token'
    };

    const credential = SAMLAuthProvider.credentialFromJSON(json);
    expect(credential.providerId).to.eq('saml.provider');
    expect(credential.signInMethod).to.eq('saml.provider');
    expect((credential as any).pendingToken).to.eq('fake-pending-token');
  });

  it('returns null when _tokenResponse is missing (undefined)', () => {
    const error = _createError(AuthErrorCode.NEED_CONFIRMATION, {
      appName: 'test-app'
    });

    error.customData = {}; // _tokenResponse missing
    const credential = SAMLAuthProvider.credentialFromError(error);
    expect(credential).to.be.null;
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

    const cred = SAMLAuthProvider.credentialFromError(error);
    expect(cred).to.be.null;
  });

  it('returns null if _create throws internally', () => {
    const originalCreate = (SAMLAuthCredential as any)._create;

    (SAMLAuthCredential as any)._create = () => {
      throw new Error('Simulated error');
    };

    const error = _createError(AuthErrorCode.NEED_CONFIRMATION, {
      appName: 'test-app'
    });

    error.customData = {
      _tokenResponse: {
        pendingToken: 'valid-token',
        providerId: 'saml.my-provider'
      }
    };

    const cred = SAMLAuthProvider.credentialFromError(error);
    expect(cred).to.be.null;

    (SAMLAuthCredential as any)._create = originalCreate;
  });

  it('returns null when customData is undefined (falls back to empty object)', () => {
    const error = _createError(AuthErrorCode.NEED_CONFIRMATION, {
      appName: 'test-app'
    });

    delete (error as any).customData;

    const credential = SAMLAuthProvider.credentialFromError(error);
    expect(credential).to.be.null;
  });
});
