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

import { FactorId, OperationType, ProviderId } from '@firebase/auth-types-exp';
import { FirebaseError } from '@firebase/util';

import { mockEndpoint } from '../../test/helpers/api/helper';
import { testAuth, testUser, TestAuth } from '../../test/helpers/mock_auth';
import * as mockFetch from '../../test/helpers/mock_fetch';
import { Endpoint } from '../api';
import { APIUserInfo } from '../api/account_management/account';
import { PhoneAuthCredential } from '../core/credentials/phone';
import { AuthErrorCode } from '../core/errors';
import { User, UserCredential } from '../model/user';
import { MultiFactorAssertion } from './mfa_assertion';
import { PhoneMultiFactorAssertion } from '../platform_browser/mfa/assertions/phone';
import { MultiFactorError } from './mfa_error';
import { getMultiFactorResolver, MultiFactorResolver } from './mfa_resolver';
import { _createError } from '../core/util/assert';
import { makeJWT } from '../../test/helpers/jwt';
use(chaiAsPromised);

describe('core/mfa/mfa_resolver/MultiFactorResolver', () => {
  const finalIdToken = makeJWT({ 'exp': '3600', 'iat': '1200' });
  let auth: TestAuth;
  let underlyingError: FirebaseError;
  let error: MultiFactorError;
  let clock: sinon.SinonFakeTimers;

  beforeEach(async () => {
    clock = sinon.useFakeTimers();
    auth = await testAuth();
    auth.tenantId = 'tenant-id';
    underlyingError = _createError(auth, AuthErrorCode.MFA_REQUIRED, {
      serverResponse: {
        localId: 'local-id',
        mfaPendingCredential: 'mfa-pending-credential',
        mfaInfo: [
          {
            mfaEnrollmentId: 'mfa-enrollment-id',
            enrolledAt: Date.now(),
            phoneInfo: '+*******1234',
            displayName: ''
          }
        ]
      }
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('MultiFactorResolver', () => {
    let assertion: MultiFactorAssertion;
    let secondFactorCredential: PhoneAuthCredential;
    let resolver: MultiFactorResolver;

    beforeEach(() => {
      mockFetch.setUp();
      secondFactorCredential = PhoneAuthCredential._fromVerification(
        'verification-id',
        'verification-code'
      );
      assertion = PhoneMultiFactorAssertion._fromCredential(
        secondFactorCredential
      );
    });

    afterEach(mockFetch.tearDown);

    describe('resolveSignIn', () => {
      let mock: mockFetch.Route;

      const serverUser: APIUserInfo = {
        localId: 'local-id',
        displayName: 'display-name',
        photoUrl: 'photo-url',
        email: 'email',
        emailVerified: true,
        phoneNumber: 'phone-number',
        tenantId: 'tenant-id',
        createdAt: 123,
        lastLoginAt: 456,
        mfaInfo: [
          {
            mfaEnrollmentId: 'mfa-id',
            enrolledAt: Date.now(),
            phoneInfo: 'phone-number'
          }
        ]
      };

      beforeEach(() => {
        mock = mockEndpoint(Endpoint.FINALIZE_PHONE_MFA_SIGN_IN, {
          idToken: finalIdToken,
          refreshToken: 'final-refresh-token'
        });

        mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
          users: [serverUser]
        });
      });

      context('sign in', () => {
        beforeEach(() => {
          error = MultiFactorError._fromErrorAndOperation(
            auth,
            underlyingError,
            OperationType.SIGN_IN
          );
          resolver = MultiFactorResolver._fromError(auth, error);
        });

        it('finalizes the sign in flow', async () => {
          const userCredential = (await resolver.resolveSignIn(
            assertion
          )) as UserCredential;
          expect(userCredential.user.uid).to.eq('local-id');
          expect(await userCredential.user.getIdToken()).to.eq(finalIdToken);
          expect(userCredential.user.stsTokenManager.expirationTime).to.eq(
            clock.now + 2400 * 1000
          );
          expect(userCredential._tokenResponse).to.eql({
            localId: 'local-id',
            idToken: finalIdToken,
            refreshToken: 'final-refresh-token'
          });
          expect(mock.calls[0].request).to.eql({
            tenantId: auth.tenantId,
            mfaPendingCredential: 'mfa-pending-credential',
            phoneVerificationInfo: {
              sessionInfo: 'verification-id',
              code: 'verification-code'
            }
          });
        });
      });

      context('reauthentication', () => {
        let user: User;

        beforeEach(() => {
          user = testUser(auth, 'local-id', undefined, true);
          error = MultiFactorError._fromErrorAndOperation(
            auth,
            underlyingError,
            OperationType.REAUTHENTICATE,
            user
          );
          resolver = MultiFactorResolver._fromError(auth, error);
        });

        it('finalizes the reauth flow', async () => {
          const userCredential = (await resolver.resolveSignIn(
            assertion
          )) as UserCredential;
          expect(userCredential.user).to.eq(user);
          expect(await userCredential.user.getIdToken()).to.eq(finalIdToken);
          expect(userCredential.user.stsTokenManager.expirationTime).to.eq(
            clock.now + 2400 * 1000
          );
          expect(userCredential._tokenResponse).to.eql({
            localId: 'local-id',
            idToken: finalIdToken,
            refreshToken: 'final-refresh-token'
          });
          expect(mock.calls[0].request).to.eql({
            tenantId: auth.tenantId,
            mfaPendingCredential: 'mfa-pending-credential',
            phoneVerificationInfo: {
              sessionInfo: 'verification-id',
              code: 'verification-code'
            }
          });
        });
      });
    });
  });

  describe('getMultiFactorResolver', () => {
    context('sign in', () => {
      beforeEach(() => {
        error = MultiFactorError._fromErrorAndOperation(
          auth,
          underlyingError,
          OperationType.SIGN_IN
        );
      });
      it('can be used to obtain a resolver', () => {
        const resolver = getMultiFactorResolver(auth, error);
        expect(resolver.hints[0].factorId).to.eq(ProviderId.PHONE);
      });
    });

    context('reauthentication', () => {
      let user: User;

      beforeEach(() => {
        user = testUser(auth, 'local-id', undefined, true);
        error = MultiFactorError._fromErrorAndOperation(
          auth,
          underlyingError,
          OperationType.REAUTHENTICATE,
          user
        );
      });

      it('can be used to obtain a resolver', () => {
        const resolver = getMultiFactorResolver(auth, error);
        expect(resolver.hints[0].factorId).to.eq(FactorId.PHONE);
      });
    });
  });
});
