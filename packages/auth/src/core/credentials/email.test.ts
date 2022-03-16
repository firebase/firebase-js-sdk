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
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';

import { ProviderId, SignInMethod } from '../../model/enums';

import { mockEndpoint, mockEndpointWithParams } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { Endpoint, RecaptchaClientType, RecaptchaVersion } from '../../api';
import { APIUserInfo } from '../../api/account_management/account';
import { EmailAuthCredential } from './email';
import { MockGreCAPTCHATopLevel } from '../../platform_browser/recaptcha/recaptcha_mock';
import { RecaptchaEnterpriseVerifier } from '../../platform_browser/recaptcha/recaptcha_enterprise_verifier';

use(chaiAsPromised);

describe('core/credentials/email', () => {
  let auth: TestAuth;
  let apiMock: mockFetch.Route;
  const serverUser: APIUserInfo = {
    localId: 'local-id'
  };

  beforeEach(async () => {
    auth = await testAuth();
  });

  context('email & password', () => {
    const credential = EmailAuthCredential._fromEmailAndPassword(
      'some-email',
      'some-password'
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
      it('calls sign in with password', async () => {
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

      context('#recaptcha', () => {
        beforeEach(async () => {
        });

        afterEach(() => {
          sinon.restore();
        });
        
        it('calls sign in with password with recaptcha enabled', async () => {
          const recaptcha = new MockGreCAPTCHATopLevel();
          window.grecaptcha = recaptcha;
          sinon.stub(recaptcha.enterprise, 'execute').returns(Promise.resolve('recaptcha-response'));
          mockEndpointWithParams(Endpoint.GET_RECAPTCHA_CONFIG, {
            clientType: RecaptchaClientType.WEB,
            version: RecaptchaVersion.ENTERPRISE,
          }, {
            recaptchaKey: 'site-key'
          });

          auth.setRecaptchaConfig({emailPasswordEnabled: true});
    
          const idTokenResponse = await credential._getIdTokenResponse(auth);
          expect(idTokenResponse.idToken).to.eq('id-token');
          expect(idTokenResponse.refreshToken).to.eq('refresh-token');
          expect(idTokenResponse.expiresIn).to.eq('1234');
          expect(idTokenResponse.localId).to.eq(serverUser.localId);
          expect(apiMock.calls[0].request).to.eql({
            captchaResponse: 'recaptcha-response',
            clientType: RecaptchaClientType.WEB,
            email: 'some-email',
            password: 'some-password',
            recaptchaVersion: RecaptchaVersion.ENTERPRISE,
            returnSecureToken: true,
          });
        });

        it('calls sign in with password with recaptcha disabled', async () => {
          const recaptcha = new MockGreCAPTCHATopLevel();
          window.grecaptcha = recaptcha;
          sinon.stub(recaptcha.enterprise, 'execute').returns(Promise.resolve('recaptcha-response'));
          mockEndpointWithParams(Endpoint.GET_RECAPTCHA_CONFIG, {
            clientType: RecaptchaClientType.WEB,
            version: RecaptchaVersion.ENTERPRISE,
          }, {
            recaptchaKey: 'site-key'
          });

          auth.setRecaptchaConfig({emailPasswordEnabled: false});
    
          const idTokenResponse = await credential._getIdTokenResponse(auth);
          expect(idTokenResponse.idToken).to.eq('id-token');
          expect(idTokenResponse.refreshToken).to.eq('refresh-token');
          expect(idTokenResponse.expiresIn).to.eq('1234');
          expect(idTokenResponse.localId).to.eq(serverUser.localId);
          expect(apiMock.calls[0].request).to.eql({
            email: 'some-email',
            password: 'some-password',
            returnSecureToken: true,
          });
        });

        it('calls sign in with password with recaptcha forced refresh succeed', async () => {
          const recaptcha = new MockGreCAPTCHATopLevel();
          window.grecaptcha = recaptcha;
          const stub = sinon.stub(recaptcha.enterprise, 'execute');

          // // First verification should fail with 'wrong-site-key'
          stub.withArgs('wrong-site-key', {action: 'signInWithEmailPassword'}).rejects();
          // Second verifcation should succeed with site key refreshed
          stub.withArgs('site-key', {action: 'signInWithEmailPassword'}).returns(Promise.resolve('recaptcha-response'));

          mockEndpointWithParams(Endpoint.GET_RECAPTCHA_CONFIG, {
            clientType: RecaptchaClientType.WEB,
            version: RecaptchaVersion.ENTERPRISE,
          }, {
            recaptchaKey: 'mock/project/mock/site-key'
          });

          RecaptchaEnterpriseVerifier.agentSiteKey = 'wrong-site-key';
          auth.setRecaptchaConfig({emailPasswordEnabled: true});
    
          const idTokenResponse = await credential._getIdTokenResponse(auth);
          expect(idTokenResponse.idToken).to.eq('id-token');
          expect(idTokenResponse.refreshToken).to.eq('refresh-token');
          expect(idTokenResponse.expiresIn).to.eq('1234');
          expect(idTokenResponse.localId).to.eq(serverUser.localId);
          expect(apiMock.calls[0].request).to.eql({
            captchaResponse: 'recaptcha-response',
            clientType: RecaptchaClientType.WEB,
            email: 'some-email',
            password: 'some-password',
            recaptchaVersion: RecaptchaVersion.ENTERPRISE,
            returnSecureToken: true,
          });
        });

        it('calls sign in with password with recaptcha verify failed', async () => {
          RecaptchaEnterpriseVerifier.agentSiteKey = null;
          mockEndpointWithParams(Endpoint.GET_RECAPTCHA_CONFIG, {
            clientType: RecaptchaClientType.WEB,
            version: RecaptchaVersion.ENTERPRISE,
          }, {});

          auth.setRecaptchaConfig({emailPasswordEnabled: true});
    
          const response = credential._getIdTokenResponse(auth);
          await expect(response).to.be.rejectedWith(Error, 'recaptchaKey undefined');
        });
      });
    });

    describe('#_linkToIdToken', () => {
      it('calls update email password', async () => {
        apiMock = mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {
          idToken: 'id-token',
          refreshToken: 'refresh-token',
          expiresIn: '1234',
          localId: serverUser.localId!
        });

        const idTokenResponse = await credential._linkToIdToken(
          auth,
          'id-token-2'
        );
        expect(idTokenResponse.idToken).to.eq('id-token');
        expect(idTokenResponse.refreshToken).to.eq('refresh-token');
        expect(idTokenResponse.expiresIn).to.eq('1234');
        expect(idTokenResponse.localId).to.eq(serverUser.localId);
        expect(apiMock.calls[0].request).to.eql({
          idToken: 'id-token-2',
          returnSecureToken: true,
          email: 'some-email',
          password: 'some-password'
        });
      });
    });

    describe('#_getReauthenticationResolver', () => {
      it('calls sign in with password', async () => {
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
  });

  context('email link', () => {
    const credential = EmailAuthCredential._fromEmailAndCode(
      'some-email',
      'oob-code'
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
      it('calls sign in with the new token', async () => {
        const idTokenResponse = await credential._linkToIdToken(
          auth,
          'id-token-2'
        );
        expect(idTokenResponse.idToken).to.eq('id-token');
        expect(idTokenResponse.refreshToken).to.eq('refresh-token');
        expect(idTokenResponse.expiresIn).to.eq('1234');
        expect(idTokenResponse.localId).to.eq(serverUser.localId);
        expect(apiMock.calls[0].request).to.eql({
          idToken: 'id-token-2',
          email: 'some-email',
          oobCode: 'oob-code'
        });
      });
    });

    describe('#_matchIdTokenWithUid', () => {
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
  });
});
