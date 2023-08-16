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

import {
  mockEndpoint,
  mockEndpointWithParams
} from '../../../test/helpers/api/helper';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import {
  Endpoint,
  RecaptchaClientType,
  RecaptchaVersion,
  RecaptchaActionName
} from '../../api';
import { APIUserInfo } from '../../api/account_management/account';
import { EmailAuthCredential } from './email';
import { MockGreCAPTCHATopLevel } from '../../platform_browser/recaptcha/recaptcha_mock';
import * as jsHelpers from '../../platform_browser/load_js';
import { ServerError } from '../../api/errors';
import { _initializeRecaptchaConfig } from '../../platform_browser/recaptcha/recaptcha_enterprise_verifier';

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
          password: 'some-password',
          clientType: 'CLIENT_TYPE_WEB'
        });
      });

      context('#recaptcha', () => {
        beforeEach(async () => {});

        afterEach(() => {
          sinon.restore();
        });

        const recaptchaConfigResponseEnforce = {
          recaptchaKey: 'foo/bar/to/site-key',
          recaptchaEnforcementState: [
            { provider: 'EMAIL_PASSWORD_PROVIDER', enforcementState: 'ENFORCE' }
          ]
        };
        const recaptchaConfigResponseOff = {
          recaptchaKey: 'foo/bar/to/site-key',
          recaptchaEnforcementState: [
            { provider: 'EMAIL_PASSWORD_PROVIDER', enforcementState: 'OFF' }
          ]
        };

        it('calls sign in with password with recaptcha enabled', async () => {
          const recaptcha = new MockGreCAPTCHATopLevel();
          if (typeof window === 'undefined') {
            return;
          }
          window.grecaptcha = recaptcha;
          sinon
            .stub(recaptcha.enterprise, 'execute')
            .returns(Promise.resolve('recaptcha-response'));
          mockEndpointWithParams(
            Endpoint.GET_RECAPTCHA_CONFIG,
            {
              clientType: RecaptchaClientType.WEB,
              version: RecaptchaVersion.ENTERPRISE
            },
            recaptchaConfigResponseEnforce
          );
          await _initializeRecaptchaConfig(auth);

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
            returnSecureToken: true
          });
        });

        it('calls sign in with password with recaptcha disabled', async () => {
          const recaptcha = new MockGreCAPTCHATopLevel();
          if (typeof window === 'undefined') {
            return;
          }
          window.grecaptcha = recaptcha;
          sinon
            .stub(recaptcha.enterprise, 'execute')
            .returns(Promise.resolve('recaptcha-response'));
          mockEndpointWithParams(
            Endpoint.GET_RECAPTCHA_CONFIG,
            {
              clientType: RecaptchaClientType.WEB,
              version: RecaptchaVersion.ENTERPRISE
            },
            recaptchaConfigResponseOff
          );
          await _initializeRecaptchaConfig(auth);

          const idTokenResponse = await credential._getIdTokenResponse(auth);
          expect(idTokenResponse.idToken).to.eq('id-token');
          expect(idTokenResponse.refreshToken).to.eq('refresh-token');
          expect(idTokenResponse.expiresIn).to.eq('1234');
          expect(idTokenResponse.localId).to.eq(serverUser.localId);
          expect(apiMock.calls[0].request).to.eql({
            email: 'some-email',
            password: 'some-password',
            returnSecureToken: true,
            clientType: 'CLIENT_TYPE_WEB'
          });
        });

        it('calls sign in with password with recaptcha forced refresh', async () => {
          if (typeof window === 'undefined') {
            return;
          }
          // Mock recaptcha js loading method but not set window.recaptcha to simulate recaptcha token retrieval failure
          sinon
            .stub(jsHelpers, '_loadJS')
            .returns(Promise.resolve(new Event('')));
          window.grecaptcha = undefined;

          const getRecaptchaConfigMock = mockEndpointWithParams(
            Endpoint.GET_RECAPTCHA_CONFIG,
            {
              clientType: RecaptchaClientType.WEB,
              version: RecaptchaVersion.ENTERPRISE
            },
            recaptchaConfigResponseEnforce
          );
          await _initializeRecaptchaConfig(auth);
          auth._agentRecaptchaConfig!.siteKey = 'cached-site-key';

          await expect(credential._getIdTokenResponse(auth)).to.be.rejectedWith(
            'No reCAPTCHA enterprise script loaded.'
          );
          // Should call getRecaptchaConfig once to refresh the cached recaptcha config
          expect(getRecaptchaConfigMock.calls.length).to.eq(2);
          expect(auth._agentRecaptchaConfig?.siteKey).to.eq('site-key');
        });

        it('calls fallback to recaptcha flow when receiving MISSING_RECAPTCHA_TOKEN error', async () => {
          if (typeof window === 'undefined') {
            return;
          }

          // First call without recaptcha token should fail with MISSING_RECAPTCHA_TOKEN error
          mockEndpointWithParams(
            Endpoint.SIGN_IN_WITH_PASSWORD,
            {
              email: 'second-email',
              password: 'some-password',
              returnSecureToken: true,
              clientType: RecaptchaClientType.WEB
            },
            {
              error: {
                code: 400,
                message: ServerError.MISSING_RECAPTCHA_TOKEN
              }
            },
            400
          );

          // Second call with a valid recaptcha token (captchaResp) should succeed
          mockEndpointWithParams(
            Endpoint.SIGN_IN_WITH_PASSWORD,
            {
              captchaResponse: 'recaptcha-response',
              clientType: RecaptchaClientType.WEB,
              email: 'some-email',
              password: 'some-password',
              recaptchaVersion: RecaptchaVersion.ENTERPRISE,
              returnSecureToken: true
            },
            {
              idToken: 'id-token',
              refreshToken: 'refresh-token',
              expiresIn: '1234',
              localId: serverUser.localId!
            }
          );

          // Mock recaptcha js loading method and manually set window.recaptcha
          sinon
            .stub(jsHelpers, '_loadJS')
            .returns(Promise.resolve(new Event('')));
          const recaptcha = new MockGreCAPTCHATopLevel();
          window.grecaptcha = recaptcha;
          const stub = sinon.stub(recaptcha.enterprise, 'execute');
          stub
            .withArgs('site-key', {
              action: RecaptchaActionName.SIGN_IN_WITH_PASSWORD
            })
            .returns(Promise.resolve('recaptcha-response'));

          mockEndpointWithParams(
            Endpoint.GET_RECAPTCHA_CONFIG,
            {
              clientType: RecaptchaClientType.WEB,
              version: RecaptchaVersion.ENTERPRISE
            },
            recaptchaConfigResponseEnforce
          );

          const idTokenResponse = await credential._getIdTokenResponse(auth);
          expect(idTokenResponse.idToken).to.eq('id-token');
          expect(idTokenResponse.refreshToken).to.eq('refresh-token');
          expect(idTokenResponse.expiresIn).to.eq('1234');
          expect(idTokenResponse.localId).to.eq(serverUser.localId);
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
          password: 'some-password',
          clientType: 'CLIENT_TYPE_WEB'
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
