/**
 * @license
 * Copyright 2023 Google LLC
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

import { Endpoint, HttpHeader } from '../';
import { mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { _getPasswordPolicy } from './get_password_policy';
import { ServerError } from '../errors';
import { FirebaseError } from '@firebase/util';

use(chaiAsPromised);

describe('api/password_policy/getPasswordPolicy', () => {
  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should GET to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.GET_PASSWORD_POLICY, {
      customStrengthOptions: {
        minPasswordLength: 6
      },
      allowedNonAlphanumericCharacters: ['!'],
      schemaVersion: 1
    });

    const response = await _getPasswordPolicy(auth);
    expect(response.customStrengthOptions.minPasswordLength).to.eql(6);
    expect(response.allowedNonAlphanumericCharacters).to.eql(['!']);
    expect(response.schemaVersion).to.eql(1);
    expect(mock.calls[0].method).to.eq('GET');
    expect(mock.calls[0].headers!.get(HttpHeader.X_CLIENT_VERSION)).to.eq(
      'testSDK/0.0.0'
    );
  });

  it('should handle errors', async () => {
    mockEndpoint(
      Endpoint.GET_PASSWORD_POLICY,
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

    await expect(_getPasswordPolicy(auth)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The specified provider ID is invalid. (auth/invalid-provider-id).'
    );
  });
});
