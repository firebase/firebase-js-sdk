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

import { FirebaseError } from '@firebase/util';

import { Endpoint, HttpHeader } from '../';
import { mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { ServerError } from '../errors';
import { _getProjectConfig } from './get_project_config';
describe('api/project_config/getProjectConfig', () => {
  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.GET_PROJECT_CONFIG, {
      authorizedDomains: ['google.com']
    });

    const response = await _getProjectConfig(auth);
    expect(response.authorizedDomains).toEqual(['google.com']);
    expect(mock.calls[0].method).toBe('GET');
    expect(mock.calls[0].headers!.get(HttpHeader.X_CLIENT_VERSION)).toBe(
      'testSDK/0.0.0'
    );
  });

  it('should handle errors', async () => {
    mockEndpoint(
      Endpoint.GET_PROJECT_CONFIG,
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

    await expect(_getProjectConfig(auth)).rejects.toThrow(
      FirebaseError,
      'Firebase: The specified provider ID is invalid. (auth/invalid-provider-id).'
    );
  });
});
