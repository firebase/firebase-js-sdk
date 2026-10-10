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

import {
  Endpoint,
  HttpHeader,
  RecaptchaClientType,
  RecaptchaVersion
} from '../';
import {
  mockEndpoint,
  mockEndpointWithParams
} from '../../../test/helpers/api/helper';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { ServerError } from '../errors';
import { getRecaptchaParams, getRecaptchaConfig } from './recaptcha';
describe('api/authentication/getRecaptchaParams', () => {
  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should GET to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.GET_RECAPTCHA_PARAM, {
      recaptchaSiteKey: 'site-key'
    });

    const response = await getRecaptchaParams(auth);
    expect(response).toBe('site-key');
    expect(mock.calls[0].request).toBeUndefined();
    expect(mock.calls[0].method).toBe('GET');
    expect(mock.calls[0].headers!.get(HttpHeader.CONTENT_TYPE)).toBe(
      'application/json'
    );
    expect(mock.calls[0].headers!.get(HttpHeader.X_CLIENT_VERSION)).toBe(
      'testSDK/0.0.0'
    );
  });

  it('should handle errors', async () => {
    const mock = mockEndpoint(
      Endpoint.GET_RECAPTCHA_PARAM,
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

    await expect(getRecaptchaParams(auth)).rejects.toThrow(
      FirebaseError,
      'Firebase: We have blocked all requests from this device due to unusual activity. Try again later. (auth/too-many-requests).'
    );
    expect(mock.calls[0].request).toBeUndefined();
  });
});

describe('api/authentication/getRecaptchaConfig', () => {
  const request = {
    clientType: RecaptchaClientType.WEB,
    recaptchaVersion: RecaptchaVersion.ENTERPRISE
  };

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should GET to the correct endpoint', async () => {
    const mock = mockEndpointWithParams(
      Endpoint.GET_RECAPTCHA_CONFIG,
      request,
      {
        recaptchaKey: 'site-key'
      }
    );

    const response = await getRecaptchaConfig(auth, request);
    expect(response.recaptchaKey).toBe('site-key');
    expect(mock.calls[0].method).toBe('GET');
    expect(mock.calls[0].headers!.get(HttpHeader.CONTENT_TYPE)).toBe(
      'application/json'
    );
    expect(mock.calls[0].headers!.get(HttpHeader.X_CLIENT_VERSION)).toBe(
      'testSDK/0.0.0'
    );
  });

  it('should handle errors', async () => {
    mockEndpointWithParams(
      Endpoint.GET_RECAPTCHA_CONFIG,
      request,
      {
        error: {
          code: 400,
          message: ServerError.UNAUTHORIZED_DOMAIN
        }
      },
      400
    );

    await expect(getRecaptchaConfig(auth, request)).rejects.toThrow(
      FirebaseError,
      'auth/unauthorized-continue-uri'
    );
  });
});
