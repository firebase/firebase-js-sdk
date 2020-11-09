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

import { Endpoint, HttpHeader } from '../';
import { mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { ServerError } from '../errors';
import { updateProfile } from './profile';

use(chaiAsPromised);

describe('api/account_management/updateProfile', () => {
  const request = {
    idToken: 'my-token',
    email: 'test@foo.com',
    password: 'my-password',
    returnSecureToken: true
  };

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {
      displayName: 'my-name',
      email: 'test@foo.com'
    });

    const response = await updateProfile(auth, request);
    expect(response.displayName).to.eq('my-name');
    expect(mock.calls[0].request).to.eql(request);
    expect(mock.calls[0].method).to.eq('POST');
    expect(mock.calls[0].headers!.get(HttpHeader.CONTENT_TYPE)).to.eq(
      'application/json'
    );
    expect(mock.calls[0].headers!.get(HttpHeader.X_CLIENT_VERSION)).to.eq(
      'testSDK/0.0.0'
    );
  });

  it('should handle errors', async () => {
    const mock = mockEndpoint(
      Endpoint.SET_ACCOUNT_INFO,
      {
        error: {
          code: 400,
          message: ServerError.EMAIL_EXISTS,
          errors: [
            {
              message: ServerError.EMAIL_EXISTS
            }
          ]
        }
      },
      400
    );

    await expect(updateProfile(auth, request)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The email address is already in use by another account. (auth/email-already-in-use).'
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});
