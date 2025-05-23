/**
 * @license
 * Copyright 2025 Google LLC
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

import { mockRegionalEndpointWithParent } from '../../../test/helpers/api/helper';
import {
  regionalTestAuth,
  testAuth,
  TestAuth
} from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { HttpHeader, RegionalEndpoint } from '../../api';
import { exchangeToken } from './exhange_token';
import { FirebaseError } from '@firebase/util';
import { ServerError } from '../../api/errors';

use(chaiAsPromised);

describe('core/strategies/exchangeToken', () => {
  let auth: TestAuth;
  let regionalAuth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    regionalAuth = await regionalTestAuth();
    mockFetch.setUp();
  });
  afterEach(mockFetch.tearDown);

  it('should return a valid access token for Regional Auth', async () => {
    const mock = mockRegionalEndpointWithParent(
      RegionalEndpoint.EXCHANGE_TOKEN,
      'projects/test-project-id/locations/us/tenants/tenant-1/idpConfigs/idp-config',
      { accessToken: 'outbound-token', expiresIn: '1000' }
    );

    const accessToken = await exchangeToken(
      regionalAuth,
      'idp-config',
      'custom-token'
    );
    expect(accessToken).to.eq('outbound-token');
    expect(mock.calls[0].request).to.eql({
      parent:
        'projects/test-project-id/locations/us/tenants/tenant-1/idpConfigs/idp-config',
      token: 'custom-token'
    });
    expect(mock.calls[0].method).to.eq('POST');
    expect(mock.calls[0].headers!.get(HttpHeader.CONTENT_TYPE)).to.eq(
      'application/json'
    );
  });

  it('throws exception for default Auth', async () => {
    await expect(
      exchangeToken(auth, 'idp-config', 'custom-token')
    ).to.be.rejectedWith(
      FirebaseError,
      'Firebase: Operations not allowed for the auth object initialized. (auth/operation-not-allowed).'
    );
  });

  it('should handle errors', async () => {
    const mock = mockRegionalEndpointWithParent(
      RegionalEndpoint.EXCHANGE_TOKEN,
      'projects/test-project-id/locations/us/tenants/tenant-1/idpConfigs/idp-config',
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

    await expect(
      exchangeToken(regionalAuth, 'idp-config', 'custom-token')
    ).to.be.rejectedWith(FirebaseError, '(auth/invalid-custom-token).');
    expect(mock.calls[0].request).to.eql({
      parent:
        'projects/test-project-id/locations/us/tenants/tenant-1/idpConfigs/idp-config',
      token: 'custom-token'
    });
    expect(mock.calls[0].method).to.eq('POST');
    expect(mock.calls[0].headers!.get(HttpHeader.CONTENT_TYPE)).to.eq(
      'application/json'
    );
  });
});
