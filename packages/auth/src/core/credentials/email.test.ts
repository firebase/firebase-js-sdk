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
import { mockLoadJS } from '../../../test/helpers/mock_loadjs';

vi.mock('../../platform_browser/load_js', { spy: true });
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

const RECAPTCHA_MODE_ENFORCE = 'enforce';
const RECAPTCHA_MODE_OFF = 'off';
const FAKE_RECAPTCHA_TOKEN = 'recaptcha-response';

function mockRecaptchaEnterpriseEnablement(
  enablementState: string
): mockFetch.Route | undefined {
  let recaptchaConfigResponse = {};
  if (enablementState === RECAPTCHA_MODE_ENFORCE) {
    recaptchaConfigResponse = recaptchaConfigResponseEnforce;
  } else {
    // assumes OFF for now.
    recaptchaConfigResponse = recaptchaConfigResponseOff;
  }
  const recaptcha = new MockGreCAPTCHATopLevel();
  if (typeof window === 'undefined') {
    return;
  }
  window.grecaptcha = recaptcha;
  sinon
    .stub(recaptcha.enterprise, 'execute')
    .returns(Promise.resolve(FAKE_RECAPTCHA_TOKEN));
  return mockEndpointWithParams(
    Endpoint.GET_RECAPTCHA_CONFIG,
    {
      clientType: RecaptchaClientType.WEB,
      version: RecaptchaVersion.ENTERPRISE
    },
    recaptchaConfigResponse
  );
}

function mockRecaptchaEnterpriseTokenFailure(): mockFetch.Route | undefined {
  if (typeof window === 'undefined') {
    return;
  }
  // Mock recaptcha js loading method but not set window.recaptcha to simulate recaptcha token retrieval failure
  vi.spyOn(jsHelpers, '_loadJS').mockImplementation(mockLoadJS);
  window.grecaptcha = undefined;

  return mockEndpointWithParams(
    Endpoint.GET_RECAPTCHA_CONFIG,
    {
      clientType: RecaptchaClientType.WEB,
      version: RecaptchaVersion.ENTERPRISE
    },
    recaptchaConfigResponseEnforce
  );
}

function mockRecaptchaEnterpriseTokenSuccess(action: string): void {
  // Mock recaptcha js loading method and manually set window.recaptcha
  vi.spyOn(jsHelpers, '_loadJS').mockImplementation(mockLoadJS);
  const recaptcha = new MockGreCAPTCHATopLevel();
  window.grecaptcha = recaptcha;
  const stub = sinon.stub(recaptcha.enterprise, 'execute');
  stub
    .withArgs('site-key', {
      action
    })
    .returns(Promise.resolve(FAKE_RECAPTCHA_TOKEN));

  mockEndpointWithParams(
    Endpoint.GET_RECAPTCHA_CONFIG,
    {
      clientType: RecaptchaClientType.WEB,
      version: RecaptchaVersion.ENTERPRISE
    },
    recaptchaConfigResponseEnforce
  );
}

describe('core/credentials/email', () => {
  let auth: TestAuth;
  let apiMock: mockFetch.Route;
  const serverUser: APIUserInfo = {
    localId: 'local-id'
  };

  beforeEach(async () => {
    auth = await testAuth();
    auth.settings.appVerificationDisabledForTesting = false;
  });

  describe('email & password', () => {
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
      expect(credential.providerId).toBe(ProviderId.PASSWORD);
    });

    it('should have an anonymous sign in method', () => {
      expect(credential.signInMethod).toBe(SignInMethod.EMAIL_PASSWORD);
    });

    describe('#toJSON', () => {
      it('throws', () => {
        expect(credential.toJSON).toThrow(Error);
      });
    });

    describe('#_getIdTokenResponse', () => {
      it('calls sign in with password', async () => {
        const idTokenResponse = await credential._getIdTokenResponse(auth);
        expect(idTokenResponse.idToken).toBe('id-token');
        expect(idTokenResponse.refreshToken).toBe('refresh-token');
        expect(idTokenResponse.expiresIn).toBe('1234');
        expect(idTokenResponse.localId).toBe(serverUser.localId);
        expect(apiMock.calls[0].request).toEqual({
          returnSecureToken: true,
          email: 'some-email',
          password: 'some-password',
          clientType: RecaptchaClientType.WEB
        });
      });

      describe('#recaptcha', () => {
        beforeEach(async () => {});

        afterEach(() => {
          vi.restoreAllMocks();
        });

        it('calls sign in with password with recaptcha enabled', async () => {
          // TODO(renkelvin) - refactor these tests to be in the same describe block, so we can use
          // describe.skip in one place.
          if (typeof window === 'undefined') {
            // Skip in non-browser environment.
            return;
          }
          mockRecaptchaEnterpriseEnablement(RECAPTCHA_MODE_ENFORCE);
          vi.spyOn(jsHelpers, '_loadJS').mockImplementation(mockLoadJS);

          await _initializeRecaptchaConfig(auth);
          const idTokenResponse = await credential._getIdTokenResponse(auth);

          expect(idTokenResponse.idToken).toBe('id-token');
          expect(idTokenResponse.refreshToken).toBe('refresh-token');
          expect(idTokenResponse.expiresIn).toBe('1234');
          expect(idTokenResponse.localId).toBe(serverUser.localId);
          expect(apiMock.calls[0].request).toEqual({
            captchaResponse: FAKE_RECAPTCHA_TOKEN,
            clientType: RecaptchaClientType.WEB,
            email: 'some-email',
            password: 'some-password',
            recaptchaVersion: RecaptchaVersion.ENTERPRISE,
            returnSecureToken: true
          });
        });

        it('calls sign in with password with recaptcha disabled', async () => {
          if (typeof window === 'undefined') {
            // Skip in non-browser environment.
            return;
          }
          mockRecaptchaEnterpriseEnablement(RECAPTCHA_MODE_OFF);
          vi.spyOn(jsHelpers, '_loadJS').mockImplementation(mockLoadJS);

          await _initializeRecaptchaConfig(auth);
          const idTokenResponse = await credential._getIdTokenResponse(auth);

          expect(idTokenResponse.idToken).toBe('id-token');
          expect(idTokenResponse.refreshToken).toBe('refresh-token');
          expect(idTokenResponse.expiresIn).toBe('1234');
          expect(idTokenResponse.localId).toBe(serverUser.localId);
          expect(apiMock.calls[0].request).toEqual({
            email: 'some-email',
            password: 'some-password',
            returnSecureToken: true,
            clientType: RecaptchaClientType.WEB
          });
        });

        it('calls sign in with password with recaptcha forced refresh', async () => {
          if (typeof window === 'undefined') {
            // Skip in non-browser environment.
            return;
          }
          mockRecaptchaEnterpriseEnablement(RECAPTCHA_MODE_ENFORCE);
          const getRecaptchaConfigMock = mockRecaptchaEnterpriseTokenFailure();
          expect(getRecaptchaConfigMock).toBeDefined();

          await _initializeRecaptchaConfig(auth);
          auth._agentRecaptchaConfig!.siteKey = 'cached-site-key';

          await expect(credential._getIdTokenResponse(auth)).rejects.toThrow(
            'No reCAPTCHA enterprise script loaded.'
          );
          // Should call getRecaptchaConfig once to refresh the cached recaptcha config
          expect(getRecaptchaConfigMock.calls.length).toBe(2);
          expect(auth._agentRecaptchaConfig?.siteKey).toBe('site-key');
        });

        it('calls fallback to recaptcha flow when receiving MISSING_RECAPTCHA_TOKEN error', async () => {
          if (typeof window === 'undefined') {
            // Skip in non-browser environment.
            return;
          }
          mockRecaptchaEnterpriseTokenSuccess(
            RecaptchaActionName.SIGN_IN_WITH_PASSWORD
          );
          const failureMock = mockEndpoint(
            Endpoint.SIGN_IN_WITH_PASSWORD,
            {
              error: {
                code: 400,
                message: ServerError.MISSING_RECAPTCHA_TOKEN
              }
            },
            400
          );

          // First call without recaptcha token should fail with MISSING_RECAPTCHA_TOKEN error
          // Though the internal implementation retries with a reCAPTCHA Enterprise token, the second call will fail in this test.
          // This is because our endpoint mock does not support returning different responses based on different request body params.
          // TODO(renkelvin) - refactor this once we expose a mockEndpointWithBodyParams or similar method.
          await expect(credential._getIdTokenResponse(auth)).rejects.toThrow(
            'Firebase: The reCAPTCHA token is missing when sending request to the backend. (auth/missing-recaptcha-token).'
          );

          expect(failureMock.calls.length).toBe(2);
          expect(failureMock.calls[0].request).toEqual({
            returnSecureToken: true,
            email: 'some-email',
            password: 'some-password',
            clientType: RecaptchaClientType.WEB
          });
          expect(failureMock.calls[1].request).toEqual({
            returnSecureToken: true,
            email: 'some-email',
            password: 'some-password',
            clientType: RecaptchaClientType.WEB,
            recaptchaVersion: 'RECAPTCHA_ENTERPRISE',
            captchaResponse: FAKE_RECAPTCHA_TOKEN
          });
        });
      });
    });

    describe('#_linkToIdToken', () => {
      it('calls sign up with email password', async () => {
        apiMock = mockEndpoint(Endpoint.SIGN_UP, {
          idToken: 'id-token',
          refreshToken: 'refresh-token',
          expiresIn: '1234',
          localId: serverUser.localId!
        });

        const idTokenResponse = await credential._linkToIdToken(
          auth,
          'id-token-2'
        );
        expect(idTokenResponse.idToken).toBe('id-token');
        expect(idTokenResponse.refreshToken).toBe('refresh-token');
        expect(idTokenResponse.expiresIn).toBe('1234');
        expect(idTokenResponse.localId).toBe(serverUser.localId);
        expect(apiMock.calls[0].request).toEqual({
          idToken: 'id-token-2',
          returnSecureToken: true,
          email: 'some-email',
          password: 'some-password',
          clientType: RecaptchaClientType.WEB
        });
      });
      describe('#recaptcha', () => {
        beforeEach(async () => {
          apiMock = mockEndpoint(Endpoint.SIGN_UP, {
            idToken: 'id-token',
            refreshToken: 'refresh-token',
            expiresIn: '1234',
            localId: serverUser.localId!
          });
        });

        afterEach(() => {
          vi.restoreAllMocks();
        });

        it('calls sign up with password with recaptcha enabled', async () => {
          if (typeof window === 'undefined') {
            // Skip in non-browser environment.
            return;
          }
          mockRecaptchaEnterpriseEnablement(RECAPTCHA_MODE_ENFORCE);
          vi.spyOn(jsHelpers, '_loadJS').mockImplementation(mockLoadJS);

          // proactively initialize config so that token fetch is attempted with the first request.
          await _initializeRecaptchaConfig(auth);

          const idTokenResponse = await credential._linkToIdToken(
            auth,
            'id-token-2'
          );
          expect(idTokenResponse.idToken).toBe('id-token');
          expect(idTokenResponse.refreshToken).toBe('refresh-token');
          expect(idTokenResponse.expiresIn).toBe('1234');
          expect(idTokenResponse.localId).toBe(serverUser.localId);
          expect(apiMock.calls[0].request).toEqual({
            captchaResponse: FAKE_RECAPTCHA_TOKEN,
            recaptchaVersion: RecaptchaVersion.ENTERPRISE,
            idToken: 'id-token-2',
            returnSecureToken: true,
            email: 'some-email',
            password: 'some-password',
            clientType: 'CLIENT_TYPE_WEB'
          });
        });

        it('calls sign up with password with recaptcha disabled', async () => {
          if (typeof window === 'undefined') {
            // Skip in non-browser environment.
            return;
          }
          mockRecaptchaEnterpriseEnablement(RECAPTCHA_MODE_OFF);

          // proactively initialize config so that token fetch is attempted with the first request.
          await _initializeRecaptchaConfig(auth);
          const idTokenResponse = await credential._linkToIdToken(
            auth,
            'id-token-2'
          );

          expect(idTokenResponse.idToken).toBe('id-token');
          expect(idTokenResponse.refreshToken).toBe('refresh-token');
          expect(idTokenResponse.expiresIn).toBe('1234');
          expect(idTokenResponse.localId).toBe(serverUser.localId);
          expect(apiMock.calls[0].request).toEqual({
            idToken: 'id-token-2',
            returnSecureToken: true,
            email: 'some-email',
            password: 'some-password',
            clientType: 'CLIENT_TYPE_WEB'
          });
        });

        it('calls sign up with password with recaptcha forced refresh', async () => {
          if (typeof window === 'undefined') {
            // Skip in non-browser environment.
            return;
          }
          const getRecaptchaConfigMock = mockRecaptchaEnterpriseTokenFailure();
          expect(getRecaptchaConfigMock).toBeDefined();

          // proactively initialize config so that token fetch is attempted with the first request.
          await _initializeRecaptchaConfig(auth);
          auth._agentRecaptchaConfig!.siteKey = 'cached-site-key';

          await expect(
            credential._linkToIdToken(auth, 'id-token-2')
          ).rejects.toThrow('No reCAPTCHA enterprise script loaded.');
          // Should call getRecaptchaConfig once to refresh the cached recaptcha config
          expect(getRecaptchaConfigMock.calls.length).toBe(2);
          expect(auth._agentRecaptchaConfig?.siteKey).toBe('site-key');
        });

        it('calls fallback to recaptcha flow when receiving MISSING_RECAPTCHA_TOKEN error', async () => {
          if (typeof window === 'undefined') {
            // Skip in non-browser environment.
            return;
          }
          mockRecaptchaEnterpriseTokenSuccess(
            RecaptchaActionName.SIGN_UP_PASSWORD
          );
          const failureMock = mockEndpoint(
            Endpoint.SIGN_UP,
            {
              error: {
                code: 400,
                message: ServerError.MISSING_RECAPTCHA_TOKEN
              }
            },
            400
          );

          // First call without recaptcha token should fail with MISSING_RECAPTCHA_TOKEN error
          // Though the internal implementation retries with a reCAPTCHA Enterprise token, the second call will fail in this test.
          // This is because our endpoint mock does not support returning different responses based on different request body params.
          // TODO(renkelvin) - refactor this once we expose a mockEndpointWithBodyParams or similar method.
          await expect(
            credential._linkToIdToken(auth, 'id-token-2')
          ).rejects.toThrow(
            'Firebase: The reCAPTCHA token is missing when sending request to the backend. (auth/missing-recaptcha-token).'
          );

          expect(failureMock.calls.length).toBe(2);
          expect(failureMock.calls[0].request).toEqual({
            idToken: 'id-token-2',
            returnSecureToken: true,
            email: 'some-email',
            password: 'some-password',
            clientType: RecaptchaClientType.WEB
          });
          expect(failureMock.calls[1].request).toEqual({
            idToken: 'id-token-2',
            returnSecureToken: true,
            email: 'some-email',
            password: 'some-password',
            clientType: RecaptchaClientType.WEB,
            recaptchaVersion: 'RECAPTCHA_ENTERPRISE',
            captchaResponse: FAKE_RECAPTCHA_TOKEN
          });
        });
      });
    });

    describe('#_getReauthenticationResolver', () => {
      it('calls sign in with password', async () => {
        const idTokenResponse = await credential._getIdTokenResponse(auth);
        expect(idTokenResponse.idToken).toBe('id-token');
        expect(idTokenResponse.refreshToken).toBe('refresh-token');
        expect(idTokenResponse.expiresIn).toBe('1234');
        expect(idTokenResponse.localId).toBe(serverUser.localId);
        expect(apiMock.calls[0].request).toEqual({
          returnSecureToken: true,
          email: 'some-email',
          password: 'some-password',
          clientType: 'CLIENT_TYPE_WEB'
        });
      });
    });
  });

  describe('email link', () => {
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
      expect(credential.providerId).toBe(ProviderId.PASSWORD);
    });

    it('should have an anonymous sign in method', () => {
      expect(credential.signInMethod).toBe(SignInMethod.EMAIL_LINK);
    });

    describe('#toJSON', () => {
      it('throws', () => {
        expect(credential.toJSON).toThrow(Error);
      });
    });

    describe('#_getIdTokenResponse', () => {
      it('call sign in with email link', async () => {
        const idTokenResponse = await credential._getIdTokenResponse(auth);
        expect(idTokenResponse.idToken).toBe('id-token');
        expect(idTokenResponse.refreshToken).toBe('refresh-token');
        expect(idTokenResponse.expiresIn).toBe('1234');
        expect(idTokenResponse.localId).toBe(serverUser.localId);
        expect(apiMock.calls[0].request).toEqual({
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
        expect(idTokenResponse.idToken).toBe('id-token');
        expect(idTokenResponse.refreshToken).toBe('refresh-token');
        expect(idTokenResponse.expiresIn).toBe('1234');
        expect(idTokenResponse.localId).toBe(serverUser.localId);
        expect(apiMock.calls[0].request).toEqual({
          idToken: 'id-token-2',
          email: 'some-email',
          oobCode: 'oob-code'
        });
      });
    });

    describe('#_matchIdTokenWithUid', () => {
      it('call sign in with email link', async () => {
        const idTokenResponse = await credential._getIdTokenResponse(auth);
        expect(idTokenResponse.idToken).toBe('id-token');
        expect(idTokenResponse.refreshToken).toBe('refresh-token');
        expect(idTokenResponse.expiresIn).toBe('1234');
        expect(idTokenResponse.localId).toBe(serverUser.localId);
        expect(apiMock.calls[0].request).toEqual({
          email: 'some-email',
          oobCode: 'oob-code'
        });
      });
    });
  });
});
