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

import { mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth, testUser } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { MultiFactorSessionImpl } from '../../mfa/mfa_session';
import { StartTotpMfaEnrollmentResponse } from '../../api/account_management/mfa';
import { FinalizeMfaResponse } from '../../api/authentication/mfa';
import {
  TotpMultiFactorAssertionImpl,
  TotpMultiFactorGenerator,
  TotpSecret
} from './totp';
import { FactorId } from '../../model/public_types';
import { AuthErrorCode } from '../../core/errors';
import { AppName } from '../../model/auth';
import { _castAuth } from '../../core/auth/auth_impl';
import { MultiFactorAssertionImpl } from '../mfa_assertion';

use(chaiAsPromised);

const fakeUid: string = 'uid';

describe('core/mfa/assertions/totp/TotpMultiFactorGenerator', () => {
  let auth: TestAuth;
  let session: MultiFactorSessionImpl;
  const startEnrollmentResponse: StartTotpMfaEnrollmentResponse = {
    totpSessionInfo: {
      sharedSecretKey: 'key123',
      verificationCodeLength: 6,
      hashingAlgorithm: 'SHA1',
      periodSec: 30,
      sessionInfo: 'verification-id',
      finalizeEnrollmentTime: 1662586196
    }
  };
  describe('assertionForEnrollment', () => {
    it('should generate a valid TOTP assertion for enrollment', async () => {
      auth = await testAuth();
      const secret = TotpSecret._fromStartTotpMfaEnrollmentResponse(
        startEnrollmentResponse,
        auth
      );
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(
        secret,
        '123456'
      );
      expect(assertion.factorId).to.eql(FactorId.TOTP);
    });
  });

  describe('assertionForSignIn', () => {
    it('should generate a valid TOTP assertion for sign in', () => {
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(
        'enrollmentId',
        '123456'
      );
      expect(assertion.factorId).to.eql(FactorId.TOTP);
    });
  });

  describe('generateSecret', () => {
    beforeEach(async () => {
      mockFetch.setUp();
    });
    afterEach(mockFetch.tearDown);

    it('should throw error if user instance is not found in mfaSession', async () => {
      try {
        session = MultiFactorSessionImpl._fromIdtoken(
          'enrollment-id-token',
          undefined
        );
        await TotpMultiFactorGenerator.generateSecret(session);
      } catch (e) {
        expect((e as any).code).to.eql(`auth/${AuthErrorCode.INTERNAL_ERROR}`);
      }
    });
    it('generateSecret should generate a valid secret by starting enrollment', async () => {
      const mock = mockEndpoint(
        Endpoint.START_MFA_ENROLLMENT,
        startEnrollmentResponse
      );

      auth = await testAuth();
      const user = await testUser(auth, fakeUid);
      session = MultiFactorSessionImpl._fromIdtoken(
        'enrollment-id-token',
        user
      );
      const secret = await TotpMultiFactorGenerator.generateSecret(session);
      expect(mock.calls[0].request).to.eql({
        idToken: 'enrollment-id-token',
        totpEnrollmentInfo: {}
      });
      expect(secret.secretKey).to.eql(
        startEnrollmentResponse.totpSessionInfo.sharedSecretKey
      );
      expect(secret.codeIntervalSeconds).to.eq(
        startEnrollmentResponse.totpSessionInfo.periodSec
      );
      expect(secret.codeLength).to.eq(
        startEnrollmentResponse.totpSessionInfo.verificationCodeLength
      );
      expect(secret.hashingAlgorithm).to.eq(
        startEnrollmentResponse.totpSessionInfo.hashingAlgorithm
      );
    });
  });
});

describe('core/mfa/totp/assertions/TotpMultiFactorAssertionImpl', () => {
  let auth: TestAuth;
  let assertion: TotpMultiFactorAssertionImpl;
  let session: MultiFactorSessionImpl;
  let secret: TotpSecret;

  const serverResponse: FinalizeMfaResponse = {
    idToken: 'final-id-token',
    refreshToken: 'refresh-token'
  };

  const startEnrollmentResponse: StartTotpMfaEnrollmentResponse = {
    totpSessionInfo: {
      sharedSecretKey: 'key123',
      verificationCodeLength: 6,
      hashingAlgorithm: 'SHA1',
      periodSec: 30,
      sessionInfo: 'verification-id',
      finalizeEnrollmentTime: 1662586196
    }
  };

  beforeEach(async () => {
    mockFetch.setUp();
    auth = await testAuth();
    secret = TotpSecret._fromStartTotpMfaEnrollmentResponse(
      startEnrollmentResponse,
      auth
    );
    assertion = TotpMultiFactorAssertionImpl._fromSecret(secret, '123456');
  });
  afterEach(mockFetch.tearDown);

  describe('enroll', () => {
    const user = testUser(auth, fakeUid);
    beforeEach(() => {
      session = MultiFactorSessionImpl._fromIdtoken(
        'enrollment-id-token',
        user
      );
    });

    it('should finalize the MFA enrollment', async () => {
      const mock = mockEndpoint(
        Endpoint.FINALIZE_MFA_ENROLLMENT,
        serverResponse
      );
      const response = await assertion._process(auth, session);
      expect(response).to.eql(serverResponse);
      expect(mock.calls[0].request).to.eql({
        idToken: 'enrollment-id-token',
        totpVerificationInfo: {
          verificationCode: '123456',
          sessionInfo: 'verification-id'
        }
      });
      expect(session.user).to.not.be.undefined;
      expect(session.user).to.eql(user);
    });

    context('with display name', () => {
      it('should set the display name', async () => {
        const mock = mockEndpoint(
          Endpoint.FINALIZE_MFA_ENROLLMENT,
          serverResponse
        );
        const response = await assertion._process(
          auth,
          session,
          'display-name'
        );
        expect(response).to.eql(serverResponse);
        expect(mock.calls[0].request).to.eql({
          idToken: 'enrollment-id-token',
          displayName: 'display-name',
          totpVerificationInfo: {
            verificationCode: '123456',
            sessionInfo: 'verification-id'
          }
        });
        expect(session.user).to.not.be.undefined;
        expect(session.user).to.eql(user);
      });
    });
  });
});

describe('Testing signin Flow', () => {
  let auth: TestAuth;
  let assertion: MultiFactorAssertionImpl;
  let session: MultiFactorSessionImpl;
  beforeEach(async () => {
    mockFetch.setUp();
    auth = await testAuth();
    session = MultiFactorSessionImpl._fromMfaPendingCredential(
      'mfa-pending-credential'
    );
  });
  afterEach(mockFetch.tearDown);

  it('should finalize mfa signin for totp', async () => {
    const mockResponse: FinalizeMfaResponse = {
      idToken: 'final-id-token',
      refreshToken: 'refresh-token'
    };
    const mock = mockEndpoint(Endpoint.FINALIZE_MFA_SIGN_IN, mockResponse);
    assertion = TotpMultiFactorGenerator.assertionForSignIn(
      'enrollment-id',
      '123456'
    ) as any;
    const response = await assertion._process(auth, session);

    expect(response).to.eql(mockResponse);

    expect(mock.calls[0].request).to.eql({
      mfaPendingCredential: 'mfa-pending-credential',
      mfaEnrollmentId: 'enrollment-id',
      totpVerificationInfo: {
        verificationCode: '123456'
      }
    });
  });

  it('should throw Firebase Error if enrollment-id is undefined', async () => {
    assertion = TotpMultiFactorGenerator.assertionForSignIn(
      undefined as any,
      '123456'
    ) as any;

    await expect(assertion._process(auth, session)).to.be.rejectedWith(
      'auth/argument-error'
    );
  });

  it('should throw Firebase Error if otp is undefined', async () => {
    assertion = TotpMultiFactorGenerator.assertionForSignIn(
      'enrollment-id',
      undefined as any
    ) as any;

    await expect(assertion._process(auth, session)).to.be.rejectedWith(
      'auth/argument-error'
    );
  });
});

describe('core/mfa/assertions/totp/TotpSecret', async () => {
  const serverResponse: StartTotpMfaEnrollmentResponse = {
    totpSessionInfo: {
      sharedSecretKey: 'key123',
      verificationCodeLength: 6,
      hashingAlgorithm: 'SHA1',
      periodSec: 30,
      sessionInfo: 'verification-id',
      finalizeEnrollmentTime: 1662586196
    }
  };
  // this is the name used by the fake app in testAuth().
  const fakeAppName: AppName = 'test-app';
  const fakeEmail: string = 'user@email';
  const auth = await testAuth();
  const secret = TotpSecret._fromStartTotpMfaEnrollmentResponse(
    serverResponse,
    auth
  );

  describe('fromStartTotpMfaEnrollmentResponse', () => {
    it('fields from the response are parsed correctly', () => {
      expect(secret.secretKey).to.eq('key123');
      expect(secret.codeIntervalSeconds).to.eq(30);
      expect(secret.codeLength).to.eq(6);
      expect(secret.hashingAlgorithm).to.eq('SHA1');
    });
  });
  describe('generateQrCodeUrl', () => {
    beforeEach(async () => {
      await auth.updateCurrentUser(
        testUser(_castAuth(auth), fakeUid, fakeEmail, true)
      );
    });

    it('with account name and issuer provided', () => {
      const url = secret.generateQrCodeUrl('user@myawesomeapp', 'myawesomeapp');
      expect(url).to.eq(
        'otpauth://totp/myawesomeapp:user@myawesomeapp?secret=key123&issuer=myawesomeapp&algorithm=SHA1&digits=6'
      );
    });
    it('only accountName provided', () => {
      const url = secret.generateQrCodeUrl('user@myawesomeapp', '');
      expect(url).to.eq(
        `otpauth://totp/${fakeAppName}:user@myawesomeapp?secret=key123&issuer=${fakeAppName}&algorithm=SHA1&digits=6`
      );
    });
    it('only issuer provided', () => {
      const url = secret.generateQrCodeUrl('', 'myawesomeapp');
      expect(url).to.eq(
        `otpauth://totp/myawesomeapp:${fakeEmail}?secret=key123&issuer=myawesomeapp&algorithm=SHA1&digits=6`
      );
    });
    it('with defaults', () => {
      const url = secret.generateQrCodeUrl();
      expect(url).to.eq(
        `otpauth://totp/${fakeAppName}:${fakeEmail}?secret=key123&issuer=${fakeAppName}&algorithm=SHA1&digits=6`
      );
    });
    it('with defaults, without currentUser', async () => {
      await auth.updateCurrentUser(null);
      const url = secret.generateQrCodeUrl();
      expect(url).to.eq(
        `otpauth://totp/${fakeAppName}:unknownuser?secret=key123&issuer=${fakeAppName}&algorithm=SHA1&digits=6`
      );
    });
  });
});
