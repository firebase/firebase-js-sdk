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

import { ProviderId, SignInMethod } from '@firebase/auth-types-exp';

import { mockEndpoint } from '../../../test/helpers/api/helper';
import { TEST_ID_TOKEN_RESPONSE } from '../../../test/helpers/id_token_response';
import { testAuth } from '../../../test/helpers/mock_auth';
import * as fetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { SignInWithIdpRequest } from '../../api/authentication/idp';
import { Auth } from '../../model/auth';
import { OAuthCredential, OAuthCredentialParams } from './oauth';

const BASE_PARAMS: OAuthCredentialParams = {
  providerId: ProviderId.GOOGLE,
  signInMethod: SignInMethod.GOOGLE
};

describe('src/core/credentials/oauth', () => {
  let auth: Auth;
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

  context('_fromParams', () => {
    it('sets the idToken and accessToken', () => {
      const cred = OAuthCredential._fromParams({
        ...BASE_PARAMS,
        idToken: 'id-token',
        accessToken: 'access-token'
      });

      expect(cred.idToken).to.eq('id-token');
      expect(cred.accessToken).to.eq('access-token');
    });

    it('sets the nonce only if pendingToken is missing', () => {
      const cred = OAuthCredential._fromParams({
        ...BASE_PARAMS,
        idToken: 'id-token',
        accessToken: 'access-token',
        nonce: 'nonce'
      });

      expect(cred.nonce).to.eq('nonce');
    });

    it('ignores the nonce if pendingToken set', () => {
      const cred = OAuthCredential._fromParams({
        ...BASE_PARAMS,
        nonce: 'nonce',
        idToken: 'id-token',
        accessToken: 'access-token',
        pendingToken: 'pending-token'
      });

      expect(cred.nonce).to.be.undefined;
    });

    it('handles oauth1 and oauth with token secret', () => {
      const cred = OAuthCredential._fromParams({
        ...BASE_PARAMS,
        oauthToken: 'oauth-token',
        oauthTokenSecret: 'oauth-token-secret'
      });

      expect(cred.accessToken).to.eq('oauth-token');
      expect(cred.secret).to.eq('oauth-token-secret');
    });
  });

  context('#toJSON', () => {
    it('packs up everything', () => {
      const cred = OAuthCredential._fromParams({
        ...BASE_PARAMS,
        idToken: 'id-token',
        accessToken: 'access-token',
        pendingToken: 'pending-token'
      });

      expect(cred.toJSON()).to.eql({
        ...BASE_PARAMS,
        idToken: 'id-token',
        accessToken: 'access-token',
        pendingToken: 'pending-token',
        secret: undefined,
        nonce: undefined
      });
    });
  });

  context('fromJSON', () => {
    it('builds the new object correctly', () => {
      const cred = OAuthCredential.fromJSON({
        ...BASE_PARAMS,
        idToken: 'id-token',
        accessToken: 'access-token',
        pendingToken: 'pending-token'
      });

      expect(cred).to.be.instanceOf(OAuthCredential);
      expect(cred!.idToken).to.eq('id-token');
      expect(cred!.accessToken).to.eq('access-token');
      expect(cred!.providerId).to.eq(BASE_PARAMS.providerId);
      expect(cred!.signInMethod).to.eq(BASE_PARAMS.signInMethod);
    });
  });

  context('#makeRequest', () => {
    it('sets all the fields in a querystring if using nonce', async () => {
      await OAuthCredential._fromParams({
        ...BASE_PARAMS,
        idToken: 'id-token',
        accessToken: 'access-token',
        nonce: 'nonce'
      })._getIdTokenResponse(auth);

      const { postBody, ...rest } = signInWithIdp.calls[0]
        .request as SignInWithIdpRequest;
      expect(rest.requestUri).to.eq('http://localhost');
      expect(rest.returnSecureToken).to.be.true;
      expect(postBody).to.contain('id_token=id-token');
      expect(postBody).to.contain('access_token=access-token');
      expect(postBody).to.contain('nonce=nonce');
      expect(postBody).to.contain('providerId=google.com');
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
      expect(request.requestUri).to.eq('http://localhost');
      expect(request.returnSecureToken).to.be.true;
      expect(request.pendingToken).to.eq('pending-token');
      expect(request.postBody).to.be.null;
    });
  });

  context('internal methods', () => {
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
      expect(typeof request.postBody).to.eq('string');
    });

    it('_linkToIdToken sets the idToken field on the request', async () => {
      await cred._linkToIdToken(auth, 'new-id-token');
      const request = signInWithIdp.calls[0].request as SignInWithIdpRequest;
      expect(typeof request.postBody).to.eq('string');
      expect(request.idToken).to.eq('new-id-token');
    });

    it('_getReauthenticationResolver sets autoCreate to false', async () => {
      await cred._getReauthenticationResolver(auth);
      const request = signInWithIdp.calls[0].request as SignInWithIdpRequest;
      expect(typeof request.postBody).to.eq('string');
      expect(request.autoCreate).to.be.false;
    });
  });
});
