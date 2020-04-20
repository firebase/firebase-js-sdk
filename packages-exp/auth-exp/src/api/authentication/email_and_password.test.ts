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
import {
  EmailSignInRequest,
  PasswordResetRequest,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithPassword,
  VerifyEmailRequest
} from './email_and_password';
import { Operation } from '../../model/action_code_info';

use(chaiAsPromised);

describe('signInWithPassword', () => {
  const request = {
    returnSecureToken: true,
    email: 'test@foo.com',
    password: 'my-password'
  };

  beforeEach(mockFetch.setUp);
  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.SIGN_IN_WITH_PASSWORD, {
      displayName: 'my-name',
      email: 'test@foo.com'
    });

    const response = await signInWithPassword(mockAuth, request);
    expect(response.displayName).to.eq('my-name');
    expect(response.email).to.eq('test@foo.com');
    expect(mock.calls[0].request).to.eql(request);
    expect(mock.calls[0].method).to.eq('POST');
    expect(mock.calls[0].headers).to.eql({
      'Content-Type': 'application/json',
      'X-Client-Version': 'testSDK/0.0.0'
    });
  });

  it('should handle errors', async () => {
    const mock = mockEndpoint(
      Endpoint.SIGN_IN_WITH_PASSWORD,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_PASSWORD,
          errors: [
            {
              message: ServerError.INVALID_PASSWORD
            }
          ]
        }
      },
      400
    );

    await expect(signInWithPassword(mockAuth, request)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The password is invalid or the user does not have a password. (auth/wrong-password).'
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});

describe('sendOobCode', () => {
  context('VERIFY_EMAIL', () => {
    const request: VerifyEmailRequest = {
      requestType: Operation.VERIFY_EMAIL,
      idToken: 'my-token'
    };

    beforeEach(mockFetch.setUp);
    afterEach(mockFetch.tearDown);

    it('should POST to the correct endpoint', async () => {
      const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
        email: 'test@foo.com'
      });

      const response = await sendEmailVerification(mockAuth, request);
      expect(response.email).to.eq('test@foo.com');
      expect(mock.calls[0].request).to.eql(request);
      expect(mock.calls[0].method).to.eq('POST');
      expect(mock.calls[0].headers).to.eql({
        'Content-Type': 'application/json',
        'X-Client-Version': 'testSDK/0.0.0'
      });
    });

    it('should handle errors', async () => {
      const mock = mockEndpoint(
        Endpoint.SEND_OOB_CODE,
        {
          error: {
            code: 400,
            message: ServerError.INVALID_EMAIL,
            errors: [
              {
                message: ServerError.INVALID_EMAIL
              }
            ]
          }
        },
        400
      );

      await expect(sendEmailVerification(mockAuth, request)).to.be.rejectedWith(
        FirebaseError,
        'Firebase: The email address is badly formatted. (auth/invalid-email).'
      );
      expect(mock.calls[0].request).to.eql(request);
    });
  });

  context('PASSWORD_RESET', () => {
    const request: PasswordResetRequest = {
      requestType: Operation.PASSWORD_RESET,
      email: 'test@foo.com'
    };

    beforeEach(mockFetch.setUp);
    afterEach(mockFetch.tearDown);

    it('should POST to the correct endpoint', async () => {
      const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
        email: 'test@foo.com'
      });

      const response = await sendPasswordResetEmail(mockAuth, request);
      expect(response.email).to.eq('test@foo.com');
      expect(mock.calls[0].request).to.eql(request);
      expect(mock.calls[0].method).to.eq('POST');
      expect(mock.calls[0].headers).to.eql({
        'Content-Type': 'application/json',
        'X-Client-Version': 'testSDK/0.0.0'
      });
    });

    it('should handle errors', async () => {
      const mock = mockEndpoint(
        Endpoint.SEND_OOB_CODE,
        {
          error: {
            code: 400,
            message: ServerError.INVALID_EMAIL,
            errors: [
              {
                message: ServerError.INVALID_EMAIL
              }
            ]
          }
        },
        400
      );

      await expect(
        sendPasswordResetEmail(mockAuth, request)
      ).to.be.rejectedWith(
        FirebaseError,
        'Firebase: The email address is badly formatted. (auth/invalid-email).'
      );
      expect(mock.calls[0].request).to.eql(request);
    });
  });

  context('EMAIL_SIGNIN', () => {
    const request: EmailSignInRequest = {
      requestType: Operation.EMAIL_SIGNIN,
      email: 'test@foo.com'
    };

    beforeEach(mockFetch.setUp);
    afterEach(mockFetch.tearDown);

    it('should POST to the correct endpoint', async () => {
      const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
        email: 'test@foo.com'
      });

      const response = await sendSignInLinkToEmail(mockAuth, request);
      expect(response.email).to.eq('test@foo.com');
      expect(mock.calls[0].request).to.eql(request);
      expect(mock.calls[0].method).to.eq('POST');
      expect(mock.calls[0].headers).to.eql({
        'Content-Type': 'application/json',
        'X-Client-Version': 'testSDK/0.0.0'
      });
    });

    it('should handle errors', async () => {
      const mock = mockEndpoint(
        Endpoint.SEND_OOB_CODE,
        {
          error: {
            code: 400,
            message: ServerError.INVALID_EMAIL,
            errors: [
              {
                message: ServerError.INVALID_EMAIL
              }
            ]
          }
        },
        400
      );

      await expect(sendSignInLinkToEmail(mockAuth, request)).to.be.rejectedWith(
        FirebaseError,
        'Firebase: The email address is badly formatted. (auth/invalid-email).'
      );
      expect(mock.calls[0].request).to.eql(request);
    });
  });
});
