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

import { mockEndpoint } from '../../../../test/helpers/api/helper';
import {
  testAuth,
  testUser,
  TestAuth
} from '../../../../test/helpers/mock_auth';
import * as mockFetch from '../../../../test/helpers/mock_fetch';
import { Endpoint } from '../../../api';
import { FinalizeMfaResponse } from '../../../api/authentication/mfa';
import { MultiFactorSessionImpl } from '../../../mfa/mfa_session';
import { StartTotpMfaEnrollmentResponse } from '../../../api/account_management/mfa';
import { TotpMultiFactorAssertionImpl, TotpSecret } from './totp';
import { FirebaseApp, initializeApp } from '@firebase/app';
import { AppName } from '../../../model/auth';
import { getAuth } from '../..';
import { initializeAuth } from '../../../core';
import { _castAuth } from '../../../core/auth/auth_impl';
import { Auth } from '../../../model/public_types';

use(chaiAsPromised);

describe('platform_browser/mfa/totp', () => {
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
    secret = TotpSecret.fromStartTotpMfaEnrollmentResponse(
      startEnrollmentResponse,
      auth.name
    );
    assertion = TotpMultiFactorAssertionImpl._fromSecret(secret, '123456');
  });
  afterEach(mockFetch.tearDown);

  describe('enroll', () => {
    beforeEach(() => {
      session = MultiFactorSessionImpl._fromIdtoken(
        'enrollment-id-token',
        auth
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
      expect(session.auth).to.eql(auth);
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
        expect(session.auth).to.eql(auth);
      });
    });
  });
});

describe('core/mfa/totp/TotpSecret', () => {
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
  const fakeAppName: AppName = 'test-app';
  const fakeEmail: string = 'user@email';
  const secret = TotpSecret.fromStartTotpMfaEnrollmentResponse(
    serverResponse,
    fakeAppName
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
    let app: FirebaseApp;
    let auth: Auth;

    beforeEach(async () => {
      app = initializeApp(
        {
          apiKey: 'fake-key',
          appId: 'fake-app-id',
          authDomain: 'fake-auth-domain'
        },
        fakeAppName
      );
      auth = initializeAuth(app);
      await auth.updateCurrentUser(
        testUser(_castAuth(auth), 'uid', fakeEmail, true)
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
      const auth2 = getAuth(app);
      console.log('Current user is ' + auth2);
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
