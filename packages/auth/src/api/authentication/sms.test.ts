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

import { ProviderId } from '../../model/enums';
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
import {
  linkWithPhoneNumber,
  sendPhoneVerificationCode,
  signInWithPhoneNumber,
  verifyPhoneNumberForExisting
} from './sms';
describe('api/authentication/sendPhoneVerificationCode', () => {
  const request = {
    phoneNumber: '123456789',
    recaptchaToken: 'captchad',
    captchaResponse: 'captcha-response',
    clientType: RecaptchaClientType.WEB,
    recaptchaVersion: RecaptchaVersion.ENTERPRISE
  };

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.SEND_VERIFICATION_CODE, {
      sessionInfo: 'my-session'
    });

    auth.tenantId = 'tenant-id';
    const response = await sendPhoneVerificationCode(auth, request);
    expect(response.sessionInfo).toBe('my-session');
    expect(mock.calls[0].request).toEqual({
      ...request,
      tenantId: 'tenant-id'
    });
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
      Endpoint.SEND_VERIFICATION_CODE,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_PHONE_NUMBER,
          errors: [
            {
              message: ServerError.INVALID_PHONE_NUMBER
            }
          ]
        }
      },
      400
    );

    await expect(sendPhoneVerificationCode(auth, request)).rejects.toThrow(
      FirebaseError,
      'Firebase: The format of the phone number provided is incorrect. Please enter the phone number in a format that can be parsed into E.164 format. E.164 phone numbers are written in the format [+][country code][subscriber number including area code]. (auth/invalid-phone-number).'
    );
    expect(mock.calls[0].request).toEqual(request);
  });
});

describe('api/authentication/signInWithPhoneNumber', () => {
  const request = {
    temporaryProof: 'my-proof',
    phoneNumber: '1234567',
    sessionInfo: 'my-session',
    code: 'my-code'
  };

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.SIGN_IN_WITH_PHONE_NUMBER, {
      providerId: ProviderId.PHONE,
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      expiresIn: '1000',
      localId: '1234'
    });

    auth.tenantId = 'tenant-id';
    const response = await signInWithPhoneNumber(auth, request);
    expect(response.providerId).toBe(ProviderId.PHONE);
    expect(response.idToken).toBe('id-token');
    expect(response.expiresIn).toBe('1000');
    expect(response.localId).toBe('1234');
    expect(mock.calls[0].request).toEqual({
      ...request,
      tenantId: 'tenant-id'
    });
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
      Endpoint.SIGN_IN_WITH_PHONE_NUMBER,
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

    await expect(signInWithPhoneNumber(auth, request)).rejects.toThrow(
      FirebaseError,
      'Firebase: The SMS verification code used to create the phone auth credential is invalid. Please resend the verification code sms and be sure to use the verification code provided by the user. (auth/invalid-verification-code).'
    );
    expect(mock.calls[0].request).toEqual(request);
  });
});

describe('api/authentication/linkWithPhoneNumber', () => {
  const request = {
    idToken: 'id-token',
    temporaryProof: 'my-proof',
    phoneNumber: '1234567',
    sessionInfo: 'my-session',
    code: 'my-code'
  };

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.SIGN_IN_WITH_PHONE_NUMBER, {
      providerId: ProviderId.PHONE,
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      expiresIn: '1000',
      localId: '1234'
    });

    auth.tenantId = 'tenant-id';
    const response = await linkWithPhoneNumber(auth, request);
    expect(response.providerId).toBe(ProviderId.PHONE);
    expect(response.idToken).toBe('id-token');
    expect(response.expiresIn).toBe('1000');
    expect(response.localId).toBe('1234');
    expect(mock.calls[0].request).toEqual({
      ...request,
      tenantId: 'tenant-id'
    });
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
      Endpoint.SIGN_IN_WITH_PHONE_NUMBER,
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

    await expect(linkWithPhoneNumber(auth, request)).rejects.toThrow(
      FirebaseError,
      'Firebase: The SMS verification code used to create the phone auth credential is invalid. Please resend the verification code sms and be sure to use the verification code provided by the user. (auth/invalid-verification-code).'
    );
    expect(mock.calls[0].request).toEqual(request);
  });
});

describe('api/authentication/verifyPhoneNumberForExisting', () => {
  const request = {
    temporaryProof: 'my-proof',
    phoneNumber: '1234567',
    sessionInfo: 'my-session',
    code: 'my-code'
  };

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.SIGN_IN_WITH_PHONE_NUMBER, {
      providerId: ProviderId.PHONE,
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      expiresIn: '1000',
      localId: '1234'
    });

    auth.tenantId = 'tenant-id';
    const response = await verifyPhoneNumberForExisting(auth, request);
    expect(response.providerId).toBe(ProviderId.PHONE);
    expect(response.idToken).toBe('id-token');
    expect(response.expiresIn).toBe('1000');
    expect(response.localId).toBe('1234');
    expect(mock.calls[0].request).toEqual({
      ...request,
      operation: 'REAUTH',
      tenantId: 'tenant-id'
    });
    expect(mock.calls[0].method).toBe('POST');
    expect(mock.calls[0].headers!.get(HttpHeader.CONTENT_TYPE)).toBe(
      'application/json'
    );
    expect(mock.calls[0].headers!.get(HttpHeader.X_CLIENT_VERSION)).toBe(
      'testSDK/0.0.0'
    );
  });

  it('should handle custom errors', async () => {
    const mock = mockEndpoint(
      Endpoint.SIGN_IN_WITH_PHONE_NUMBER,
      {
        error: {
          code: 400,
          message: ServerError.USER_NOT_FOUND,
          errors: [
            {
              message: ServerError.USER_NOT_FOUND
            }
          ]
        }
      },
      400
    );

    await expect(verifyPhoneNumberForExisting(auth, request)).rejects.toThrow(
      FirebaseError,
      'Firebase: There is no user record corresponding to this identifier. The user may have been deleted. (auth/user-not-found).'
    );
    expect(mock.calls[0].request).toEqual({
      ...request,
      operation: 'REAUTH'
    });
  });
});
