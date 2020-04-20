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

import { StsTokenManager } from '../src/core/user/token_manager';
import { UserImpl } from '../src/core/user/user_impl';
import { Auth } from '../src/model/auth';
import { User } from '../src/model/user';

export const TEST_HOST = 'localhost';
export const TEST_SCHEME = 'mock';
export const TEST_KEY = 'test-api-key';

export const mockAuth: Auth = {
  name: 'test-app',
  config: {
    apiKey: TEST_KEY,
    apiHost: TEST_HOST,
    apiScheme: TEST_SCHEME,
    sdkClientVersion: 'testSDK/0.0.0'
  }
};

export function testUser(uid: string, email?: string): User {
  return new UserImpl({
    uid,
    auth: mockAuth,
    stsTokenManager: new StsTokenManager(),
    email
  });
}
