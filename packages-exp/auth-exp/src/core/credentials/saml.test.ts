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

import { mockEndpoint } from '../../../test/helpers/api/helper';
import { TEST_ID_TOKEN_RESPONSE } from '../../../test/helpers/id_token_response';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as fetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { SignInWithIdpRequest } from '../../api/authentication/idp';
import { SAMLAuthCredential } from './saml';

describe('core/credentials/saml', () => {
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

  context('_create', () => {
    it('sets the provider', () => {
      const cred = SAMLAuthCredential._create('saml.provider', 'pending-token');
      expect(cred.providerId).to.eq('saml.provider');
    });
  });

  context('#toJSON', () => {
    it('packs up everything', () => {
      const cred = SAMLAuthCredential._create('saml.provider', 'pending-token');

      expect(cred.toJSON()).to.eql({
        signInMethod: 'saml.provider',
        providerId: 'saml.provider',
        pendingToken: 'pending-token'
      });
    });
  });

  context('fromJSON', () => {
    it('builds the new object correctly', () => {
      const cred = SAMLAuthCredential.fromJSON({
        signInMethod: 'saml.provider',
        providerId: 'saml.provider',
        pendingToken: 'pending-token'
      });

      expect(cred).to.be.instanceOf(SAMLAuthCredential);
      expect(cred!.providerId).to.eq('saml.provider');
      expect(cred!.signInMethod).to.eq('saml.provider');
    });
  });

  context('#makeRequest', () => {
    it('generates the proper request', async () => {
      await SAMLAuthCredential._create(
        'saml.provider',
        'pending-token'
      )._getIdTokenResponse(auth);

      const request = signInWithIdp.calls[0].request as SignInWithIdpRequest;
      expect(request.requestUri).to.eq('http://localhost');
      expect(request.returnSecureToken).to.be.true;
      expect(request.pendingToken).to.eq('pending-token');
      expect(request.postBody).to.be.undefined;
    });
  });

  context('internal methods', () => {
    let cred: SAMLAuthCredential;

    beforeEach(() => {
      cred = SAMLAuthCredential._create('saml.provider', 'pending-token');
    });

    it('_getIdTokenResponse calls through correctly', async () => {
      await cred._getIdTokenResponse(auth);

      const request = signInWithIdp.calls[0].request as SignInWithIdpRequest;
      expect(request.postBody).to.be.undefined;
      expect(request.pendingToken).to.eq('pending-token');
    });

    it('_linkToIdToken sets the idToken field on the request', async () => {
      await cred._linkToIdToken(auth, 'new-id-token');
      const request = signInWithIdp.calls[0].request as SignInWithIdpRequest;
      expect(request.postBody).to.be.undefined;
      expect(request.pendingToken).to.eq('pending-token');
      expect(request.idToken).to.eq('new-id-token');
    });

    it('_getReauthenticationResolver sets autoCreate to false', async () => {
      await cred._getReauthenticationResolver(auth);
      const request = signInWithIdp.calls[0].request as SignInWithIdpRequest;
      expect(request.postBody).to.be.undefined;
      expect(request.pendingToken).to.eq('pending-token');
      expect(request.autoCreate).to.be.false;
    });
  });
});
