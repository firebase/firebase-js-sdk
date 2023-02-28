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

import { Endpoint } from '../../../src/api';
import { TEST_HOST, TEST_KEY, TEST_SCHEME } from '../mock_auth';
import { mock, Route } from '../mock_fetch';

export function endpointUrl(endpoint: Endpoint): string {
  return `${TEST_SCHEME}://${TEST_HOST}${endpoint}?key=${TEST_KEY}`;
}

export function endpointUrlWithParams(
  endpoint: Endpoint,
  params: Record<string, any>
): string {
  let url = `${TEST_SCHEME}://${TEST_HOST}${endpoint}?key=${TEST_KEY}`;
  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      url += '&';
      url += key;
      url += '=';
      url += encodeURIComponent(params[key]);
    }
  }
  return url;
}

export function mockEndpoint(
  endpoint: Endpoint,
  response: object,
  status = 200
): Route {
  return mockEndpointWithParams(endpoint, {}, response, status);
}

export function mockEndpointWithParams(
  endpoint: Endpoint,
  params: Record<string, any>,
  response: object,
  status = 200
): Route {
  return mock(endpointUrlWithParams(endpoint, params), response, status);
}
