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

import {
  Endpoint,
  RecaptchaClientType,
  RecaptchaVersion,
  RecaptchaActionName,
  RecaptchaAuthProvider,
  EnforcementState
} from '../../api';
import { mockEndpointWithParams } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { ServerError } from '../../api/errors';
import { AuthInternal } from '../../model/auth';
import * as jsHelpers from '../load_js';

import { MockGreCAPTCHATopLevel } from './recaptcha_mock';
import {
  RecaptchaEnterpriseVerifier,
  FAKE_TOKEN,
  handleRecaptchaFlow,
  injectRecaptchaFields
} from './recaptcha_enterprise_verifier';
import { RecaptchaConfig } from './recaptcha';
import { AuthErrorCode } from '../../core/errors';
import { _createError } from '../../core/util/assert';
import { mockLoadJS } from '../../../test/helpers/mock_loadjs';
import { MockInstance } from 'vitest';

vi.mock('../load_js', { spy: true });

describe('platform_browser/recaptcha/recaptcha_enterprise_verifier', () => {
  let auth: TestAuth;
  let verifier: RecaptchaEnterpriseVerifier;

  const recaptchaConfigResponseEnforce = {
    recaptchaKey: 'foo/bar/to/site-key',
    recaptchaEnforcementState: [
      {
        provider: RecaptchaAuthProvider.EMAIL_PASSWORD_PROVIDER,
        enforcementState: EnforcementState.ENFORCE
      },
      {
        provider: RecaptchaAuthProvider.PHONE_PROVIDER,
        enforcementState: EnforcementState.ENFORCE
      }
    ]
  };
  const recaptchaConfigEnforce = new RecaptchaConfig(
    recaptchaConfigResponseEnforce
  );
  const recaptchaConfigResponseOff = {
    recaptchaKey: 'foo/bar/to/site-key',
    recaptchaEnforcementState: [
      {
        provider: RecaptchaAuthProvider.EMAIL_PASSWORD_PROVIDER,
        enforcementState: EnforcementState.OFF
      },
      {
        provider: RecaptchaAuthProvider.PHONE_PROVIDER,
        enforcementState: EnforcementState.OFF
      }
    ]
  };
  const recaptchaConfigOff = new RecaptchaConfig(recaptchaConfigResponseOff);
  const recaptchaConfigResponseAudit = {
    recaptchaKey: 'foo/bar/to/site-key',
    recaptchaEnforcementState: [
      {
        provider: RecaptchaAuthProvider.EMAIL_PASSWORD_PROVIDER,
        enforcementState: EnforcementState.AUDIT
      },
      {
        provider: RecaptchaAuthProvider.PHONE_PROVIDER,
        enforcementState: EnforcementState.AUDIT
      }
    ]
  };
  const recaptchaConfigAudit = new RecaptchaConfig(
    recaptchaConfigResponseAudit
  );

  const getRecaptchaConfigRequest = {
    clientType: RecaptchaClientType.WEB,
    version: RecaptchaVersion.ENTERPRISE
  };

  let recaptcha: MockGreCAPTCHATopLevel;

  beforeEach(async () => {
    auth = await testAuth();
    auth.settings.appVerificationDisabledForTesting = false;
    mockFetch.setUp();
    verifier = new RecaptchaEnterpriseVerifier(auth);
    recaptcha = new MockGreCAPTCHATopLevel();
    vi.spyOn(jsHelpers, '_loadJS').mockImplementation(mockLoadJS);
    window.grecaptcha = recaptcha;
  });

  afterEach(() => {
    mockFetch.tearDown();
    delete (window as any).grecaptcha;
    vi.restoreAllMocks();
  });

  describe('#verify', () => {
    it('returns if response is available', async () => {
      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        getRecaptchaConfigRequest,
        recaptchaConfigResponseEnforce
      );
      vi.spyOn(recaptcha.enterprise, 'execute').mockResolvedValue(
        'recaptcha-response'
      );
      expect(await verifier.verify()).toBe('recaptcha-response');
    });

    it('reject if error is thrown when retrieve site key', async () => {
      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        getRecaptchaConfigRequest,
        {
          error: {
            code: 400,
            message: ServerError.MISSING_CLIENT_TYPE
          }
        },
        400
      );
      vi.spyOn(recaptcha.enterprise, 'execute').mockResolvedValue(
        'recaptcha-response'
      );
      await expect(verifier.verify()).rejects.toThrow(
        Error,
        'auth/missing-client-type'
      );
    });

    it('return fake recaptcha token if error is thrown when retrieve recaptcha token', async () => {
      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        getRecaptchaConfigRequest,
        recaptchaConfigResponseEnforce
      );
      vi.spyOn(recaptcha.enterprise, 'execute').mockRejectedValue(
        new Error('retrieve-recaptcha-token-error')
      );
      expect(await verifier.verify()).toBe(FAKE_TOKEN);
    });
  });

  describe('#handleRecaptchaFlow', () => {
    let mockAuthInstance: AuthInternal;
    let mockRequest: any;
    let mockActionMethod: MockInstance;

    beforeEach(async () => {
      mockAuthInstance = await testAuth();
      mockRequest = { foo: 'bar' };
      mockActionMethod = vi.fn();
      vi.spyOn(
        RecaptchaEnterpriseVerifier.prototype,
        'verify'
      ).mockResolvedValue('recaptcha-response');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('EMAIL_PASSWORD_PROVIDER - should call actionMethod with request if recaptcha enterprise is enabled', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      vi.spyOn(mockAuthInstance, '_getRecaptchaConfig').mockReturnValue(
        recaptchaConfigEnforce
      );
      mockActionMethod = vi.fn().mockResolvedValue('testResponse');
      const response = await handleRecaptchaFlow(
        mockAuthInstance,
        mockRequest,
        RecaptchaActionName.SIGN_IN_WITH_PASSWORD,
        mockActionMethod,
        RecaptchaAuthProvider.EMAIL_PASSWORD_PROVIDER
      );
      expect(mockActionMethod).toHaveBeenCalledTimes(1);
      expect(response).toBe('testResponse');
    });

    // "Errors like "MISSING_RECAPTCHA_TOKEN" will be handled irrespective of the enablement status of EMAIL_PASSWORD_PROVIDER, but this test verifies the more likely scenario where EMAIL_PASSWORD_PROVIDER is disabled"
    it('EMAIL_PASSWORD_PROVIDER - should handle MISSING_RECAPTCHA_TOKEN error when recaptcha enterprise is disabled', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      vi.spyOn(mockAuthInstance, '_getRecaptchaConfig').mockReturnValue(
        recaptchaConfigOff
      );
      let callCount = 0;
      mockActionMethod = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(
            _createError(AuthErrorCode.MISSING_RECAPTCHA_TOKEN)
          );
        } else {
          return Promise.resolve('testResponse');
        }
      });
      const response = await handleRecaptchaFlow(
        mockAuthInstance,
        mockRequest,
        RecaptchaActionName.SIGN_IN_WITH_PASSWORD,
        mockActionMethod,
        RecaptchaAuthProvider.EMAIL_PASSWORD_PROVIDER
      );
      expect(mockActionMethod).toHaveBeenCalledTimes(2);
      expect(response).toBe('testResponse');
    });

    it('EMAIL_PASSWORD_PROVIDER - should handle non MISSING_RECAPTCHA_TOKEN error when recaptcha enterprise is disabled', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      vi.spyOn(mockAuthInstance, '_getRecaptchaConfig').mockReturnValue(
        recaptchaConfigOff
      );
      let callCount = 0;
      mockActionMethod = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(
            _createError(AuthErrorCode.RECAPTCHA_NOT_ENABLED)
          );
        } else {
          return Promise.resolve('testResponse');
        }
      });

      const response = handleRecaptchaFlow(
        mockAuthInstance,
        mockRequest,
        RecaptchaActionName.SIGN_IN_WITH_PASSWORD,
        mockActionMethod,
        RecaptchaAuthProvider.EMAIL_PASSWORD_PROVIDER
      );
      await expect(response).rejects.toThrow(
        AuthErrorCode.RECAPTCHA_NOT_ENABLED
      );
      expect(mockActionMethod).toHaveBeenCalledTimes(1);
    });

    it('PHONE_PROVIDER - should call actionMethod with request if recaptcha enterprise is enabled', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      vi.spyOn(mockAuthInstance, '_getRecaptchaConfig').mockReturnValue(
        recaptchaConfigEnforce
      );
      mockActionMethod = vi.fn().mockResolvedValue('testResponse');
      const response = await handleRecaptchaFlow(
        mockAuthInstance,
        mockRequest,
        RecaptchaActionName.SEND_VERIFICATION_CODE,
        mockActionMethod,
        RecaptchaAuthProvider.PHONE_PROVIDER
      );
      expect(mockActionMethod).toHaveBeenCalledTimes(1);
      expect(response).toBe('testResponse');
    });

    it('PHONE_PROVIDER - should handle MISSING_RECAPTCHA_TOKEN error when the enforcement state is audit', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      vi.spyOn(mockAuthInstance, '_getRecaptchaConfig').mockReturnValue(
        recaptchaConfigAudit
      );
      let callCount = 0;
      mockActionMethod = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(
            _createError(AuthErrorCode.MISSING_RECAPTCHA_TOKEN)
          );
        } else {
          return Promise.resolve('testResponse');
        }
      });
      const response = await handleRecaptchaFlow(
        mockAuthInstance,
        mockRequest,
        RecaptchaActionName.SEND_VERIFICATION_CODE,
        mockActionMethod,
        RecaptchaAuthProvider.PHONE_PROVIDER
      );
      expect(mockActionMethod).toHaveBeenCalledTimes(2);
      expect(response).toBe('testResponse');
    });

    it('PHONE_PROVIDER - should handle INVALID_APP_CREDENTIAL error when the enforcement state is audit', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      vi.spyOn(mockAuthInstance, '_getRecaptchaConfig').mockReturnValue(
        recaptchaConfigAudit
      );
      let callCount = 0;
      mockActionMethod = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(
            _createError(AuthErrorCode.INVALID_APP_CREDENTIAL)
          );
        } else {
          return Promise.resolve('testResponse');
        }
      });
      const response = await handleRecaptchaFlow(
        mockAuthInstance,
        mockRequest,
        RecaptchaActionName.SEND_VERIFICATION_CODE,
        mockActionMethod,
        RecaptchaAuthProvider.PHONE_PROVIDER
      );
      expect(mockActionMethod).toHaveBeenCalledTimes(2);
      expect(response).toBe('testResponse');
    });

    it('PHONE_PROVIDER - should handle non MISSING_RECAPTCHA_TOKEN and non INVALID_APP_CREDENTIAL error', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      vi.spyOn(mockAuthInstance, '_getRecaptchaConfig').mockReturnValue(
        recaptchaConfigAudit
      );
      let callCount = 0;
      mockActionMethod = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(
            _createError(AuthErrorCode.INVALID_RECAPTCHA_TOKEN)
          );
        } else {
          return Promise.resolve('testResponse');
        }
      });

      const response = handleRecaptchaFlow(
        mockAuthInstance,
        mockRequest,
        RecaptchaActionName.SEND_VERIFICATION_CODE,
        mockActionMethod,
        RecaptchaAuthProvider.PHONE_PROVIDER
      );
      await expect(response).rejects.toThrow(
        AuthErrorCode.INVALID_RECAPTCHA_TOKEN
      );
      expect(mockActionMethod).toHaveBeenCalledTimes(1);
    });
  });

  describe('#injectRecaptchaFields', () => {
    it('injects recaptcha enterprise fields into SignInWithPassword request', async () => {
      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        getRecaptchaConfigRequest,
        recaptchaConfigResponseEnforce
      );
      vi.spyOn(recaptcha.enterprise, 'execute').mockResolvedValue(
        'recaptcha-response'
      );

      const request = {
        returnSecureToken: true,
        email: 'email',
        password: 'password',
        clientType: RecaptchaClientType.WEB
      };
      const requestWithRecaptcha = await injectRecaptchaFields(
        auth,
        request,
        RecaptchaActionName.SIGN_IN_WITH_PASSWORD,
        false
      );
      const expectedRequest = {
        returnSecureToken: true,
        email: 'email',
        password: 'password',
        clientType: RecaptchaClientType.WEB,
        captchaResponse: 'recaptcha-response',
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      };

      expect(requestWithRecaptcha).toEqual(expectedRequest);
    });

    it('injects recaptcha enterprise fields when captchaResp is true', async () => {
      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        getRecaptchaConfigRequest,
        recaptchaConfigResponseEnforce
      );
      vi.spyOn(recaptcha.enterprise, 'execute').mockResolvedValue(
        'recaptcha-response'
      );

      const request = {
        requestType: 'requestType',
        email: 'email',
        clientType: RecaptchaClientType.WEB
      };
      const requestWithRecaptcha = await injectRecaptchaFields(
        auth,
        request,
        RecaptchaActionName.GET_OOB_CODE,
        true
      );
      const expectedRequest = {
        requestType: 'requestType',
        email: 'email',
        clientType: RecaptchaClientType.WEB,
        captchaResp: 'recaptcha-response',
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      };

      expect(requestWithRecaptcha).toEqual(expectedRequest);
    });

    it('injects recaptcha enterprise fields into StartPhoneMfaEnrollment request', async () => {
      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        getRecaptchaConfigRequest,
        recaptchaConfigResponseEnforce
      );
      vi.spyOn(recaptcha.enterprise, 'execute').mockResolvedValue(
        'recaptcha-response'
      );

      const request = {
        idToken: 'idToken',
        phoneEnrollmentInfo: {
          phoneNumber: '123456',
          recaptchaToken: 'recaptcha-token',
          clientType: RecaptchaClientType.WEB
        }
      };
      const requestWithRecaptcha = await injectRecaptchaFields(
        auth,
        request,
        RecaptchaActionName.MFA_SMS_ENROLLMENT,
        false
      );
      const expectedRequest = {
        idToken: 'idToken',
        phoneEnrollmentInfo: {
          phoneNumber: '123456',
          recaptchaToken: 'recaptcha-token',
          captchaResponse: 'recaptcha-response',
          clientType: RecaptchaClientType.WEB,
          recaptchaVersion: RecaptchaVersion.ENTERPRISE
        }
      };

      expect(requestWithRecaptcha).toEqual(expectedRequest);
    });

    it('injects recaptcha enterprise fields into StartPhoneMfaSignInRequest request', async () => {
      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        getRecaptchaConfigRequest,
        recaptchaConfigResponseEnforce
      );
      vi.spyOn(recaptcha.enterprise, 'execute').mockResolvedValue(
        'recaptcha-response'
      );

      const request = {
        mfaPendingCredential: 'mfaPendingCredential',
        mfaEnrollmentId: 'mfaEnrollmentId',
        phoneSignInInfo: {
          recaptchaToken: 'recaptcha-token',
          clientType: RecaptchaClientType.WEB
        }
      };
      const requestWithRecaptcha = await injectRecaptchaFields(
        auth,
        request,
        RecaptchaActionName.MFA_SMS_SIGNIN,
        false
      );
      const expectedRequest = {
        mfaPendingCredential: 'mfaPendingCredential',
        mfaEnrollmentId: 'mfaEnrollmentId',
        phoneSignInInfo: {
          recaptchaToken: 'recaptcha-token',
          captchaResponse: 'recaptcha-response',
          clientType: RecaptchaClientType.WEB,
          recaptchaVersion: RecaptchaVersion.ENTERPRISE
        }
      };

      expect(requestWithRecaptcha).toEqual(expectedRequest);
    });
  });
});
