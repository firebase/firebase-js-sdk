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

import { isV2, isEnterprise } from './recaptcha';

use(chaiAsPromised);
use(sinonChai);

describe('platform_browser/recaptcha/recaptcha', () => {
  let auth: TestAuth;
  let recaptchaV2: MockReCaptcha;
  let recaptchaV3: MockGreCAPTCHA;
  let recaptchaEnterprise: MockGreCAPTCHATopLevel;

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
});
