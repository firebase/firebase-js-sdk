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
import sinonChai from 'sinon-chai';

import { OperationType, ProviderId } from '../../model/enums';
import { FirebaseError } from '@firebase/util';

import {
  mockEndpoint,
  mockEndpointWithParams
} from '../../../test/helpers/api/helper';
import { makeJWT } from '../../../test/helpers/jwt';
import { testAuth, testUser, TestAuth } from '../../../test/helpers/mock_auth';
import * as fetch from '../../../test/helpers/mock_fetch';
import { ServerError } from '../../api/errors';
import {
  Endpoint,
  RecaptchaClientType,
  RecaptchaVersion,
  RecaptchaProvider,
  EnforcementState
} from '../../api';
import { MultiFactorInfoImpl } from '../../mfa/mfa_info';
import { MultiFactorSessionImpl } from '../../mfa/mfa_session';
import { multiFactor, MultiFactorUserImpl } from '../../mfa/mfa_user';
import { ApplicationVerifierInternal } from '../../model/application_verifier';
import { IdTokenResponse, IdTokenResponseKind } from '../../model/id_token';
import { UserInternal } from '../../model/user';
import { RecaptchaVerifier } from '../../platform_browser/recaptcha/recaptcha_verifier';
import { PhoneAuthCredential } from '../../core/credentials/phone';
import { FAKE_TOKEN } from '../recaptcha/recaptcha_enterprise_verifier';
import { MockGreCAPTCHATopLevel } from '../../platform_browser/recaptcha/recaptcha_mock';

import {
  _verifyPhoneNumber,
  linkWithPhoneNumber,
  reauthenticateWithPhoneNumber,
  signInWithPhoneNumber,
  updatePhoneNumber,
  injectRecaptchaV2Token
} from './phone';

use(chaiAsPromised);
use(sinonChai);

const RECAPTCHA_V2_TOKEN = 'v2-token';
const RECAPTCHA_ENTERPRISE_TOKEN = 'enterprise-token';

const recaptchaConfigResponseEnforce = {
  recaptchaKey: 'foo/bar/to/site-key',
  recaptchaEnforcementState: [
    {
      provider: RecaptchaProvider.PHONE_PROVIDER,
      enforcementState: EnforcementState.ENFORCE
    }
  ]
};
const recaptchaConfigResponseAudit = {
  recaptchaKey: 'foo/bar/to/site-key',
  recaptchaEnforcementState: [
    {
      provider: RecaptchaProvider.PHONE_PROVIDER,
      enforcementState: EnforcementState.AUDIT
    }
  ]
};
const recaptchaConfigResponseOff = {
  recaptchaKey: 'foo/bar/to/site-key',
  recaptchaEnforcementState: [
    {
      provider: RecaptchaProvider.PHONE_PROVIDER,
      enforcementState: EnforcementState.OFF
    }
  ]
};

function mockRecaptchaEnterpriseEnablement(
  enablementState: EnforcementState
): fetch.Route | undefined {
  if (typeof window === 'undefined') {
    return;
  }

  let recaptchaConfigResponse = {};
  if (enablementState === EnforcementState.ENFORCE) {
    recaptchaConfigResponse = recaptchaConfigResponseEnforce;
  } else if (enablementState === EnforcementState.AUDIT) {
    recaptchaConfigResponse = recaptchaConfigResponseAudit;
  } else {
    recaptchaConfigResponse = recaptchaConfigResponseOff;
  }

  const recaptcha = new MockGreCAPTCHATopLevel();
  window.grecaptcha = recaptcha;
  sinon
    .stub(recaptcha.enterprise, 'execute')
    .returns(Promise.resolve(RECAPTCHA_ENTERPRISE_TOKEN));

  return mockEndpointWithParams(
    Endpoint.GET_RECAPTCHA_CONFIG,
    {
      clientType: RecaptchaClientType.WEB,
      version: RecaptchaVersion.ENTERPRISE
    },
    recaptchaConfigResponse
  );
}

describe('platform_browser/strategies/phone', () => {
  let auth: TestAuth;
  let v2Verifier: ApplicationVerifierInternal;
  let sendCodeEndpoint: fetch.Route;

  beforeEach(async () => {
    auth = await testAuth();
    auth.settings.appVerificationDisabledForTesting = false;
    fetch.setUp();

    sendCodeEndpoint = mockEndpoint(Endpoint.SEND_VERIFICATION_CODE, {
      sessionInfo: 'session-info'
    });

    v2Verifier = new RecaptchaVerifier(auth, document.createElement('div'), {});
    sinon
      .stub(v2Verifier, 'verify')
      .returns(Promise.resolve(RECAPTCHA_V2_TOKEN));
    mockRecaptchaEnterpriseEnablement(EnforcementState.OFF);
  });

  afterEach(() => {
    fetch.tearDown();
    sinon.restore();
  });

  describe('signInWithPhoneNumber', () => {
    it('calls verify phone number when recaptcha enterprise is disabled', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      await signInWithPhoneNumber(auth, '+15105550000', v2Verifier);

      expect(sendCodeEndpoint.calls[0].request).to.eql({
        recaptchaToken: RECAPTCHA_V2_TOKEN,
        phoneNumber: '+15105550000',
        captchaResponse: FAKE_TOKEN,
        clientType: RecaptchaClientType.WEB,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      });
    });

    it('calls verify phone number when recaptcha enterprise is enabled', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      mockRecaptchaEnterpriseEnablement(EnforcementState.ENFORCE);
      await signInWithPhoneNumber(auth, '+15105550000');

      expect(sendCodeEndpoint.calls[0].request).to.eql({
        phoneNumber: '+15105550000',
        captchaResponse: RECAPTCHA_ENTERPRISE_TOKEN,
        clientType: RecaptchaClientType.WEB,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      });
    });

    context('ConfirmationResult', () => {
      it('result contains verification id baked in', async () => {
        if (typeof window === 'undefined') {
          return;
        }
        const result = await signInWithPhoneNumber(auth, 'number', v2Verifier);
        expect(result.verificationId).to.eq('session-info');
      });

      it('calling #confirm finishes the sign in flow', async () => {
        if (typeof window === 'undefined') {
          return;
        }
        const idTokenResponse: IdTokenResponse = {
          idToken: 'my-id-token',
          refreshToken: 'my-refresh-token',
          expiresIn: '1234',
          localId: 'uid',
          kind: IdTokenResponseKind.CreateAuthUri
        };

        // This endpoint is called from within the callback, in
        // signInWithCredential
        const signInEndpoint = mockEndpoint(
          Endpoint.SIGN_IN_WITH_PHONE_NUMBER,
          idTokenResponse
        );
        mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
          users: [{ localId: 'uid' }]
        });

        const result = await signInWithPhoneNumber(auth, 'number', v2Verifier);
        const userCred = await result.confirm('6789');
        expect(userCred.user.uid).to.eq('uid');
        expect(userCred.operationType).to.eq(OperationType.SIGN_IN);
        expect(signInEndpoint.calls[0].request).to.eql({
          sessionInfo: 'session-info',
          code: '6789'
        });
      });
    });
  });

  describe('linkWithPhoneNumber', () => {
    let getAccountInfoEndpoint: fetch.Route;
    let user: UserInternal;

    beforeEach(() => {
      getAccountInfoEndpoint = mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
        users: [{ uid: 'uid' }]
      });

      user = testUser(auth, 'uid', 'email', true);
    });

    it('rejects if a phone provider is already linked', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      getAccountInfoEndpoint.response = {
        users: [
          {
            uid: 'uid',
            providerUserInfo: [{ providerId: ProviderId.PHONE }]
          }
        ]
      };

      await expect(
        linkWithPhoneNumber(user, 'number', v2Verifier)
      ).to.be.rejectedWith(
        FirebaseError,
        'Firebase: User can only be linked to one identity for the given provider. (auth/provider-already-linked).'
      );
    });

    it('calls verify phone number when recaptcha enterprise is disabled', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      await linkWithPhoneNumber(user, '+15105550000', v2Verifier);

      expect(sendCodeEndpoint.calls[0].request).to.eql({
        recaptchaToken: RECAPTCHA_V2_TOKEN,
        phoneNumber: '+15105550000',
        captchaResponse: FAKE_TOKEN,
        clientType: RecaptchaClientType.WEB,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      });
    });

    it('calls verify phone number when recaptcha enterprise is enabled', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      mockRecaptchaEnterpriseEnablement(EnforcementState.ENFORCE);
      await linkWithPhoneNumber(user, '+15105550000', v2Verifier);

      expect(sendCodeEndpoint.calls[0].request).to.eql({
        phoneNumber: '+15105550000',
        captchaResponse: RECAPTCHA_ENTERPRISE_TOKEN,
        clientType: RecaptchaClientType.WEB,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      });
    });

    context('ConfirmationResult', () => {
      it('result contains verification id baked in', async () => {
        if (typeof window === 'undefined') {
          return;
        }
        const result = await linkWithPhoneNumber(user, 'number', v2Verifier);
        expect(result.verificationId).to.eq('session-info');
      });

      it('calling #confirm finishes the sign in flow', async () => {
        if (typeof window === 'undefined') {
          return;
        }
        const idTokenResponse: IdTokenResponse = {
          idToken: 'my-id-token',
          refreshToken: 'my-refresh-token',
          expiresIn: '1234',
          localId: 'uid',
          kind: IdTokenResponseKind.CreateAuthUri
        };

        // This endpoint is called from within the callback, in
        // signInWithCredential
        const signInEndpoint = mockEndpoint(
          Endpoint.SIGN_IN_WITH_PHONE_NUMBER,
          idTokenResponse
        );
        mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
          users: [{ localId: 'uid' }]
        });

        const initialIdToken = await user.getIdToken();

        const result = await linkWithPhoneNumber(user, 'number', v2Verifier);
        const userCred = await result.confirm('6789');
        expect(userCred.user.uid).to.eq('uid');
        expect(userCred.operationType).to.eq(OperationType.LINK);
        expect(signInEndpoint.calls[0].request).to.eql({
          sessionInfo: 'session-info',
          code: '6789',
          idToken: initialIdToken
        });
      });
    });
  });

  describe('reauthenticateWithPhoneNumber', () => {
    let user: UserInternal;

    beforeEach(() => {
      mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
        users: [{ uid: 'uid' }]
      });

      user = testUser(auth, 'uid', 'email', true);
    });

    it('calls verify phone number when recaptcha enterprise is disabled', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      await reauthenticateWithPhoneNumber(user, '+15105550000', v2Verifier);

      expect(sendCodeEndpoint.calls[0].request).to.eql({
        recaptchaToken: RECAPTCHA_V2_TOKEN,
        phoneNumber: '+15105550000',
        captchaResponse: FAKE_TOKEN,
        clientType: RecaptchaClientType.WEB,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      });
    });

    it('calls verify phone number when recaptcha enterprise is enabled', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      mockRecaptchaEnterpriseEnablement(EnforcementState.ENFORCE);
      await reauthenticateWithPhoneNumber(user, '+15105550000', v2Verifier);

      expect(sendCodeEndpoint.calls[0].request).to.eql({
        phoneNumber: '+15105550000',
        captchaResponse: RECAPTCHA_ENTERPRISE_TOKEN,
        clientType: RecaptchaClientType.WEB,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      });
    });

    context('ConfirmationResult', () => {
      it('result contains verification id baked in', async () => {
        if (typeof window === 'undefined') {
          return;
        }
        const result = await reauthenticateWithPhoneNumber(
          user,
          'number',
          v2Verifier
        );
        expect(result.verificationId).to.eq('session-info');
      });

      it('calling #confirm finishes the sign in flow', async () => {
        if (typeof window === 'undefined') {
          return;
        }
        const idTokenResponse: IdTokenResponse = {
          idToken: makeJWT({ 'sub': 'uid' }),
          refreshToken: 'my-refresh-token',
          expiresIn: '1234',
          localId: 'uid',
          kind: IdTokenResponseKind.CreateAuthUri
        };

        // This endpoint is called from within the callback, in
        // signInWithCredential
        const signInEndpoint = mockEndpoint(
          Endpoint.SIGN_IN_WITH_PHONE_NUMBER,
          idTokenResponse
        );
        mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
          users: [{ localId: 'uid' }]
        });

        const result = await reauthenticateWithPhoneNumber(
          user,
          'number',
          v2Verifier
        );
        const userCred = await result.confirm('6789');
        expect(userCred.user.uid).to.eq('uid');
        expect(userCred.operationType).to.eq(OperationType.REAUTHENTICATE);
        expect(signInEndpoint.calls[0].request).to.eql({
          sessionInfo: 'session-info',
          code: '6789',
          operation: 'REAUTH'
        });
      });

      it('rejects if the uid mismatches', async () => {
        if (typeof window === 'undefined') {
          return;
        }
        const idTokenResponse: IdTokenResponse = {
          idToken: makeJWT({ 'sub': 'different-uid' }),
          refreshToken: 'my-refresh-token',
          expiresIn: '1234',
          localId: 'uid',
          kind: IdTokenResponseKind.CreateAuthUri
        };
        // This endpoint is called from within the callback, in
        // signInWithCredential
        mockEndpoint(Endpoint.SIGN_IN_WITH_PHONE_NUMBER, idTokenResponse);

        const result = await reauthenticateWithPhoneNumber(
          user,
          'number',
          v2Verifier
        );
        await expect(result.confirm('code')).to.be.rejectedWith(
          FirebaseError,
          'Firebase: The supplied credentials do not correspond to the previously signed in user. (auth/user-mismatch)'
        );
      });
    });
  });

  describe('_verifyPhoneNumber', () => {
    it('works with a string phone number', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      const sessionInfo = await _verifyPhoneNumber(auth, 'number', v2Verifier);
      expect(sessionInfo).to.eq('session-info');
      expect(sendCodeEndpoint.calls[0].request).to.eql({
        recaptchaToken: RECAPTCHA_V2_TOKEN,
        phoneNumber: 'number',
        captchaResponse: FAKE_TOKEN,
        clientType: RecaptchaClientType.WEB,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      });
    });

    it('works with an options object', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      const sessionInfo = await _verifyPhoneNumber(
        auth,
        {
          phoneNumber: 'number'
        },
        v2Verifier
      );
      expect(sessionInfo).to.eq('session-info');
      expect(sendCodeEndpoint.calls[0].request).to.eql({
        recaptchaToken: RECAPTCHA_V2_TOKEN,
        phoneNumber: 'number',
        captchaResponse: FAKE_TOKEN,
        clientType: RecaptchaClientType.WEB,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      });
    });

    it('works when recaptcha enterprise is enabled', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      mockRecaptchaEnterpriseEnablement(EnforcementState.AUDIT);
      const sessionInfo = await _verifyPhoneNumber(auth, 'number', v2Verifier);
      expect(sessionInfo).to.eq('session-info');
      expect(sendCodeEndpoint.calls[0].request).to.eql({
        phoneNumber: 'number',
        captchaResponse: RECAPTCHA_ENTERPRISE_TOKEN,
        clientType: RecaptchaClientType.WEB,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      });
    });

    it('works without v2 verifier when recaptcha enterprise is enabled', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      mockRecaptchaEnterpriseEnablement(EnforcementState.ENFORCE);
      const sessionInfo = await _verifyPhoneNumber(auth, 'number');
      expect(sessionInfo).to.eq('session-info');
      expect(sendCodeEndpoint.calls[0].request).to.eql({
        phoneNumber: 'number',
        captchaResponse: RECAPTCHA_ENTERPRISE_TOKEN,
        clientType: RecaptchaClientType.WEB,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      });
    });

    it('calls fallback to recaptcha v2 flow when receiving MISSING_RECAPTCHA_TOKEN error in recaptcha enterprise audit mode', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      mockRecaptchaEnterpriseEnablement(EnforcementState.AUDIT);
      const failureMock = mockEndpoint(
        Endpoint.SEND_VERIFICATION_CODE,
        {
          error: {
            code: 400,
            message: ServerError.MISSING_RECAPTCHA_TOKEN
          }
        },
        400
      );
      await expect(
        _verifyPhoneNumber(auth, 'number', v2Verifier)
      ).to.be.rejectedWith(
        'Firebase: The reCAPTCHA token is missing when sending request to the backend. (auth/missing-recaptcha-token).'
      );
      expect(failureMock.calls.length).to.eq(2);
      // First call should have a recaptcha enterprise token
      expect(failureMock.calls[0].request).to.eql({
        phoneNumber: 'number',
        captchaResponse: RECAPTCHA_ENTERPRISE_TOKEN,
        clientType: RecaptchaClientType.WEB,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      });
      // Second call should have a recaptcha v2 token
      expect(failureMock.calls[1].request).to.eql({
        recaptchaToken: RECAPTCHA_V2_TOKEN,
        phoneNumber: 'number',
        captchaResponse: FAKE_TOKEN,
        clientType: RecaptchaClientType.WEB,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      });
    });

    it('calls fallback to recaptcha v2 flow when receiving INVALID_APP_CREDENTIAL error in recaptcha enterprise audit mode', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      mockRecaptchaEnterpriseEnablement(EnforcementState.AUDIT);
      const failureMock = mockEndpoint(
        Endpoint.SEND_VERIFICATION_CODE,
        {
          error: {
            code: 400,
            message: ServerError.INVALID_APP_CREDENTIAL
          }
        },
        400
      );
      await expect(
        _verifyPhoneNumber(auth, 'number', v2Verifier)
      ).to.be.rejectedWith(
        'Firebase: The phone verification request contains an invalid application verifier. The reCAPTCHA token response is either invalid or expired. (auth/invalid-app-credential).'
      );
      expect(failureMock.calls.length).to.eq(2);
      // First call should have a recaptcha enterprise token
      expect(failureMock.calls[0].request).to.eql({
        phoneNumber: 'number',
        captchaResponse: RECAPTCHA_ENTERPRISE_TOKEN,
        clientType: RecaptchaClientType.WEB,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      });
      // Second call should have a recaptcha v2 token
      expect(failureMock.calls[1].request).to.eql({
        recaptchaToken: RECAPTCHA_V2_TOKEN,
        phoneNumber: 'number',
        captchaResponse: FAKE_TOKEN,
        clientType: RecaptchaClientType.WEB,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      });
    });

    it('does not call fallback to recaptcha v2 flow when receiving other errors in recaptcha enterprise audit mode', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      mockRecaptchaEnterpriseEnablement(EnforcementState.AUDIT);
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
      await expect(
        _verifyPhoneNumber(auth, 'number', v2Verifier)
      ).to.be.rejectedWith(
        'Firebase: The reCAPTCHA token is invalid when sending request to the backend. (auth/invalid-recaptcha-token).'
      );
      // First call should have a recaptcha enterprise token
      expect(failureMock.calls[0].request).to.eql({
        phoneNumber: 'number',
        captchaResponse: RECAPTCHA_ENTERPRISE_TOKEN,
        clientType: RecaptchaClientType.WEB,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      });
      // No fallback to recaptcha v2 flow
      expect(failureMock.calls.length).to.eq(1);
    });

    context('MFA', () => {
      let user: UserInternal;
      let mfaUser: MultiFactorUserImpl;

      beforeEach(() => {
        mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
          users: [{ uid: 'uid' }]
        });

        user = testUser(auth, 'uid', 'email', true);
        mfaUser = multiFactor(user) as MultiFactorUserImpl;
      });

      it('works with an enrollment flow when recaptcha enterprise is disabled', async () => {
        if (typeof window === 'undefined') {
          return;
        }
        const endpoint = mockEndpoint(Endpoint.START_MFA_ENROLLMENT, {
          phoneSessionInfo: {
            sessionInfo: 'session-info'
          }
        });
        const session = (await mfaUser.getSession()) as MultiFactorSessionImpl;
        const sessionInfo = await _verifyPhoneNumber(
          auth,
          { phoneNumber: 'number', session },
          v2Verifier
        );
        expect(sessionInfo).to.eq('session-info');
        expect(endpoint.calls[0].request).to.eql({
          idToken: session.credential,
          phoneEnrollmentInfo: {
            phoneNumber: 'number',
            recaptchaToken: RECAPTCHA_V2_TOKEN,
            captchaResponse: FAKE_TOKEN,
            clientType: RecaptchaClientType.WEB,
            recaptchaVersion: RecaptchaVersion.ENTERPRISE
          }
        });
      });

      it('works with an enrollment flow when recaptcha enterprise is enabled', async () => {
        if (typeof window === 'undefined') {
          return;
        }
        mockRecaptchaEnterpriseEnablement(EnforcementState.ENFORCE);
        const endpoint = mockEndpoint(Endpoint.START_MFA_ENROLLMENT, {
          phoneSessionInfo: {
            sessionInfo: 'session-info'
          }
        });
        const session = (await mfaUser.getSession()) as MultiFactorSessionImpl;
        const sessionInfo = await _verifyPhoneNumber(
          auth,
          { phoneNumber: 'number', session },
          v2Verifier
        );
        expect(sessionInfo).to.eq('session-info');
        expect(endpoint.calls[0].request).to.eql({
          idToken: session.credential,
          phoneEnrollmentInfo: {
            phoneNumber: 'number',
            captchaResponse: RECAPTCHA_ENTERPRISE_TOKEN,
            clientType: RecaptchaClientType.WEB,
            recaptchaVersion: RecaptchaVersion.ENTERPRISE
          }
        });
      });

      it('works when completing the sign in flow and recaptcha enterprise is disabled', async () => {
        if (typeof window === 'undefined') {
          return;
        }
        const endpoint = mockEndpoint(Endpoint.START_MFA_SIGN_IN, {
          phoneResponseInfo: {
            sessionInfo: 'session-info'
          }
        });
        const session = MultiFactorSessionImpl._fromMfaPendingCredential(
          'mfa-pending-credential'
        );
        const mfaInfo = MultiFactorInfoImpl._fromServerResponse(auth, {
          mfaEnrollmentId: 'mfa-enrollment-id',
          enrolledAt: Date.now(),
          phoneInfo: 'phone-number-from-enrollment'
        });
        const sessionInfo = await _verifyPhoneNumber(
          auth,
          {
            session,
            multiFactorHint: mfaInfo
          },
          v2Verifier
        );
        expect(sessionInfo).to.eq('session-info');
        expect(endpoint.calls[0].request).to.eql({
          mfaPendingCredential: 'mfa-pending-credential',
          mfaEnrollmentId: 'mfa-enrollment-id',
          phoneSignInInfo: {
            recaptchaToken: RECAPTCHA_V2_TOKEN,
            captchaResponse: FAKE_TOKEN,
            clientType: RecaptchaClientType.WEB,
            recaptchaVersion: RecaptchaVersion.ENTERPRISE
          }
        });
      });

      it('works when completing the sign in flow and recaptcha enterprise is enabled', async () => {
        if (typeof window === 'undefined') {
          return;
        }
        mockRecaptchaEnterpriseEnablement(EnforcementState.ENFORCE);
        const endpoint = mockEndpoint(Endpoint.START_MFA_SIGN_IN, {
          phoneResponseInfo: {
            sessionInfo: 'session-info'
          }
        });
        const session = MultiFactorSessionImpl._fromMfaPendingCredential(
          'mfa-pending-credential'
        );
        const mfaInfo = MultiFactorInfoImpl._fromServerResponse(auth, {
          mfaEnrollmentId: 'mfa-enrollment-id',
          enrolledAt: Date.now(),
          phoneInfo: 'phone-number-from-enrollment'
        });
        const sessionInfo = await _verifyPhoneNumber(
          auth,
          {
            session,
            multiFactorHint: mfaInfo
          },
          v2Verifier
        );
        expect(sessionInfo).to.eq('session-info');
        expect(endpoint.calls[0].request).to.eql({
          mfaPendingCredential: 'mfa-pending-credential',
          mfaEnrollmentId: 'mfa-enrollment-id',
          phoneSignInInfo: {
            captchaResponse: RECAPTCHA_ENTERPRISE_TOKEN,
            clientType: RecaptchaClientType.WEB,
            recaptchaVersion: RecaptchaVersion.ENTERPRISE
          }
        });
      });
    });

    it('throws if the v2Verifier does not return a string', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      (v2Verifier.verify as sinon.SinonStub).returns(Promise.resolve(123));
      await expect(
        _verifyPhoneNumber(auth, 'number', v2Verifier)
      ).to.be.rejectedWith(FirebaseError, 'auth/argument-error');
    });

    it('throws if the v2Verifier type is not recaptcha', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      const mutVerifier: {
        -readonly [K in keyof ApplicationVerifierInternal]: ApplicationVerifierInternal[K];
      } = v2Verifier;
      mutVerifier.type = 'not-recaptcha-thats-for-sure';
      await expect(
        _verifyPhoneNumber(auth, 'number', mutVerifier)
      ).to.be.rejectedWith(FirebaseError, 'auth/argument-error');
    });

    it('resets the verifer after successful verification', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      sinon.spy(v2Verifier, '_reset');
      expect(await _verifyPhoneNumber(auth, 'number', v2Verifier)).to.eq(
        'session-info'
      );
      expect(v2Verifier._reset).to.have.been.called;
    });

    it('resets the verifer after a failed verification', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      sinon.spy(v2Verifier, '_reset');
      (v2Verifier.verify as sinon.SinonStub).returns(Promise.resolve(123));

      await expect(_verifyPhoneNumber(auth, 'number', v2Verifier)).to.be
        .rejected;
      expect(v2Verifier._reset).to.have.been.called;
    });
  });

  describe('updatePhoneNumber', () => {
    let user: UserInternal;
    let reloadMock: fetch.Route;
    let signInMock: fetch.Route;
    let credential: PhoneAuthCredential;
    let idToken: string;

    beforeEach(() => {
      idToken = makeJWT({ exp: '200', iat: '100' });
      reloadMock = mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
        users: [{ uid: 'uid' }]
      });
      signInMock = mockEndpoint(Endpoint.SIGN_IN_WITH_PHONE_NUMBER, {
        idToken,
        refreshToken: 'refresh-token'
      });
      credential = PhoneAuthCredential._fromVerification(
        'session-info',
        'code'
      );

      user = testUser(auth, 'uid', 'email', true);
    });

    it('should link the phone number to the user', async () => {
      await updatePhoneNumber(user, credential);
      expect(signInMock.calls[0].request).to.eql({
        idToken: 'access-token',
        sessionInfo: 'session-info',
        code: 'code'
      });
    });

    it('should update the access token', async () => {
      await updatePhoneNumber(user, credential);
      const idToken = await user.getIdToken();
      expect(idToken).to.eq(idToken);
    });

    it('should reload the user', async () => {
      await updatePhoneNumber(user, credential);
      expect(reloadMock.calls.length).to.eq(1);
    });
  });

  describe('#injectRecaptchaV2Token', () => {
    it('injects recaptcha v2 token into SendPhoneVerificationCode request', async () => {
      const request = {
        phoneNumber: '123456',
        clientType: RecaptchaClientType.WEB,
        captchaResponse: RECAPTCHA_ENTERPRISE_TOKEN,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      };

      const requestWithV2Token = await injectRecaptchaV2Token(
        auth,
        request,
        v2Verifier
      );

      const expectedRequest = {
        phoneNumber: '123456',
        recaptchaToken: RECAPTCHA_V2_TOKEN,
        clientType: RecaptchaClientType.WEB,
        captchaResponse: RECAPTCHA_ENTERPRISE_TOKEN,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      };
      expect(requestWithV2Token).to.eql(expectedRequest);
    });

    it('injects recaptcha v2 token into StartPhoneMfaEnrollment request', async () => {
      const request = {
        idToken: 'idToken',
        phoneEnrollmentInfo: {
          phoneNumber: '123456',
          captchaResponse: RECAPTCHA_ENTERPRISE_TOKEN,
          clientType: RecaptchaClientType.WEB,
          recaptchaVersion: RecaptchaVersion.ENTERPRISE
        }
      };

      const requestWithRecaptcha = await injectRecaptchaV2Token(
        auth,
        request,
        v2Verifier
      );

      const expectedRequest = {
        idToken: 'idToken',
        phoneEnrollmentInfo: {
          phoneNumber: '123456',
          recaptchaToken: RECAPTCHA_V2_TOKEN,
          captchaResponse: RECAPTCHA_ENTERPRISE_TOKEN,
          clientType: RecaptchaClientType.WEB,
          recaptchaVersion: RecaptchaVersion.ENTERPRISE
        }
      };
      expect(requestWithRecaptcha).to.eql(expectedRequest);
    });

    it('injects recaptcha enterprise fields into StartPhoneMfaSignInRequest request', async () => {
      const request = {
        mfaPendingCredential: 'mfaPendingCredential',
        mfaEnrollmentId: 'mfaEnrollmentId',
        phoneSignInInfo: {
          captchaResponse: RECAPTCHA_ENTERPRISE_TOKEN,
          clientType: RecaptchaClientType.WEB,
          recaptchaVersion: RecaptchaVersion.ENTERPRISE
        }
      };

      const requestWithRecaptcha = await injectRecaptchaV2Token(
        auth,
        request,
        v2Verifier
      );

      const expectedRequest = {
        mfaPendingCredential: 'mfaPendingCredential',
        mfaEnrollmentId: 'mfaEnrollmentId',
        phoneSignInInfo: {
          recaptchaToken: RECAPTCHA_V2_TOKEN,
          captchaResponse: RECAPTCHA_ENTERPRISE_TOKEN,
          clientType: RecaptchaClientType.WEB,
          recaptchaVersion: RecaptchaVersion.ENTERPRISE
        }
      };
      expect(requestWithRecaptcha).to.eql(expectedRequest);
    });
  });
});
