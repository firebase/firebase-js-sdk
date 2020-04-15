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

import { FirebaseError } from '@firebase/util';
import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { Endpoint } from '..';
import { mockEndpoint } from '../../../test/api/helper';
import { mockAuth } from '../../../test/mock_auth';
import * as mockFetch from '../../../test/mock_fetch';
import { ServerError } from '../errors';
import { enrollPhoneMfa, startEnrollPhoneMfa, withdrawMfa } from './mfa';

use(chaiAsPromised);

describe('startEnrollPhoneMfa', () => {
  const request = {
    idToken: 'id-token',
    phoneEnrollmentInfo: {
      phoneNumber: 'phone-number',
      recaptchaToken: 'captcha-token'
    }
  };

  beforeEach(mockFetch.setUp);
  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.START_PHONE_MFA_ENROLLMENT, {
      phoneSessionInfo: {
        sessionInfo: 'session-info'
      }
    });

    const response = await startEnrollPhoneMfa(mockAuth, request);
    expect(response.phoneSessionInfo.sessionInfo).to.eq('session-info');
    expect(mock.calls[0].request).to.eql(request);
    expect(mock.calls[0].method).to.eq('POST');
    expect(mock.calls[0].headers).to.eql({
      'Content-Type': 'application/json',
      'X-Client-Version': 'testSDK/0.0.0'
    });
  });

  it('should handle errors', async () => {
    const mock = mockEndpoint(
      Endpoint.START_PHONE_MFA_ENROLLMENT,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_ID_TOKEN,
          errors: [
            {
              message: ServerError.INVALID_ID_TOKEN
            }
          ]
        }
      },
      400
    );

    await expect(startEnrollPhoneMfa(mockAuth, request)).to.be.rejectedWith(
      FirebaseError,
      "Firebase: This user's credential isn't valid for this project. This can happen if the user's token has been tampered with]: or if the user isn't for the project associated with this API key. (auth/invalid-user-token)."
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});

describe('enrollPhoneMfa', () => {
  const request = {
    phoneVerificationInfo: {
      temporaryProof: 'temporary-proof',
      phoneNumber: 'phone-number',
      sessionInfo: 'session-info',
      code: 'code'
    }
  };

  beforeEach(mockFetch.setUp);
  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.FINALIZE_PHONE_MFA_ENROLLMENT, {
      displayName: 'my-name',
      idToken: 'id-token'
    });

    const response = await enrollPhoneMfa(mockAuth, request);
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
      Endpoint.FINALIZE_PHONE_MFA_ENROLLMENT,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_SESSION_INFO,
          errors: [
            {
              message: ServerError.INVALID_SESSION_INFO
            }
          ]
        }
      },
      400
    );

    await expect(enrollPhoneMfa(mockAuth, request)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The verification ID used to create the phone auth credential is invalid. (auth/invalid-verification-id).'
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});

describe('withdrawMfa', () => {
  const request = {
    idToken: 'id-token',
    mfaEnrollmentId: 'mfa-enrollment-id'
  };

  beforeEach(mockFetch.setUp);
  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.WITHDRAW_MFA, {
      displayName: 'my-name',
      idToken: 'id-token'
    });

    const response = await withdrawMfa(mockAuth, request);
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
      Endpoint.WITHDRAW_MFA,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_ID_TOKEN,
          errors: [
            {
              message: ServerError.INVALID_ID_TOKEN
            }
          ]
        }
      },
      400
    );

    await expect(withdrawMfa(mockAuth, request)).to.be.rejectedWith(
      FirebaseError,
      "Firebase: This user's credential isn't valid for this project. This can happen if the user's token has been tampered with]: or if the user isn't for the project associated with this API key. (auth/invalid-user-token)."
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});
