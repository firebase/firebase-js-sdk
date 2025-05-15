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
import chaiAsPromised from 'chai-as-promised';

import {
  regionalTestAuth,
  testAuth,
  TestAuth
} from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { mockRegionalEndpointWithParent } from '../../../test/helpers/api/helper';
import { exchangeToken } from './exchange_token';
import { HttpHeader, RegionalEndpoint } from '..';
import { FirebaseError } from '@firebase/util';
import { ServerError } from '../errors';

use(chaiAsPromised);

describe('api/authentication/exchange_token', () => {
  let auth: TestAuth;
  let regionalAuth: TestAuth;
  const request = {
    parent: 'test-parent',
    token: 'custom-token'
  };

  beforeEach(async () => {
    auth = await testAuth();
    regionalAuth = await regionalTestAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('returns accesss token for Regional Auth', async () => {
    const mock = mockRegionalEndpointWithParent(
      RegionalEndpoint.EXCHANGE_TOKEN,
      'test-parent',
      { accessToken: 'outbound-token', expiresIn: '1000' }
    );

    const response = await exchangeToken(regionalAuth, request);
    expect(response.accessToken).equal('outbound-token');
    expect(response.expiresIn).equal('1000');
    expect(mock.calls[0].request).to.eql({
      parent: 'test-parent',
      token: 'custom-token'
    });
    expect(mock.calls[0].method).to.eq('POST');
    expect(mock.calls[0].headers!.get(HttpHeader.CONTENT_TYPE)).to.eq(
      'application/json'
    );
  });

  it('throws exception for default Auth', async () => {
    await expect(exchangeToken(auth, request)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: Operations not allowed for the auth object initialized. (auth/operation-not-allowed).'
    );
  });

  it('should handle errors', async () => {
    const mock = mockRegionalEndpointWithParent(
      RegionalEndpoint.EXCHANGE_TOKEN,
      'test-parent',
      {
        error: {
          code: 400,
          message: ServerError.INVALID_CUSTOM_TOKEN,
          errors: [
            {
              message: ServerError.INVALID_CUSTOM_TOKEN
            }
          ]
        }
      },
      400
    );

    await expect(exchangeToken(regionalAuth, request)).to.be.rejectedWith(
      FirebaseError,
      '(auth/invalid-custom-token).'
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});
