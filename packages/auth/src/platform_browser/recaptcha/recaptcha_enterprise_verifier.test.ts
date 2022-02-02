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
 import * as sinon from 'sinon';
 import sinonChai from 'sinon-chai';
  
 import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
 import * as fetch from '../../../test/helpers/mock_fetch';
 import { _window } from '../auth_window';

 import { MockGreCAPTCHATopLevel } from './recaptcha_mock';
 import { RecaptchaEnterpriseVerifier } from './recaptcha_enterprise_verifier';
 
 use(chaiAsPromised);
 use(sinonChai);
 
 describe('platform_browser/recaptcha/recaptcha_enterprise_verifier', () => {
   let auth: TestAuth;
   let verifier: RecaptchaEnterpriseVerifier;
 
   beforeEach(async () => {
     fetch.setUp();
     auth = await testAuth();
     verifier = new RecaptchaEnterpriseVerifier(auth);
   });
 
   afterEach(() => {
     sinon.restore();
     fetch.tearDown();
   });
 
   context('#verify', () => {
     let recaptcha: MockGreCAPTCHATopLevel;
     beforeEach(() => {
        recaptcha = new MockGreCAPTCHATopLevel();
        _window().grecaptcha = recaptcha;
    });
 
     it('returns if response is available', async () => {
       sinon.stub(recaptcha.enterprise, 'execute').returns(Promise.resolve('recaptcha-response'));
       expect(await verifier.verify()).to.eq('recaptcha-response');
     });
   });
 });
 