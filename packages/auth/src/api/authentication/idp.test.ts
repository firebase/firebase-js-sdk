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
import { signInWithIdp } from './idp';
describe('api/authentication/signInWithIdp', () => {
  const request = {
    returnSecureToken: true,
    requestUri: 'request-uri'
  };

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.SIGN_IN_WITH_IDP, {
      displayName: 'my-name',
      idToken: 'id-token'
    });

    auth.tenantId = 'tenant-id';
    const response = await signInWithIdp(auth, request);
    expect(response.displayName).toBe('my-name');
    expect(response.idToken).toBe('id-token');
    expect(mock.calls[0].request).toEqual({
      ...request,
      tenantId: 'tenant-id'
    });
    expect(mock.calls[0].method).toBe('POST');
    expect(mock.calls[0].headers!.get(HttpHeader.CONTENT_TYPE)).toBe(
      'application/json'
    );
    expect(mock.calls[0].headers!.get(HttpHeader.X_CLIENT_VERSION)).toBe(
      'testSDK/0.0.0'
    );
  });

  it('should handle errors', async () => {
    const mock = mockEndpoint(
      Endpoint.SIGN_IN_WITH_IDP,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_IDP_RESPONSE,
          errors: [
            {
              message: ServerError.INVALID_IDP_RESPONSE
            }
          ]
        }
      },
      400
    );

    await expect(signInWithIdp(auth, request)).rejects.toThrow(
      FirebaseError,
      'Firebase: The supplied auth credential is incorrect, malformed or has expired. (auth/invalid-credential).'
    );
    expect(mock.calls[0].request).toEqual(request);
  });
  it('should handle user disabled errors and propagate email info', async () => {
    const response = {
      email: 'test123@gmail.com',
      error: {
        code: 400,
        message: ServerError.USER_DISABLED,
        errors: [
          {
            message: ServerError.USER_DISABLED
          }
        ]
      }
    };

    const mock = mockEndpoint(Endpoint.SIGN_IN_WITH_IDP, response, 400);

    let error: any;
    try {
      await signInWithIdp(auth, request);
      expect.unreachable();
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(FirebaseError);
    expect(error.code).toBe('auth/user-disabled');
    expect(error.customData).toEqual({
      appName: 'test-app',
      _tokenResponse: response,
      email: 'test123@gmail.com'
    });

    expect(mock.calls[0].request).toEqual(request);
  });
});
