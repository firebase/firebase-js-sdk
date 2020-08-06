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

import {
  ApplicationVerifier,
  OperationType,
  ProviderId
} from '@firebase/auth-types-exp';
import { FirebaseError } from '@firebase/util';

import { mockEndpoint } from '../../../test/api/helper';
import { testAuth, testUser } from '../../../test/mock_auth';
import * as fetch from '../../../test/mock_fetch';
import { Endpoint } from '../../api';
import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { User } from '../../model/user';
import { RecaptchaVerifier } from '../../platform_browser/recaptcha/recaptcha_verifier';
import {
  _verifyPhoneNumber,
  linkWithPhoneNumber,
  signInWithPhoneNumber
} from './phone';

use(chaiAsPromised);
use(sinonChai);

describe('core/strategies/phone', () => {
  let auth: Auth;
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
          kind: 'my-kind'
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
          kind: 'my-kind'
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

  describe('_verifyPhoneNumber', () => {
    it('works with a string phone number', async () => {
      await _verifyPhoneNumber(auth, 'number', verifier);
      expect(sendCodeEndpoint.calls[0].request).to.eql({
        recaptchaToken: 'recaptcha-token',
        phoneNumber: 'number'
      });
    });

    it('works with an options object', async () => {
      await _verifyPhoneNumber(
        auth,
        {
          phoneNumber: 'number'
        },
        verifier
      );
      expect(sendCodeEndpoint.calls[0].request).to.eql({
        recaptchaToken: 'recaptcha-token',
        phoneNumber: 'number'
      });
    });

    it('throws if the verifier does not return a string', async () => {
      (verifier.verify as sinon.SinonStub).returns(Promise.resolve(123));
      await expect(
        _verifyPhoneNumber(auth, 'number', verifier)
      ).to.be.rejectedWith(
        FirebaseError,
        'Firebase: Error (auth/argument-error)'
      );
    });

    it('throws if the verifier type is not recaptcha', async () => {
      const mutVerifier: {
        -readonly [K in keyof ApplicationVerifier]: ApplicationVerifier[K];
      } = verifier;
      mutVerifier.type = 'not-recaptcha-thats-for-sure';
      await expect(
        _verifyPhoneNumber(auth, 'number', mutVerifier)
      ).to.be.rejectedWith(
        FirebaseError,
        'Firebase: Error (auth/argument-error)'
      );
    });

    it('resets the verifer after successful verification', async () => {
      sinon.spy(verifier, 'reset');
      expect(await _verifyPhoneNumber(auth, 'number', verifier)).to.eq(
        'session-info'
      );
      expect(verifier.reset).to.have.been.called;
    });

    it('resets the verifer after a failed verification', async () => {
      sinon.spy(verifier, 'reset');
      (verifier.verify as sinon.SinonStub).returns(Promise.resolve(123));

      await expect(_verifyPhoneNumber(auth, 'number', verifier)).to.be.rejected;
      expect(verifier.reset).to.have.been.called;
    });
  });
});
