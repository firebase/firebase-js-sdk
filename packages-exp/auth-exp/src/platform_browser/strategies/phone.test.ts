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
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import { OperationType, ProviderId } from '@firebase/auth-types-exp';
import { FirebaseError } from '@firebase/util';

import { mockEndpoint } from '../../../test/helpers/api/helper';
import { makeJWT } from '../../../test/helpers/jwt';
import { testAuth, testUser, TestAuth } from '../../../test/helpers/mock_auth';
import * as fetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { MultiFactorInfo } from '../../mfa/mfa_info';
import { MultiFactorSession } from '../../mfa/mfa_session';
import { multiFactor, MultiFactorUser } from '../../mfa/mfa_user';
import { ApplicationVerifier } from '../../model/application_verifier';
import { IdTokenResponse, IdTokenResponseKind } from '../../model/id_token';
import { User } from '../../model/user';
import { RecaptchaVerifier } from '../../platform_browser/recaptcha/recaptcha_verifier';
import { PhoneAuthCredential } from '../../core/credentials/phone';
import {
  _verifyPhoneNumber,
  linkWithPhoneNumber,
  reauthenticateWithPhoneNumber,
  signInWithPhoneNumber,
  updatePhoneNumber
} from './phone';

use(chaiAsPromised);
use(sinonChai);

describe('core/strategies/phone', () => {
  let auth: TestAuth;
  let verifier: ApplicationVerifier;
  let sendCodeEndpoint: fetch.Route;

  beforeEach(async () => {
    auth = await testAuth();
    fetch.setUp();

    sendCodeEndpoint = mockEndpoint(Endpoint.SEND_VERIFICATION_CODE, {
      sessionInfo: 'session-info'
    });

    verifier = new RecaptchaVerifier(document.createElement('div'), {}, auth);
    sinon.stub(verifier, 'verify').returns(Promise.resolve('recaptcha-token'));
  });

  afterEach(() => {
    fetch.tearDown();
    sinon.restore();
  });

  describe('signInWithPhoneNumber', () => {
    it('calls verify phone number', async () => {
      await signInWithPhoneNumber(auth, '+15105550000', verifier);

      expect(sendCodeEndpoint.calls[0].request).to.eql({
        recaptchaToken: 'recaptcha-token',
        phoneNumber: '+15105550000'
      });
    });

    context('ConfirmationResult', () => {
      it('result contains verification id baked in', async () => {
        const result = await signInWithPhoneNumber(auth, 'number', verifier);
        expect(result.verificationId).to.eq('session-info');
      });

      it('calling #confirm finishes the sign in flow', async () => {
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

        const result = await signInWithPhoneNumber(auth, 'number', verifier);
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
    let user: User;

    beforeEach(() => {
      getAccountInfoEndpoint = mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
        users: [{ uid: 'uid' }]
      });

      user = testUser(auth, 'uid', 'email', true);
    });

    it('rejects if a phone provider is already linked', async () => {
      getAccountInfoEndpoint.response = {
        users: [
          {
            uid: 'uid',
            providerUserInfo: [{ providerId: ProviderId.PHONE }]
          }
        ]
      };

      await expect(
        linkWithPhoneNumber(user, 'number', verifier)
      ).to.be.rejectedWith(
        FirebaseError,
        'Firebase: User can only be linked to one identity for the given provider. (auth/provider-already-linked).'
      );
    });

    it('calls verify phone number', async () => {
      await linkWithPhoneNumber(user, '+15105550000', verifier);

      expect(sendCodeEndpoint.calls[0].request).to.eql({
        recaptchaToken: 'recaptcha-token',
        phoneNumber: '+15105550000'
      });
    });

    context('ConfirmationResult', () => {
      it('result contains verification id baked in', async () => {
        const result = await linkWithPhoneNumber(user, 'number', verifier);
        expect(result.verificationId).to.eq('session-info');
      });

      it('calling #confirm finishes the sign in flow', async () => {
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

        const result = await linkWithPhoneNumber(user, 'number', verifier);
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
    let user: User;

    beforeEach(() => {
      mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
        users: [{ uid: 'uid' }]
      });

      user = testUser(auth, 'uid', 'email', true);
    });

    it('calls verify phone number', async () => {
      await reauthenticateWithPhoneNumber(user, '+15105550000', verifier);

      expect(sendCodeEndpoint.calls[0].request).to.eql({
        recaptchaToken: 'recaptcha-token',
        phoneNumber: '+15105550000'
      });
    });

    context('ConfirmationResult', () => {
      it('result contains verification id baked in', async () => {
        const result = await reauthenticateWithPhoneNumber(
          user,
          'number',
          verifier
        );
        expect(result.verificationId).to.eq('session-info');
      });

      it('calling #confirm finishes the sign in flow', async () => {
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
          verifier
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
          verifier
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
      const sessionInfo = await _verifyPhoneNumber(auth, 'number', verifier);
      expect(sessionInfo).to.eq('session-info');
      expect(sendCodeEndpoint.calls[0].request).to.eql({
        recaptchaToken: 'recaptcha-token',
        phoneNumber: 'number'
      });
    });

    it('works with an options object', async () => {
      const sessionInfo = await _verifyPhoneNumber(
        auth,
        {
          phoneNumber: 'number'
        },
        verifier
      );
      expect(sessionInfo).to.eq('session-info');
      expect(sendCodeEndpoint.calls[0].request).to.eql({
        recaptchaToken: 'recaptcha-token',
        phoneNumber: 'number'
      });
    });

    context('MFA', () => {
      let user: User;
      let mfaUser: MultiFactorUser;

      beforeEach(() => {
        mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
          users: [{ uid: 'uid' }]
        });

        user = testUser(auth, 'uid', 'email', true);
        mfaUser = multiFactor(user) as MultiFactorUser;
      });

      it('works with an enrollment flow', async () => {
        const endpoint = mockEndpoint(Endpoint.START_PHONE_MFA_ENROLLMENT, {
          phoneSessionInfo: {
            sessionInfo: 'session-info'
          }
        });
        const session = (await mfaUser.getSession()) as MultiFactorSession;
        const sessionInfo = await _verifyPhoneNumber(
          auth,
          { phoneNumber: 'number', session },
          verifier
        );
        expect(sessionInfo).to.eq('session-info');
        expect(endpoint.calls[0].request).to.eql({
          tenantId: auth.tenantId,
          idToken: session.credential,
          phoneEnrollmentInfo: {
            phoneNumber: 'number',
            recaptchaToken: 'recaptcha-token'
          }
        });
      });

      it('works when completing the sign in flow', async () => {
        const endpoint = mockEndpoint(Endpoint.START_PHONE_MFA_SIGN_IN, {
          phoneResponseInfo: {
            sessionInfo: 'session-info'
          }
        });
        const session = MultiFactorSession._fromMfaPendingCredential(
          'mfa-pending-credential'
        );
        const mfaInfo = MultiFactorInfo._fromServerResponse(auth, {
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
          verifier
        );
        expect(sessionInfo).to.eq('session-info');
        expect(endpoint.calls[0].request).to.eql({
          tenantId: auth.tenantId,
          mfaPendingCredential: 'mfa-pending-credential',
          mfaEnrollmentId: 'mfa-enrollment-id',
          phoneSignInInfo: {
            recaptchaToken: 'recaptcha-token'
          }
        });
      });
    });

    it('throws if the verifier does not return a string', async () => {
      (verifier.verify as sinon.SinonStub).returns(Promise.resolve(123));
      await expect(
        _verifyPhoneNumber(auth, 'number', verifier)
      ).to.be.rejectedWith(FirebaseError, 'auth/argument-error');
    });

    it('throws if the verifier type is not recaptcha', async () => {
      const mutVerifier: {
        -readonly [K in keyof ApplicationVerifier]: ApplicationVerifier[K];
      } = verifier;
      mutVerifier.type = 'not-recaptcha-thats-for-sure';
      await expect(
        _verifyPhoneNumber(auth, 'number', mutVerifier)
      ).to.be.rejectedWith(FirebaseError, 'auth/argument-error');
    });

    it('resets the verifer after successful verification', async () => {
      sinon.spy(verifier, '_reset');
      expect(await _verifyPhoneNumber(auth, 'number', verifier)).to.eq(
        'session-info'
      );
      expect(verifier._reset).to.have.been.called;
    });

    it('resets the verifer after a failed verification', async () => {
      sinon.spy(verifier, '_reset');
      (verifier.verify as sinon.SinonStub).returns(Promise.resolve(123));

      await expect(_verifyPhoneNumber(auth, 'number', verifier)).to.be.rejected;
      expect(verifier._reset).to.have.been.called;
    });
  });

  describe('updatePhoneNumber', () => {
    let user: User;
    let reloadMock: fetch.Route;
    let signInMock: fetch.Route;
    let credential: PhoneAuthCredential;

    beforeEach(() => {
      reloadMock = mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
        users: [{ uid: 'uid' }]
      });
      signInMock = mockEndpoint(Endpoint.SIGN_IN_WITH_PHONE_NUMBER, {
        idToken: 'new-access-token'
      });
      credential = PhoneAuthCredential._fromVerification(
        'session-info',
        'code'
      );

      user = testUser(auth, 'uid', 'email', true);
    });

    it('should link the phone number to the user', async () => {
      await updatePhoneNumber(user, credential);
      console.log(JSON.stringify(signInMock.calls[0].request));
      expect(signInMock.calls[0].request).to.eql({
        idToken: 'access-token',
        sessionInfo: 'session-info',
        code: 'code'
      });
    });

    it('should update the access token', async () => {
      await updatePhoneNumber(user, credential);
      const idToken = await user.getIdToken();
      expect(idToken).to.eq('new-access-token');
    });

    it('should reload the user', async () => {
      await updatePhoneNumber(user, credential);
      expect(reloadMock.calls.length).to.eq(1);
    });
  });
});
