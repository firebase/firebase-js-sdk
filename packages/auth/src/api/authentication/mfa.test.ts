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

import { FirebaseError } from '@firebase/util';

import {
  Endpoint,
  HttpHeader,
  RecaptchaClientType,
  RecaptchaVersion
} from '../';
import { mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { ServerError } from '../errors';
import { finalizeSignInPhoneMfa, startSignInPhoneMfa } from './mfa';
describe('api/authentication/startSignInPhoneMfa', () => {
  const request = {
    mfaPendingCredential: 'my-creds',
    mfaEnrollmentId: 'my-enrollment-id',
    phoneSignInInfo: {
      recaptchaToken: 'captcha-token',
      captchaResponse: 'captcha-response',
      clientType: RecaptchaClientType.WEB,
      recaptchaVersion: RecaptchaVersion.ENTERPRISE
    }
  };

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.START_MFA_SIGN_IN, {
      phoneResponseInfo: {
        sessionInfo: 'session-info'
      }
    });

    const response = await startSignInPhoneMfa(auth, request);
    expect(response.phoneResponseInfo.sessionInfo).toBe('session-info');
    expect(mock.calls[0].request).toEqual(request);
    expect(mock.calls[0].method).toBe('POST');
    expect(mock.calls[0].headers!.get(HttpHeader.CONTENT_TYPE)).toBe(
      'application/json'
    );
    expect(mock.calls[0].headers!.get(HttpHeader.X_CLIENT_VERSION)).toBe(
      'testSDK/0.0.0'
    );
  });

  it('should handle errors', async () => {
    const mock = mockEndpoint(
      Endpoint.START_MFA_SIGN_IN,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_PENDING_TOKEN,
          errors: [
            {
              message: ServerError.INVALID_PENDING_TOKEN
            }
          ]
        }
      },
      400
    );

    await expect(startSignInPhoneMfa(auth, request)).rejects.toThrow(
      FirebaseError,
      'Firebase: The supplied auth credential is incorrect, malformed or has expired. (auth/invalid-credential).'
    );
    expect(mock.calls[0].request).toEqual(request);
  });
});

describe('api/authentication/finalizeSignInPhoneMfa', () => {
  const request = {
    mfaPendingCredential: 'pending-cred',
    phoneVerificationInfo: {
      temporaryProof: 'proof',
      phoneNumber: '123456789',
      sessionInfo: 'session-info',
      code: 'my-code'
    }
  };

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.FINALIZE_MFA_SIGN_IN, {
      idToken: 'id-token',
      refreshToken: 'refresh-token'
    });

    const response = await finalizeSignInPhoneMfa(auth, request);
    expect(response.idToken).toBe('id-token');
    expect(response.refreshToken).toBe('refresh-token');
    expect(mock.calls[0].request).toEqual(request);
    expect(mock.calls[0].method).toBe('POST');
    expect(mock.calls[0].headers!.get(HttpHeader.CONTENT_TYPE)).toBe(
      'application/json'
    );
    expect(mock.calls[0].headers!.get(HttpHeader.X_CLIENT_VERSION)).toBe(
      'testSDK/0.0.0'
    );
  });

  it('should handle errors', async () => {
    const mock = mockEndpoint(
      Endpoint.FINALIZE_MFA_SIGN_IN,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_CODE,
          errors: [
            {
              message: ServerError.INVALID_CODE
            }
          ]
        }
      },
      400
    );

    await expect(finalizeSignInPhoneMfa(auth, request)).rejects.toThrow(
      FirebaseError,
      'Firebase: The SMS verification code used to create the phone auth credential is invalid. Please resend the verification code sms and be sure to use the verification code provided by the user. (auth/invalid-verification-code).'
    );
    expect(mock.calls[0].request).toEqual(request);
  });
});
