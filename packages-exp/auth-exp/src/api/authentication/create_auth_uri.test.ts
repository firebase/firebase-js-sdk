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
import { createAuthUri } from './create_auth_uri';

use(chaiAsPromised);

describe('api/authentication/createAuthUri', () => {
  const request = {
    identifier: 'my-id',
    continueUri: 'example.com/redirectUri'
  };

  let auth: Auth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.CREATE_AUTH_URI, {
      signinMethods: ['email']
    });

    const response = await createAuthUri(auth, request);
    expect(response.signinMethods).to.include('email');
    expect(mock.calls[0].request).to.eql(request);
    expect(mock.calls[0].method).to.eq('POST');
    expect(mock.calls[0].headers).to.eql({
      'Content-Type': 'application/json',
      'X-Client-Version': 'testSDK/0.0.0'
    });
  });

  it('should handle errors', async () => {
    const mock = mockEndpoint(
      Endpoint.CREATE_AUTH_URI,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_PROVIDER_ID,
          errors: [
            {
              message: ServerError.INVALID_PROVIDER_ID
            }
          ]
        }
      },
      400
    );

    await expect(createAuthUri(auth, request)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The specified provider ID is invalid. (auth/invalid-provider-id).'
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});
