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

import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';

import {
  MockReCaptcha,
  MockGreCAPTCHATopLevel,
  MockGreCAPTCHA
} from './recaptcha_mock';

import { isV2, isEnterprise, RecaptchaConfig } from './recaptcha';
import { GetRecaptchaConfigResponse } from '../../api/authentication/recaptcha';
import { EnforcementState, RecaptchaAuthProvider } from '../../api/index';
describe('platform_browser/recaptcha/recaptcha', () => {
  let auth: TestAuth;
  let recaptchaV2: MockReCaptcha;
  let recaptchaV3: MockGreCAPTCHA;
  let recaptchaEnterprise: MockGreCAPTCHATopLevel;

  const TEST_SITE_KEY = 'test-site-key';

  const GET_RECAPTCHA_CONFIG_RESPONSE: GetRecaptchaConfigResponse = {
    recaptchaKey: 'projects/testproj/keys/' + TEST_SITE_KEY,
    recaptchaEnforcementState: [
      {
        provider: RecaptchaAuthProvider.EMAIL_PASSWORD_PROVIDER,
        enforcementState: EnforcementState.ENFORCE
      },
      {
        provider: RecaptchaAuthProvider.PHONE_PROVIDER,
        enforcementState: EnforcementState.AUDIT
      }
    ]
  };

  const GET_RECAPTCHA_CONFIG_RESPONSE_OFF: GetRecaptchaConfigResponse = {
    recaptchaKey: 'projects/testproj/keys/' + TEST_SITE_KEY,
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

  const GET_RECAPTCHA_CONFIG_RESPONSE_ENFORCE_AND_OFF: GetRecaptchaConfigResponse =
    {
      recaptchaKey: 'projects/testproj/keys/' + TEST_SITE_KEY,
      recaptchaEnforcementState: [
        {
          provider: RecaptchaAuthProvider.EMAIL_PASSWORD_PROVIDER,
          enforcementState: EnforcementState.ENFORCE
        },
        {
          provider: RecaptchaAuthProvider.PHONE_PROVIDER,
          enforcementState: EnforcementState.OFF
        }
      ]
    };

  const recaptchaConfig = new RecaptchaConfig(GET_RECAPTCHA_CONFIG_RESPONSE);
  const recaptchaConfigOff = new RecaptchaConfig(
    GET_RECAPTCHA_CONFIG_RESPONSE_OFF
  );
  const recaptchaConfigEnforceAndOff = new RecaptchaConfig(
    GET_RECAPTCHA_CONFIG_RESPONSE_ENFORCE_AND_OFF
  );

  describe('#verify', () => {
    beforeEach(async () => {
      auth = await testAuth();
      recaptchaV2 = new MockReCaptcha(auth);
      recaptchaV3 = new MockGreCAPTCHA();
      recaptchaEnterprise = new MockGreCAPTCHATopLevel();
    });

    it('isV2', async () => {
      expect(isV2(undefined)).toBe(false);
      expect(isV2(recaptchaV2)).toBe(true);
      expect(isV2(recaptchaV3)).toBe(false);
      expect(isV2(recaptchaEnterprise)).toBe(false);
    });

    it('isEnterprise', async () => {
      expect(isEnterprise(undefined)).toBe(false);
      expect(isEnterprise(recaptchaV2)).toBe(false);
      expect(isEnterprise(recaptchaV3)).toBe(false);
      expect(isEnterprise(recaptchaEnterprise)).toBe(true);
    });
  });

  describe('#RecaptchaConfig', () => {
    it('should construct the recaptcha config from the backend response', () => {
      expect(recaptchaConfig.siteKey).toBe(TEST_SITE_KEY);
      expect(recaptchaConfig.recaptchaEnforcementState[0]).toEqual({
        provider: RecaptchaAuthProvider.EMAIL_PASSWORD_PROVIDER,
        enforcementState: EnforcementState.ENFORCE
      });
      expect(recaptchaConfig.recaptchaEnforcementState[1]).toEqual({
        provider: RecaptchaAuthProvider.PHONE_PROVIDER,
        enforcementState: EnforcementState.AUDIT
      });
      expect(recaptchaConfigEnforceAndOff.recaptchaEnforcementState[1]).toEqual(
        {
          provider: RecaptchaAuthProvider.PHONE_PROVIDER,
          enforcementState: EnforcementState.OFF
        }
      );
    });

    it('#getProviderEnforcementState should return the correct enforcement state of the provider', () => {
      expect(
        recaptchaConfig.getProviderEnforcementState(
          RecaptchaAuthProvider.EMAIL_PASSWORD_PROVIDER
        )
      ).toBe(EnforcementState.ENFORCE);
      expect(
        recaptchaConfig.getProviderEnforcementState(
          RecaptchaAuthProvider.PHONE_PROVIDER
        )
      ).toBe(EnforcementState.AUDIT);
      expect(
        recaptchaConfigEnforceAndOff.getProviderEnforcementState(
          RecaptchaAuthProvider.PHONE_PROVIDER
        )
      ).toBe(EnforcementState.OFF);
      expect(
        recaptchaConfig.getProviderEnforcementState('invalid-provider')
      ).toBeNull();
    });

    it('#isProviderEnabled should return the enablement state of the provider', () => {
      expect(
        recaptchaConfig.isProviderEnabled(
          RecaptchaAuthProvider.EMAIL_PASSWORD_PROVIDER
        )
      ).toBe(true);
      expect(
        recaptchaConfig.isProviderEnabled(RecaptchaAuthProvider.PHONE_PROVIDER)
      ).toBe(true);
      expect(
        recaptchaConfigEnforceAndOff.isProviderEnabled(
          RecaptchaAuthProvider.PHONE_PROVIDER
        )
      ).toBe(false);
      expect(recaptchaConfig.isProviderEnabled('invalid-provider')).toBe(false);
    });

    it('#isAnyProviderEnabled should return true if at least one provider is enabled', () => {
      expect(recaptchaConfig.isAnyProviderEnabled()).toBe(true);
      expect(recaptchaConfigEnforceAndOff.isAnyProviderEnabled()).toBe(true);
      expect(recaptchaConfigOff.isAnyProviderEnabled()).toBe(false);
    });
  });
});
