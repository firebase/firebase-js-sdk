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
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { MultiFactorSessionImpl } from '../../mfa/mfa_session';
import { StartTotpMfaEnrollmentResponse } from '../../api/account_management/mfa';
import { TotpSecret } from '../../platform_browser/mfa/assertions/totp';
import { TotpMultiFactorGenerator } from './totp';
import { FactorId } from '../../model/public_types';
import { AuthErrorCode } from '../../core/errors';

use(chaiAsPromised);

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
      const secret = TotpSecret.fromStartTotpMfaEnrollmentResponse(
        startEnrollmentResponse,
        auth.name
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

    it('should throw error if auth instance is not found in mfaSession', async () => {
      try {
        session = MultiFactorSessionImpl._fromIdtoken(
          'enrollment-id-token',
          undefined
        );
        const totpSecret = await TotpMultiFactorGenerator.generateSecret(
          session
        );
      } catch (e) {
        expect(e.code).to.eql(`auth/${AuthErrorCode.INTERNAL_ERROR}`);
      }
    });
    it('generateSecret should generate a valid secret by starting enrollment', async () => {
      const mock = mockEndpoint(
        Endpoint.START_MFA_ENROLLMENT,
        startEnrollmentResponse
      );

      auth = await testAuth();
      session = MultiFactorSessionImpl._fromIdtoken(
        'enrollment-id-token',
        auth
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
