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

import { Auth } from '../../src/model/auth';
import { Endpoint } from '../../src/api';
import { mock, Route } from '../mock_fetch';

const TEST_HOST = 'localhost';
const TEST_SCHEME = 'mock';
const TEST_KEY = 'test-api-key';

export const mockAuth: Auth = {
  name: 'test-app',
  config: {
    apiKey: 'test-api-key',
    apiHost: TEST_HOST,
    apiScheme: TEST_SCHEME
  }
};

export function mockEndpoint(
  endpoint: Endpoint,
  response: object,
  status = 200
): Route {
  return mock(
    `${TEST_SCHEME}://${TEST_HOST}${endpoint}?key=${TEST_KEY}`,
    response,
    status
  );
}
