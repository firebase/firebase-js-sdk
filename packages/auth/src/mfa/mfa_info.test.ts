/**
 * @license
 * Copyright 2026 Google LLC
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

import { FactorId } from '../model/public_types';
import { FirebaseError } from '@firebase/util';

import { testAuth, TestAuth } from '../../test/helpers/mock_auth';
import { PhoneMfaEnrollment } from '../api/account_management/mfa';
import { MultiFactorInfoImpl } from './mfa_info';
describe('core/mfa/mfa_info/MultiFactorInfo for Phone MFA', () => {
  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
  });

  describe('_fromServerResponse', () => {
    describe('phone enrollment', () => {
      const date = Date.now();
      const enrollmentInfo = {
        mfaEnrollmentId: 'uid',
        enrolledAt: date,
        displayName: 'display-name',
        phoneInfo: 'phone-info'
      };

      it('should create a valid MfaInfo', () => {
        const mfaInfo = MultiFactorInfoImpl._fromServerResponse(
          auth,
          enrollmentInfo
        );
        expect(mfaInfo.factorId).toBe(FactorId.PHONE);
        expect(mfaInfo.uid).toBe('uid');
        expect(mfaInfo.enrollmentTime).toBe(new Date(date).toUTCString());
        expect(mfaInfo.displayName).toBe('display-name');
      });
    });

    describe('Invalid enrollment', () => {
      const enrollmentInfo = {
        mfaEnrollmentId: 'uid',
        enrolledAt: Date.now(),
        displayName: 'display-name'
      };

      it('should throw an error', () => {
        expect(() =>
          MultiFactorInfoImpl._fromServerResponse(
            auth,
            enrollmentInfo as PhoneMfaEnrollment
          )
        ).toThrow(FirebaseError, 'auth/internal-error');
      });
    });
  });
});

describe('core/mfa/mfa_info/MultiFactorInfo for TOTP MFA', () => {
  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
  });

  describe('_fromServerResponse', () => {
    describe('TOTP enrollment', () => {
      const date = Date.now();
      const enrollmentInfo = {
        mfaEnrollmentId: 'uid',
        enrolledAt: date,
        displayName: 'display-name',
        totpInfo: {}
      };

      it('should create a valid MfaInfo', () => {
        const mfaInfo = MultiFactorInfoImpl._fromServerResponse(
          auth,
          enrollmentInfo
        );
        expect(mfaInfo.factorId).toBe(FactorId.TOTP);
        expect(mfaInfo.uid).toBe('uid');
        expect(mfaInfo.enrollmentTime).toBe(new Date(date).toUTCString());
        expect(mfaInfo.displayName).toBe('display-name');
      });
    });

    describe('Invalid enrollment, no totp or phone info found', () => {
      const enrollmentInfo = {
        mfaEnrollmentId: 'uid',
        enrolledAt: Date.now(),
        displayName: 'display-name'
      };

      it('should throw an error', () => {
        expect(() =>
          MultiFactorInfoImpl._fromServerResponse(auth, enrollmentInfo)
        ).toThrow(FirebaseError, 'auth/internal-error');
      });
    });
  });
});
