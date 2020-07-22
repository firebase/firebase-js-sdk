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

import { ProviderId } from '@firebase/auth-types-exp';

import { mockEndpoint } from '../../test/helpers/api/helper';
import { testAuth, testUser } from '../../test/helpers/mock_auth';
import * as mockFetch from '../../test/helpers/mock_fetch';
import { Endpoint } from '../api';
import { APIUserInfo } from '../api/account_management/account';
import { FinalizeMfaResponse } from '../api/authentication/mfa';
import { ServerError } from '../api/errors';
import { PhoneAuthProvider } from '../core/providers/phone';
import { Auth } from '../model/auth';
import { User } from '../model/user';
import { PhoneMultiFactorAssertion } from './assertions/phone';
import { MultiFactorInfo } from './mfa_info';
import { MultiFactorSession, MultiFactorSessionType } from './mfa_session';
import { multiFactor, MultiFactorUser } from './mfa_user';

use(chaiAsPromised);

describe('core/mfa/mfa_user/MultiFactorUser', () => {
  let auth: Auth;
  let mfaUser: MultiFactorUser;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
    mfaUser = MultiFactorUser._fromUser(testUser(auth, 'uid', undefined, true));
  });

  afterEach(mockFetch.tearDown);

  describe('getSession', () => {
    it('should return the id token', async () => {
      const mfaSession = (await mfaUser.getSession()) as MultiFactorSession;
      expect(mfaSession.type).to.eq(MultiFactorSessionType.ENROLL);
      expect(mfaSession.credential).to.eq('access-token');
    });
  });

  describe('enroll', () => {
    let finalizeMfaEnrollmentMock: mockFetch.Route;
    let assertion: PhoneMultiFactorAssertion;

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

    const serverResponse: FinalizeMfaResponse = {
      idToken: 'final-id-token',
      refreshToken: 'refresh-token'
    };

    beforeEach(() => {
      const credential = PhoneAuthProvider.credential(
        'verification-id',
        'verification-code'
      );
      assertion = PhoneMultiFactorAssertion._fromCredential(auth, credential);

      finalizeMfaEnrollmentMock = mockEndpoint(
        Endpoint.FINALIZE_PHONE_MFA_ENROLLMENT,
        serverResponse
      );

      mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
        users: [serverUser]
      });
    });

    it('should finalize the enrollment flow', async () => {
      await mfaUser.enroll(assertion);

      expect(finalizeMfaEnrollmentMock.calls[0].request).to.eql({
        idToken: 'access-token',
        tenantId: auth.tenantId,
        phoneVerificationInfo: {
          code: 'verification-code',
          sessionInfo: 'verification-id'
        }
      });
    });

    it('should update the tokens', async () => {
      await mfaUser.enroll(assertion);

      expect(await mfaUser.user.getIdToken()).to.eq('final-id-token');
    });

    it('should update the enrolled Factors', async () => {
      await mfaUser.enroll(assertion);

      expect(mfaUser.enrolledFactors.length).to.eq(1);
      const enrolledFactor = mfaUser.enrolledFactors[0];
      expect(enrolledFactor.factorId).to.eq(ProviderId.PHONE);
      expect(enrolledFactor.uid).to.eq('mfa-id');
    });
  });

  describe('unenroll', () => {
    let withdrawMfaEnrollmentMock: mockFetch.Route;

    const serverResponse: FinalizeMfaResponse = {
      idToken: 'final-id-token',
      refreshToken: 'refresh-token'
    };

    const mfaInfo = MultiFactorInfo._fromServerResponse(auth, {
      mfaEnrollmentId: 'mfa-id',
      enrolledAt: Date.now(),
      phoneInfo: 'phone-info'
    });

    const otherMfaInfo = MultiFactorInfo._fromServerResponse(auth, {
      mfaEnrollmentId: 'other-mfa-id',
      enrolledAt: Date.now(),
      phoneInfo: 'other-phone-info'
    });

    const serverUser: APIUserInfo = {
      localId: 'local-id',
      mfaInfo: [
        {
          mfaEnrollmentId: 'other-mfa-id',
          enrolledAt: Date.now(),
          phoneInfo: 'other-phone-info'
        }
      ]
    };

    beforeEach(() => {
      withdrawMfaEnrollmentMock = mockEndpoint(
        Endpoint.WITHDRAW_MFA,
        serverResponse
      );
      mfaUser.enrolledFactors = [mfaInfo, otherMfaInfo];

      mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
        users: [serverUser]
      });
    });

    it('should withdraw the MFA', async () => {
      await mfaUser.unenroll(mfaInfo);

      expect(withdrawMfaEnrollmentMock.calls[0].request).to.eql({
        idToken: 'access-token',
        mfaEnrollmentId: mfaInfo.uid,
        tenantId: auth.tenantId
      });
    });

    it('should remove matching enrollment factors but leave any others', async () => {
      await mfaUser.unenroll(mfaInfo);

      expect(mfaUser.enrolledFactors).to.eql([otherMfaInfo]);
    });

    it('should support passing a string instead of MultiFactorInfo', async () => {
      await mfaUser.unenroll(mfaInfo.uid);

      expect(withdrawMfaEnrollmentMock.calls[0].request).to.eql({
        idToken: 'access-token',
        mfaEnrollmentId: mfaInfo.uid,
        tenantId: auth.tenantId
      });
    });

    it('should update the tokens', async () => {
      await mfaUser.unenroll(mfaInfo);

      expect(await mfaUser.user.getIdToken()).to.eq('final-id-token');
    });

    context('token revoked by backend', () => {
      beforeEach(() => {
        mockEndpoint(
          Endpoint.GET_ACCOUNT_INFO,
          {
            error: {
              message: ServerError.TOKEN_EXPIRED
            }
          },
          403
        );
      });

      it('should swallow the error', async () => {
        await mfaUser.unenroll(mfaInfo);
      });
    });
  });
});

describe('core/mfa/mfa_user/multiFactor', () => {
  let auth: Auth;
  let user: User;

  beforeEach(async () => {
    auth = await testAuth();
    user = testUser(auth, 'uid', undefined, true);
  });

  it('can be used to a create a MultiFactorUser', () => {
    const mfaUser = multiFactor(user);
    expect((mfaUser as MultiFactorUser).user).to.eq(user);
  });

  it('should only create one instance of an MFA user per User', () => {
    const mfaUser = multiFactor(user);
    expect(multiFactor(user)).to.eq(mfaUser);
  });

  context('enrolledFactors', () => {
    const serverUser: APIUserInfo = {
      localId: 'local-id',
      mfaInfo: [
        {
          mfaEnrollmentId: 'enrollment-id',
          enrolledAt: Date.now(),
          phoneInfo: 'masked-phone-number'
        }
      ]
    };

    const updatedServerUser: APIUserInfo = {
      localId: 'local-id',
      mfaInfo: [
        {
          mfaEnrollmentId: 'enrollment-id',
          enrolledAt: Date.now(),
          phoneInfo: 'masked-phone-number'
        },
        {
          mfaEnrollmentId: 'new-enrollment-id',
          enrolledAt: Date.now(),
          phoneInfo: 'other-masked-phone-number'
        }
      ]
    };

    beforeEach(() => {
      mockFetch.setUp();
      mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
        users: [serverUser]
      });
    });

    afterEach(mockFetch.tearDown);

    it('should initialize the enrolled factors from the last reload', async () => {
      await user.reload();
      const mfaUser = multiFactor(user);
      expect(mfaUser.enrolledFactors.length).to.eq(1);
      const mfaInfo = mfaUser.enrolledFactors[0];
      expect(mfaInfo.uid).to.eq('enrollment-id');
      expect(mfaInfo.factorId).to.eq(ProviderId.PHONE);
    });

    it('should update the enrolled factors if the user is reloaded', async () => {
      await user.reload();
      const mfaUser = multiFactor(user);
      expect(mfaUser.enrolledFactors.length).to.eq(1);
      mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
        users: [updatedServerUser]
      });
      await user.reload();
      expect(mfaUser.enrolledFactors.length).to.eq(2);
    });
  });
});
