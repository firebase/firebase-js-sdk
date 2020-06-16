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

import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import { ProviderId, SignInMethod } from '@firebase/auth-types-exp';

import { mockEndpoint } from '../../../test/api/helper';
import { testAuth } from '../../../test/mock_auth';
import * as mockFetch from '../../../test/mock_fetch';
import { Endpoint } from '../../api';
import { APIUserInfo } from '../../api/account_management/account';
import { Auth } from '../../model/auth';
import { EmailAuthProvider } from '../providers/email';
import { EmailAuthCredential } from './email';

use(chaiAsPromised);

describe('core/credentials/email', () => {
  let auth: Auth;
  let apiMock: mockFetch.Route;
  const serverUser: APIUserInfo = {
    localId: 'local-id'
  };

  beforeEach(async () => {
    auth = await testAuth();
  });

  context('email & password', () => {
    const credential = new EmailAuthCredential(
      'some-email',
      'some-password',
      EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD
    );

    beforeEach(() => {
      mockFetch.setUp();
      apiMock = mockEndpoint(Endpoint.SIGN_IN_WITH_PASSWORD, {
        idToken: 'id-token',
        refreshToken: 'refresh-token',
        expiresIn: '1234',
        localId: serverUser.localId!
      });
    });
    afterEach(mockFetch.tearDown);

    it('should have an email provider', () => {
      expect(credential.providerId).to.eq(ProviderId.PASSWORD);
    });

    it('should have an anonymous sign in method', () => {
      expect(credential.signInMethod).to.eq(SignInMethod.EMAIL_PASSWORD);
    });

    describe('#toJSON', () => {
      it('throws', () => {
        expect(credential.toJSON).to.throw(Error);
      });
    });

    describe('#_getIdTokenResponse', () => {
      it('call sign in with password', async () => {
        const idTokenResponse = await credential._getIdTokenResponse(auth);
        expect(idTokenResponse.idToken).to.eq('id-token');
        expect(idTokenResponse.refreshToken).to.eq('refresh-token');
        expect(idTokenResponse.expiresIn).to.eq('1234');
        expect(idTokenResponse.localId).to.eq(serverUser.localId);
        expect(apiMock.calls[0].request).to.eql({
          returnSecureToken: true,
          email: 'some-email',
          password: 'some-password'
        });
      });
    });

    describe('#_linkToIdToken', () => {
      it('throws', async () => {
        await expect(
          credential._linkToIdToken(auth, 'id-token')
        ).to.be.rejectedWith(Error);
      });
    });

    describe('#_getReauthenticationResolver', () => {
      it('throws', () => {
        expect(() => credential._getReauthenticationResolver(auth)).to.throw(
          Error
        );
      });
    });
  });

  context('email link', () => {
    const credential = new EmailAuthCredential(
      'some-email',
      'oob-code',
      EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD
    );

    beforeEach(() => {
      mockFetch.setUp();
      apiMock = mockEndpoint(Endpoint.SIGN_IN_WITH_EMAIL_LINK, {
        idToken: 'id-token',
        refreshToken: 'refresh-token',
        expiresIn: '1234',
        localId: serverUser.localId!
      });
    });
    afterEach(mockFetch.tearDown);

    it('should have an email provider', () => {
      expect(credential.providerId).to.eq(ProviderId.PASSWORD);
    });

    it('should have an anonymous sign in method', () => {
      expect(credential.signInMethod).to.eq(SignInMethod.EMAIL_LINK);
    });

    describe('#toJSON', () => {
      it('throws', () => {
        expect(credential.toJSON).to.throw(Error);
      });
    });

    describe('#_getIdTokenResponse', () => {
      it('call sign in with email link', async () => {
        const idTokenResponse = await credential._getIdTokenResponse(auth);
        expect(idTokenResponse.idToken).to.eq('id-token');
        expect(idTokenResponse.refreshToken).to.eq('refresh-token');
        expect(idTokenResponse.expiresIn).to.eq('1234');
        expect(idTokenResponse.localId).to.eq(serverUser.localId);
        expect(apiMock.calls[0].request).to.eql({
          email: 'some-email',
          oobCode: 'oob-code'
        });
      });
    });

    describe('#_linkToIdToken', () => {
      it('throws', async () => {
        await expect(
          credential._linkToIdToken(auth, 'id-token')
        ).to.be.rejectedWith(Error);
      });
    });

    describe('#_matchIdTokenWithUid', () => {
      it('throws', () => {
        expect(() => credential._getReauthenticationResolver(auth)).to.throw(
          Error
        );
      });
    });
  });
});
