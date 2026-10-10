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

import { ProviderId, SignInMethod } from '../../model/enums';

import { mockEndpoint } from '../../../test/helpers/api/helper';
import { TEST_ID_TOKEN_RESPONSE } from '../../../test/helpers/id_token_response';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as fetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { SignInWithIdpRequest } from '../../api/authentication/idp';
import { OAuthCredential, OAuthCredentialParams } from './oauth';

const BASE_PARAMS: OAuthCredentialParams = {
  providerId: ProviderId.GOOGLE,
  signInMethod: SignInMethod.GOOGLE
};

describe('core/credentials/oauth', () => {
  let auth: TestAuth;
  let signInWithIdp: fetch.Route;

  beforeEach(async () => {
    auth = await testAuth();
    fetch.setUp();

    signInWithIdp = mockEndpoint(Endpoint.SIGN_IN_WITH_IDP, {
      ...TEST_ID_TOKEN_RESPONSE
    });
  });

  afterEach(() => {
    fetch.tearDown();
  });

  describe('_fromParams', () => {
    it('sets the idToken and accessToken', () => {
      const cred = OAuthCredential._fromParams({
        ...BASE_PARAMS,
        idToken: 'id-token',
        accessToken: 'access-token'
      });

      expect(cred.idToken).toBe('id-token');
      expect(cred.accessToken).toBe('access-token');
    });

    it('sets the nonce only if pendingToken is missing', () => {
      const cred = OAuthCredential._fromParams({
        ...BASE_PARAMS,
        idToken: 'id-token',
        accessToken: 'access-token',
        nonce: 'nonce'
      });

      expect((cred.toJSON() as { nonce: string }).nonce).toBe('nonce');
    });

    it('ignores the nonce if pendingToken set', () => {
      const cred = OAuthCredential._fromParams({
        ...BASE_PARAMS,
        nonce: 'nonce',
        idToken: 'id-token',
        accessToken: 'access-token',
        pendingToken: 'pending-token'
      });

      expect((cred.toJSON() as { nonce?: string }).nonce).toBeUndefined();
    });

    it('handles oauth1 and oauth with token secret', () => {
      const cred = OAuthCredential._fromParams({
        ...BASE_PARAMS,
        oauthToken: 'oauth-token',
        oauthTokenSecret: 'oauth-token-secret'
      });

      expect(cred.accessToken).toBe('oauth-token');
      expect(cred.secret).toBe('oauth-token-secret');
    });
  });

  describe('#toJSON', () => {
    it('packs up everything', () => {
      const cred = OAuthCredential._fromParams({
        ...BASE_PARAMS,
        idToken: 'id-token',
        accessToken: 'access-token',
        pendingToken: 'pending-token'
      });

      expect(cred.toJSON()).toEqual({
        ...BASE_PARAMS,
        idToken: 'id-token',
        accessToken: 'access-token',
        pendingToken: 'pending-token',
        secret: undefined,
        nonce: undefined
      });
    });
  });

  describe('fromJSON', () => {
    it('builds the new object correctly', () => {
      const cred = OAuthCredential.fromJSON({
        ...BASE_PARAMS,
        idToken: 'id-token',
        accessToken: 'access-token',
        pendingToken: 'pending-token'
      });

      expect(cred).toBeInstanceOf(OAuthCredential);
      expect(cred!.idToken).toBe('id-token');
      expect(cred!.accessToken).toBe('access-token');
      expect(cred!.providerId).toBe(BASE_PARAMS.providerId);
      expect(cred!.signInMethod).toBe(BASE_PARAMS.signInMethod);
    });
  });

  describe('#makeRequest', () => {
    it('sets all the fields in a querystring if using nonce', async () => {
      await OAuthCredential._fromParams({
        ...BASE_PARAMS,
        idToken: 'id-token',
        accessToken: 'access-token',
        nonce: 'nonce'
      })._getIdTokenResponse(auth);

      const { postBody, ...rest } = signInWithIdp.calls[0]
        .request as SignInWithIdpRequest;
      expect(rest.requestUri).toBe('http://localhost');
      expect(rest.returnSecureToken).toBe(true);
      expect(postBody).toContain('id_token=id-token');
      expect(postBody).toContain('access_token=access-token');
      expect(postBody).toContain('nonce=nonce');
      expect(postBody).toContain('providerId=google.com');
    });

    it('if pendingToken is present, post body is not set', async () => {
      await OAuthCredential._fromParams({
        ...BASE_PARAMS,
        idToken: 'id-token',
        accessToken: 'access-token',
        nonce: 'nonce',
        pendingToken: 'pending-token'
      })._getIdTokenResponse(auth);

      const request = signInWithIdp.calls[0].request as SignInWithIdpRequest;
      expect(request.requestUri).toBe('http://localhost');
      expect(request.returnSecureToken).toBe(true);
      expect(request.pendingToken).toBe('pending-token');
      expect(request.postBody).toBeUndefined();
    });
  });

  describe('internal methods', () => {
    let cred: OAuthCredential;

    beforeEach(() => {
      cred = OAuthCredential._fromParams({
        ...BASE_PARAMS,
        idToken: 'id-token',
        accessToken: 'access-token'
      });
    });

    it('_getIdTokenResponse calls through correctly', async () => {
      await cred._getIdTokenResponse(auth);

      const request = signInWithIdp.calls[0].request as SignInWithIdpRequest;
      expect(typeof request.postBody).toBe('string');
    });

    it('_linkToIdToken sets the idToken field on the request', async () => {
      await cred._linkToIdToken(auth, 'new-id-token');
      const request = signInWithIdp.calls[0].request as SignInWithIdpRequest;
      expect(typeof request.postBody).toBe('string');
      expect(request.idToken).toBe('new-id-token');
    });

    it('_getReauthenticationResolver sets autoCreate to false', async () => {
      await cred._getReauthenticationResolver(auth);
      const request = signInWithIdp.calls[0].request as SignInWithIdpRequest;
      expect(typeof request.postBody).toBe('string');
      expect(request.autoCreate).toBe(false);
    });
  });
});
