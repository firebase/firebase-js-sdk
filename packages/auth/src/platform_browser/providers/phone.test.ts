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

import { FirebaseError } from '@firebase/util';

import {
  mockEndpoint,
  mockEndpointWithParams
} from '../../../test/helpers/api/helper';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as fetch from '../../../test/helpers/mock_fetch';
import {
  Endpoint,
  RecaptchaClientType,
  RecaptchaVersion,
  RecaptchaAuthProvider,
  EnforcementState
} from '../../api';
import { ServerError } from '../../api/errors';
import { RecaptchaVerifier } from '../../platform_browser/recaptcha/recaptcha_verifier';
import { PhoneAuthProvider } from './phone';
import {
  FAKE_TOKEN,
  _initializeRecaptchaConfig
} from '../recaptcha/recaptcha_enterprise_verifier';
import { MockGreCAPTCHATopLevel } from '../recaptcha/recaptcha_mock';
import { ApplicationVerifierInternal } from '../../model/application_verifier';

use(chaiAsPromised);

describe('platform_browser/providers/phone', () => {
  let auth: TestAuth;
  let v2Verifier: ApplicationVerifierInternal;

  const recaptchaConfigResponseEnforce = {
    recaptchaKey: 'foo/bar/to/site-key',
    recaptchaEnforcementState: [
      {
        provider: RecaptchaAuthProvider.PHONE_PROVIDER,
        enforcementState: EnforcementState.ENFORCE
      }
    ]
  };

  const recaptchaConfigResponseAudit = {
    recaptchaKey: 'foo/bar/to/site-key',
    recaptchaEnforcementState: [
      {
        provider: RecaptchaAuthProvider.PHONE_PROVIDER,
        enforcementState: EnforcementState.AUDIT
      }
    ]
  };

  const recaptchaConfigResponseOff = {
    // no recaptcha key if no rCE provider is enabled
    recaptchaEnforcementState: [
      {
        provider: RecaptchaAuthProvider.PHONE_PROVIDER,
        enforcementState: EnforcementState.OFF
      }
    ]
  };

  beforeEach(async () => {
    fetch.setUp();
    auth = await testAuth();
    auth.settings.appVerificationDisabledForTesting = false;
    v2Verifier = new RecaptchaVerifier(auth, document.createElement('div'), {});
    sinon
      .stub(v2Verifier, 'verify')
      .returns(Promise.resolve('verification-code'));
  });

  afterEach(() => {
    fetch.tearDown();
    sinon.restore();
  });

  context('#verifyPhoneNumber', () => {
    it('calls verify on the appVerifier and then calls the server when recaptcha enterprise is disabled', async () => {
      const recaptcha = new MockGreCAPTCHATopLevel();
      if (typeof window === 'undefined') {
        return;
      }
      window.grecaptcha = recaptcha;
      sinon
        .stub(recaptcha.enterprise, 'execute')
        .returns(Promise.resolve('enterprise-token'));

      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        {
          clientType: RecaptchaClientType.WEB,
          version: RecaptchaVersion.ENTERPRISE
        },
        recaptchaConfigResponseOff
      );

      const route = mockEndpoint(Endpoint.SEND_VERIFICATION_CODE, {
        sessionInfo: 'verification-id'
      });

      const provider = new PhoneAuthProvider(auth);
      const result = await provider.verifyPhoneNumber(
        '+15105550000',
        v2Verifier
      );
      expect(result).to.eq('verification-id');
      expect(route.calls[0].request).to.eql({
        phoneNumber: '+15105550000',
        recaptchaToken: 'verification-code',
        captchaResponse: FAKE_TOKEN,
        clientType: RecaptchaClientType.WEB,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      });
    });

    it('throws an error if verify without appVerifier when recaptcha enterprise is disabled', async () => {
      const recaptcha = new MockGreCAPTCHATopLevel();
      if (typeof window === 'undefined') {
        return;
      }
      window.grecaptcha = recaptcha;
      sinon
        .stub(recaptcha.enterprise, 'execute')
        .returns(Promise.resolve('enterprise-token'));

      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        {
          clientType: RecaptchaClientType.WEB,
          version: RecaptchaVersion.ENTERPRISE
        },
        recaptchaConfigResponseOff
      );

      const provider = new PhoneAuthProvider(auth);
      await expect(
        provider.verifyPhoneNumber('+15105550000')
      ).to.be.rejectedWith(FirebaseError, 'auth/argument-error');
    });

    it('calls the server without appVerifier when recaptcha enterprise is enforced', async () => {
      const recaptcha = new MockGreCAPTCHATopLevel();
      if (typeof window === 'undefined') {
        return;
      }
      window.grecaptcha = recaptcha;
      sinon
        .stub(recaptcha.enterprise, 'execute')
        .returns(Promise.resolve('enterprise-token'));

      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        {
          clientType: RecaptchaClientType.WEB,
          version: RecaptchaVersion.ENTERPRISE
        },
        recaptchaConfigResponseEnforce
      );
      await _initializeRecaptchaConfig(auth);

      const route = mockEndpoint(Endpoint.SEND_VERIFICATION_CODE, {
        sessionInfo: 'verification-id'
      });

      const provider = new PhoneAuthProvider(auth);
      const result = await provider.verifyPhoneNumber('+15105550000');
      expect(result).to.eq('verification-id');
      expect(route.calls[0].request).to.eql({
        phoneNumber: '+15105550000',
        captchaResponse: 'enterprise-token',
        clientType: RecaptchaClientType.WEB,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      });
    });

    it('calls the server when recaptcha enterprise is enforced', async () => {
      const recaptcha = new MockGreCAPTCHATopLevel();
      if (typeof window === 'undefined') {
        return;
      }
      window.grecaptcha = recaptcha;
      sinon
        .stub(recaptcha.enterprise, 'execute')
        .returns(Promise.resolve('enterprise-token'));

      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        {
          clientType: RecaptchaClientType.WEB,
          version: RecaptchaVersion.ENTERPRISE
        },
        recaptchaConfigResponseEnforce
      );
      await _initializeRecaptchaConfig(auth);

      const route = mockEndpoint(Endpoint.SEND_VERIFICATION_CODE, {
        sessionInfo: 'verification-id'
      });

      const provider = new PhoneAuthProvider(auth);
      const result = await provider.verifyPhoneNumber(
        '+15105550000',
        v2Verifier
      );
      expect(result).to.eq('verification-id');
      expect(route.calls[0].request).to.eql({
        phoneNumber: '+15105550000',
        captchaResponse: 'enterprise-token',
        clientType: RecaptchaClientType.WEB,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      });
    });

    /* Test cases when initializeRecaptchaConfig is not called before phone verification */
    it('throws invalid-recaptcha-token when recaptcha enterprise is enforced, but initializeRecaptchaConfig was not called', async () => {
      const recaptcha = new MockGreCAPTCHATopLevel();
      if (typeof window === 'undefined') {
        return;
      }
      window.grecaptcha = recaptcha;
      sinon
        .stub(recaptcha.enterprise, 'execute')
        .returns(Promise.resolve('enterprise-token'));

      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        {
          clientType: RecaptchaClientType.WEB,
          version: RecaptchaVersion.ENTERPRISE
        },
        recaptchaConfigResponseEnforce
      );
      // Not call initializeRecaptchaConfig

      const failureMock = mockEndpoint(
        Endpoint.SEND_VERIFICATION_CODE,
        {
          error: {
            code: 400,
            message: ServerError.INVALID_RECAPTCHA_TOKEN
          }
        },
        400
      );

      const provider = new PhoneAuthProvider(auth);
      await expect(
        provider.verifyPhoneNumber('+15105550000', v2Verifier)
      ).to.be.rejectedWith(FirebaseError, 'auth/invalid-recaptcha-token');
      expect(failureMock.calls[0].request).to.eql({
        phoneNumber: '+15105550000',
        captchaResponse: FAKE_TOKEN,
        clientType: RecaptchaClientType.WEB,
        recaptchaToken: 'verification-code',
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      });
    });

    it('throws argument-error when recaptcha enterprise is enforced, but initializeRecaptchaConfig was not called', async () => {
      const recaptcha = new MockGreCAPTCHATopLevel();
      if (typeof window === 'undefined') {
        return;
      }
      window.grecaptcha = recaptcha;
      sinon
        .stub(recaptcha.enterprise, 'execute')
        .returns(Promise.resolve('enterprise-token'));

      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        {
          clientType: RecaptchaClientType.WEB,
          version: RecaptchaVersion.ENTERPRISE
        },
        recaptchaConfigResponseEnforce
      );
      // Not call initializeRecaptchaConfig

      const provider = new PhoneAuthProvider(auth);
      await expect(
        provider.verifyPhoneNumber('+15105550000')
      ).to.be.rejectedWith(FirebaseError, 'auth/argument-error');
    });

    it('does recaptcha v2 verification when recaptcha enterprise is disabled, but initializeRecaptchaConfig was not called', async () => {
      const recaptcha = new MockGreCAPTCHATopLevel();
      if (typeof window === 'undefined') {
        return;
      }
      window.grecaptcha = recaptcha;
      sinon
        .stub(recaptcha.enterprise, 'execute')
        .returns(Promise.resolve('enterprise-token'));

      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        {
          clientType: RecaptchaClientType.WEB,
          version: RecaptchaVersion.ENTERPRISE
        },
        recaptchaConfigResponseOff
      );
      // Not call initializeRecaptchaConfig

      const route = mockEndpoint(Endpoint.SEND_VERIFICATION_CODE, {
        sessionInfo: 'verification-id'
      });

      const provider = new PhoneAuthProvider(auth);
      const result = await provider.verifyPhoneNumber(
        '+15105550000',
        v2Verifier
      );

      expect(result).to.eq('verification-id');
      expect(route.calls[0].request).to.eql({
        phoneNumber: '+15105550000',
        recaptchaToken: 'verification-code',
        captchaResponse: FAKE_TOKEN,
        clientType: RecaptchaClientType.WEB,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      });
    });

    it('does recaptcha v2 verification when recaptcha enterprise is audit, but initializeRecaptchaConfig was not called', async () => {
      const recaptcha = new MockGreCAPTCHATopLevel();
      if (typeof window === 'undefined') {
        return;
      }
      window.grecaptcha = recaptcha;
      sinon
        .stub(recaptcha.enterprise, 'execute')
        .returns(Promise.resolve('enterprise-token'));

      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        {
          clientType: RecaptchaClientType.WEB,
          version: RecaptchaVersion.ENTERPRISE
        },
        recaptchaConfigResponseAudit
      );
      // Not call initializeRecaptchaConfig

      const route = mockEndpoint(Endpoint.SEND_VERIFICATION_CODE, {
        sessionInfo: 'verification-id'
      });

      const provider = new PhoneAuthProvider(auth);
      const result = await provider.verifyPhoneNumber(
        '+15105550000',
        v2Verifier
      );

      expect(result).to.eq('verification-id');
      expect(route.calls[0].request).to.eql({
        phoneNumber: '+15105550000',
        recaptchaToken: 'verification-code',
        captchaResponse: FAKE_TOKEN,
        clientType: RecaptchaClientType.WEB,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      });
    });

    it('throws argument-error when recaptcha enterprise is audit, but initializeRecaptchaConfig was not called', async () => {
      const recaptcha = new MockGreCAPTCHATopLevel();
      if (typeof window === 'undefined') {
        return;
      }
      window.grecaptcha = recaptcha;
      sinon
        .stub(recaptcha.enterprise, 'execute')
        .returns(Promise.resolve('enterprise-token'));

      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        {
          clientType: RecaptchaClientType.WEB,
          version: RecaptchaVersion.ENTERPRISE
        },
        recaptchaConfigResponseAudit
      );
      // Not call initializeRecaptchaConfig

      const provider = new PhoneAuthProvider(auth);
      await expect(
        provider.verifyPhoneNumber('+15105550000')
      ).to.be.rejectedWith(FirebaseError, 'auth/argument-error');
    });
  });

  context('.credential', () => {
    it('creates a phone auth credential', () => {
      const credential = PhoneAuthProvider.credential('id', 'code');

      // Allows us to inspect the object
      const blob = credential.toJSON() as Record<string, string>;

      expect(blob.verificationId).to.eq('id');
      expect(blob.verificationCode).to.eq('code');
    });
  });
});
