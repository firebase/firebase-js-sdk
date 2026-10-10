/**
 * @license
 * Copyright 2026 Google LLC
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

import { Endpoint, HttpHeader } from '../';
import { mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { _getPasswordPolicy } from './get_password_policy';
import { ServerError } from '../errors';
import { FirebaseError } from '@firebase/util';
describe('api/password_policy/getPasswordPolicy', () => {
  const TEST_MIN_PASSWORD_LENGTH = 6;
  const TEST_ALLOWED_NON_ALPHANUMERIC_CHARS = ['!'];
  const TEST_SCHEMA_VERSION = 1;

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should GET to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.GET_PASSWORD_POLICY, {
      customStrengthOptions: {
        minPasswordLength: TEST_MIN_PASSWORD_LENGTH
      },
      allowedNonAlphanumericCharacters: TEST_ALLOWED_NON_ALPHANUMERIC_CHARS,
      schemaVersion: TEST_SCHEMA_VERSION
    });

    const response = await _getPasswordPolicy(auth);
    expect(response.customStrengthOptions.minPasswordLength).toEqual(
      TEST_MIN_PASSWORD_LENGTH
    );
    expect(response.allowedNonAlphanumericCharacters).toEqual(
      TEST_ALLOWED_NON_ALPHANUMERIC_CHARS
    );
    expect(response.schemaVersion).toEqual(TEST_SCHEMA_VERSION);
    expect(mock.calls[0].method).toBe('GET');
    expect(mock.calls[0].headers!.get(HttpHeader.X_CLIENT_VERSION)).toBe(
      'testSDK/0.0.0'
    );
  });

  it('should handle errors', async () => {
    mockEndpoint(
      Endpoint.GET_PASSWORD_POLICY,
      {
        error: {
          code: 400,
          message: ServerError.TOO_MANY_ATTEMPTS_TRY_LATER,
          errors: [
            {
              message: ServerError.TOO_MANY_ATTEMPTS_TRY_LATER
            }
          ]
        }
      },
      400
    );

    await expect(_getPasswordPolicy(auth)).rejects.toThrow(
      FirebaseError,
      'Firebase: We have blocked all requests from this device due to unusual activity. Try again later. (auth/too-many-requests).'
    );
  });
});
