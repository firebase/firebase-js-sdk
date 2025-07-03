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
import { _createError } from '../util/assert';
import { OAuthProvider } from './oauth';
import { OAuthCredential } from '../credentials/oauth';
import sinon from 'sinon';

describe('core/providers/oauth', () => {
  const callMethod = (tokenResponse: any) => {
    return (OAuthProvider as any).oauthCredentialFromTaggedObject({
      _tokenResponse: tokenResponse
    });
  };

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

  it('credentialFromResult works for oidc', async () => {
    const auth = await testAuth();
    const userCred = new UserCredentialImpl({
      user: testUser(auth, 'uid'),
      providerId: ProviderId.GOOGLE,
      _tokenResponse: {
        ...TEST_ID_TOKEN_RESPONSE,
        pendingToken: 'pending-token',
        oauthIdToken: 'id-token',
        providerId: 'oidc.oidctest'
      },
      operationType: OperationType.SIGN_IN
    });
    const cred = OAuthProvider.credentialFromResult(userCred)!;
    expect(cred.idToken).to.eq('id-token');
    expect(cred.providerId).to.eq('oidc.oidctest');
    expect(cred.signInMethod).to.eq('oidc.oidctest');
    expect((cred.toJSON() as Record<string, string>).pendingToken).to.eq(
      'pending-token'
    );
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

  it('credential generates the cred with the correct fields', () => {
    const provider = new OAuthProvider('foo.test');
    const cred = provider.credential({
      idToken: 'foo',
      rawNonce: 'i-am-a-nonce'
    });
    expect(cred.idToken).to.eq('foo');
    expect(cred.providerId).to.eq('foo.test');
    expect(cred.signInMethod).to.eq('foo.test');
    expect((cred.toJSON() as { nonce: string }).nonce).to.eq('i-am-a-nonce');
  });

  it('creates OAuthCredential from valid object input', () => {
    const input = {
      providerId: 'google.com',
      signInMethod: 'google.com',
      idToken: 'id-token',
      accessToken: 'access-token'
    };

    const credential = OAuthProvider.credentialFromJSON(input);
    expect(credential).to.be.instanceOf(OAuthCredential);
    expect(credential.providerId).to.equal('google.com');
    expect(credential.signInMethod).to.equal('google.com');
    expect(credential.idToken).to.equal('id-token');
    expect(credential.accessToken).to.equal('access-token');
  });

  it('creates OAuthCredential from valid JSON string input', () => {
    const input = JSON.stringify({
      providerId: 'providerid',
      signInMethod: 'providerid',
      accessToken: 'access-token'
    });

    const credential = OAuthProvider.credentialFromJSON(input);
    expect(credential).to.be.instanceOf(OAuthCredential);
    expect(credential.providerId).to.equal('providerid');
    expect(credential.signInMethod).to.equal('providerid');
    expect(credential.accessToken).to.equal('access-token');
  });

  it('throws an error if providerId or signInMethod is missing', () => {
    const input = {
      idToken: 'missing-provider-id'
    };

    expect(() => {
      OAuthProvider.credentialFromJSON(input);
    }).to.throw(AuthErrorCode.ARGUMENT_ERROR);
  });

  it('throws an error if JSON string is invalid', () => {
    const invalidJson = '{ not valid json }';

    expect(() => {
      OAuthProvider.credentialFromJSON(invalidJson);
    }).to.throw(SyntaxError);
  });

  it('returns null if tokenResponse is missing', () => {
    const result = callMethod(undefined);
    expect(result).to.be.null;
  });

  it('returns null if all tokens (idToken, accessToken, tokenSecret, pendingToken) are missing', () => {
    const result = callMethod({
      providerId: 'google.com'
      // all token fields missing
    });
    expect(result).to.be.null;
  });

  it('returns null if providerId is missing', () => {
    const result = callMethod({
      oauthIdToken: 'id-token',
      oauthAccessToken: 'access-token'
      // providerId is missing
    });
    expect(result).to.be.null;
  });

  it('returns null if OAuthProvider._credential throws', () => {
    const proto = OAuthProvider.prototype as any;
    const original = proto._credential;

    // Temporarily replace _credential to throw an error
    proto._credential = () => {
      throw new Error('Simulated error');
    };

    const result = (OAuthProvider as any).oauthCredentialFromTaggedObject({
      _tokenResponse: {
        providerId: 'google.com',
        oauthIdToken: 'id-token'
      }
    });

    expect(result).to.be.null;

    // Restore original method
    proto._credential = original;
  });
});
