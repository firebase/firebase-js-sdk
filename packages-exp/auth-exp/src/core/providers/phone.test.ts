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
import * as sinon from 'sinon';

import { mockEndpoint } from '../../../test/api/helper';
import { testAuth } from '../../../test/mock_auth';
import * as fetch from '../../../test/mock_fetch';
import { Endpoint } from '../../api';
import { Auth } from '../../model/auth';
import { RecaptchaVerifier } from '../../platform_browser/recaptcha/recaptcha_verifier';
import { PhoneAuthProvider } from './phone';

describe('core/providers/phone', () => {
  let auth: Auth;

  beforeEach(async () => {
    fetch.setUp();
    auth = await testAuth();
  });

  afterEach(() => {
    fetch.tearDown();
    sinon.restore();
  });

  context('#verifyPhoneNumber', () => {
    it('calls verify on the appVerifier and then calls the server', async () => {
      const route = mockEndpoint(Endpoint.SEND_VERIFICATION_CODE, {
        sessionInfo: 'verification-id',
      });

      auth.settings.appVerificationDisabledForTesting = true;
      const verifier = new RecaptchaVerifier(document.createElement('div'), {}, auth);
      sinon.stub(verifier, 'verify').returns(Promise.resolve('verification-code'));

      const provider = new PhoneAuthProvider(auth);
      const result = await provider.verifyPhoneNumber('+15105550000', verifier);
      expect(result).to.eq('verification-id');
      expect(route.calls[0].request).to.eql({
        phoneNumber: '+15105550000',
        recaptchaToken: 'verification-code',
      });
    });
  });

  context('.credential', () => {
    it('creates a phone auth credential', () => {
      const credential = PhoneAuthProvider.credential('id', 'code');

      // Allows us to inspect the object
      const blob = credential.toJSON() as {[key: string]: string};

      expect(blob.verificationId).to.eq('id');
      expect(blob.verificationCode).to.eq('code');
    });
  });
});