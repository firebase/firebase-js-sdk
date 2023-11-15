/**
 * @license
 * Copyright 2022 Google LLC
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
import sinonChai from 'sinon-chai';

import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';

import {
  MockReCaptcha,
  MockGreCAPTCHATopLevel,
  MockGreCAPTCHA
} from './recaptcha_mock';

import { isV2, isEnterprise, RecaptchaConfig } from './recaptcha';
import { GetRecaptchaConfigResponse } from '../../api/authentication/recaptcha';
import { EnforcementState, RecaptchaProvider } from '../../api/index';

use(chaiAsPromised);
use(sinonChai);

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
        provider: RecaptchaProvider.EMAIL_PASSWORD_PROVIDER,
        enforcementState: EnforcementState.ENFORCE
      },
      {
        provider: RecaptchaProvider.PHONE_PROVIDER,
        enforcementState: EnforcementState.AUDIT
      }
    ]
  };

  const GET_RECAPTCHA_CONFIG_RESPONSE_OFF: GetRecaptchaConfigResponse = {
    recaptchaKey: 'projects/testproj/keys/' + TEST_SITE_KEY,
    recaptchaEnforcementState: [
      {
        provider: RecaptchaProvider.EMAIL_PASSWORD_PROVIDER,
        enforcementState: EnforcementState.OFF
      },
      {
        provider: RecaptchaProvider.PHONE_PROVIDER,
        enforcementState: EnforcementState.OFF
      }
    ]
  };

  const GET_RECAPTCHA_CONFIG_RESPONSE_ENFORCE_AND_OFF: GetRecaptchaConfigResponse =
    {
      recaptchaKey: 'projects/testproj/keys/' + TEST_SITE_KEY,
      recaptchaEnforcementState: [
        {
          provider: RecaptchaProvider.EMAIL_PASSWORD_PROVIDER,
          enforcementState: EnforcementState.ENFORCE
        },
        {
          provider: RecaptchaProvider.PHONE_PROVIDER,
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

  context('#verify', () => {
    beforeEach(async () => {
      auth = await testAuth();
      recaptchaV2 = new MockReCaptcha(auth);
      recaptchaV3 = new MockGreCAPTCHA();
      recaptchaEnterprise = new MockGreCAPTCHATopLevel();
    });

    it('isV2', async () => {
      expect(isV2(undefined)).to.be.false;
      expect(isV2(recaptchaV2)).to.be.true;
      expect(isV2(recaptchaV3)).to.be.false;
      expect(isV2(recaptchaEnterprise)).to.be.false;
    });

    it('isEnterprise', async () => {
      expect(isEnterprise(undefined)).to.be.false;
      expect(isEnterprise(recaptchaV2)).to.be.false;
      expect(isEnterprise(recaptchaV3)).to.be.false;
      expect(isEnterprise(recaptchaEnterprise)).to.be.true;
    });
  });

  context('#RecaptchaConfig', () => {
    it('should construct the recaptcha config from the backend response', () => {
      expect(recaptchaConfig.siteKey).to.eq(TEST_SITE_KEY);
      expect(recaptchaConfig.recaptchaEnforcementState[0]).to.eql({
        provider: RecaptchaProvider.EMAIL_PASSWORD_PROVIDER,
        enforcementState: EnforcementState.ENFORCE
      });
      expect(recaptchaConfig.recaptchaEnforcementState[1]).to.eql({
        provider: RecaptchaProvider.PHONE_PROVIDER,
        enforcementState: EnforcementState.AUDIT
      });
      expect(recaptchaConfigEnforceAndOff.recaptchaEnforcementState[1]).to.eql({
        provider: RecaptchaProvider.PHONE_PROVIDER,
        enforcementState: EnforcementState.OFF
      });
    });

    it('#getProviderEnforcementState should return the correct enforcement state of the provider', () => {
      expect(
        recaptchaConfig.getProviderEnforcementState(
          RecaptchaProvider.EMAIL_PASSWORD_PROVIDER
        )
      ).to.eq(EnforcementState.ENFORCE);
      expect(
        recaptchaConfig.getProviderEnforcementState(
          RecaptchaProvider.PHONE_PROVIDER
        )
      ).to.eq(EnforcementState.AUDIT);
      expect(
        recaptchaConfigEnforceAndOff.getProviderEnforcementState(
          RecaptchaProvider.PHONE_PROVIDER
        )
      ).to.eq(EnforcementState.OFF);
      expect(recaptchaConfig.getProviderEnforcementState('invalid-provider')).to
        .be.null;
    });

    it('#isProviderEnabled should return the enablement state of the provider', () => {
      expect(
        recaptchaConfig.isProviderEnabled(
          RecaptchaProvider.EMAIL_PASSWORD_PROVIDER
        )
      ).to.be.true;
      expect(
        recaptchaConfig.isProviderEnabled(RecaptchaProvider.PHONE_PROVIDER)
      ).to.be.true;
      expect(
        recaptchaConfigEnforceAndOff.isProviderEnabled(
          RecaptchaProvider.PHONE_PROVIDER
        )
      ).to.be.false;
      expect(recaptchaConfig.isProviderEnabled('invalid-provider')).to.be.false;
    });

    it('#isAnyProviderEnabled should return true if at least one provider is enabled', () => {
      expect(recaptchaConfig.isAnyProviderEnabled()).to.be.true;
      expect(recaptchaConfigEnforceAndOff.isAnyProviderEnabled()).to.be.true;
      expect(recaptchaConfigOff.isAnyProviderEnabled()).to.be.false;
    });
  });
});
