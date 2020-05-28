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

import { FirebaseError } from '@firebase/util';

import { Endpoint } from '../';
import { mockEndpoint } from '../../../test/api/helper';
import { testAuth } from '../../../test/mock_auth';
import * as mockFetch from '../../../test/mock_fetch';
import { Auth } from '../../model/auth';
import { ServerError } from '../errors';
import { finalizeSignInPhoneMfa, startSignInPhoneMfa } from './mfa';

use(chaiAsPromised);

describe('api/authentication/startSignInPhoneMfa', () => {
  const request = {
    mfaPendingCredential: 'my-creds',
    mfaEnrollmentId: 'my-enrollment-id',
    phoneSignInInfo: {
      recaptchaToken: 'catpcha-token'
    }
  };

  let auth: Auth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.START_PHONE_MFA_SIGN_IN, {
      phoneResponseInfo: {
        sessionInfo: 'session-info'
      }
    });

    const response = await startSignInPhoneMfa(auth, request);
    expect(response.phoneResponseInfo.sessionInfo).to.eq('session-info');
    expect(mock.calls[0].request).to.eql(request);
    expect(mock.calls[0].method).to.eq('POST');
    expect(mock.calls[0].headers).to.eql({
      'Content-Type': 'application/json',
      'X-Client-Version': 'testSDK/0.0.0'
    });
  });

  it('should handle errors', async () => {
    const mock = mockEndpoint(
      Endpoint.START_PHONE_MFA_SIGN_IN,
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

    await expect(startSignInPhoneMfa(auth, request)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The supplied auth credential is malformed or has expired. (auth/invalid-credential).'
    );
    expect(mock.calls[0].request).to.eql(request);
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

  let auth: Auth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.FINALIZE_PHONE_MFA_SIGN_IN, {
      displayName: 'my-name',
      idToken: 'id-token'
    });

    const response = await finalizeSignInPhoneMfa(auth, request);
    expect(response.displayName).to.eq('my-name');
    expect(response.idToken).to.eq('id-token');
    expect(mock.calls[0].request).to.eql(request);
    expect(mock.calls[0].method).to.eq('POST');
    expect(mock.calls[0].headers).to.eql({
      'Content-Type': 'application/json',
      'X-Client-Version': 'testSDK/0.0.0'
    });
  });

  it('should handle errors', async () => {
    const mock = mockEndpoint(
      Endpoint.FINALIZE_PHONE_MFA_SIGN_IN,
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

    await expect(finalizeSignInPhoneMfa(auth, request)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The SMS verification code used to create the phone auth credential is invalid. Please resend the verification code sms and be sure use the verification code provided by the user. (auth/invalid-verification-code).'
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});
