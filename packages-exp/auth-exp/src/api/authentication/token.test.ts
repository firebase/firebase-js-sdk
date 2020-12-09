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

import { FirebaseError, querystringDecode } from '@firebase/util';

import { HttpHeader } from '../';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as fetch from '../../../test/helpers/mock_fetch';
import { ServerError } from '../errors';
import { Endpoint, requestStsToken } from './token';

use(chaiAsPromised);

describe('requestStsToken', () => {
  let auth: TestAuth;
  let endpoint: string;

  beforeEach(async () => {
    auth = await testAuth();
    const { apiKey, tokenApiHost, apiScheme } = auth.config;
    endpoint = `${apiScheme}://${tokenApiHost}${Endpoint.TOKEN}?key=${apiKey}`;
    fetch.setUp();
  });

  afterEach(fetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = fetch.mock(endpoint, {
      'access_token': 'new-access-token',
      'expires_in': '3600',
      'refresh_token': 'new-refresh-token'
    });

    const response = await requestStsToken(auth, 'old-refresh-token');
    expect(response.accessToken).to.eq('new-access-token');
    expect(response.expiresIn).to.eq('3600');
    expect(response.refreshToken).to.eq('new-refresh-token');
    const request = querystringDecode(`?${mock.calls[0].request}`);
    expect(request).to.eql({
      'grant_type': 'refresh_token',
      'refresh_token': 'old-refresh-token'
    });
    expect(mock.calls[0].method).to.eq('POST');
    expect(mock.calls[0].headers!.get(HttpHeader.CONTENT_TYPE)).to.eq(
      'application/x-www-form-urlencoded'
    );
    expect(mock.calls[0].headers!.get(HttpHeader.X_CLIENT_VERSION)).to.eq(
      'testSDK/0.0.0'
    );
  });

  it('should handle errors', async () => {
    const mock = fetch.mock(
      endpoint,
      {
        error: {
          code: 400,
          message: ServerError.TOKEN_EXPIRED,
          errors: [
            {
              message: ServerError.TOKEN_EXPIRED
            }
          ]
        }
      },
      400
    );

    await expect(requestStsToken(auth, 'old-token')).to.be.rejectedWith(
      FirebaseError,
      "Firebase: The user's credential is no longer valid. The user must sign in again. (auth/user-token-expired)"
    );
    const request = querystringDecode(`?${mock.calls[0].request}`);
    expect(request).to.eql({
      'grant_type': 'refresh_token',
      'refresh_token': 'old-token'
    });
  });
});
