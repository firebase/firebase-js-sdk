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
import { resetPassword, updateEmailPassword } from './email_and_password';

use(chaiAsPromised);

describe('api/account_management/resetPassword', () => {
  const request = {
    oobCode: 'oob-code',
    newPassword: 'new-password'
  };

  let auth: Auth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.RESET_PASSWORD, {
      email: 'test@foo.com'
    });

    const response = await resetPassword(auth, request);
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
      Endpoint.RESET_PASSWORD,
      {
        error: {
          code: 400,
          message: ServerError.RESET_PASSWORD_EXCEED_LIMIT,
          errors: [
            {
              message: ServerError.RESET_PASSWORD_EXCEED_LIMIT
            }
          ]
        }
      },
      400
    );

    await expect(resetPassword(auth, request)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: We have blocked all requests from this device due to unusual activity. Try again later. (auth/too-many-requests).'
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});

describe('api/account_management/updateEmailPassword', () => {
  const request = {
    idToken: 'id-token',
    returnSecureToken: true,
    email: 'test@foo.com',
    password: 'new-password'
  };

  let auth: Auth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {
      idToken: 'id-token'
    });

    const response = await updateEmailPassword(auth, request);
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
      Endpoint.SET_ACCOUNT_INFO,
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

    await expect(updateEmailPassword(auth, request)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The email address is badly formatted. (auth/invalid-email).'
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});
