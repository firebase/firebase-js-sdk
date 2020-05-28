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

import { AuthImpl } from '../src/core/auth/auth_impl';
import { PersistedBlob } from '../src/core/persistence';
import { InMemoryPersistence } from '../src/core/persistence/in_memory';
import { StsTokenManager } from '../src/core/user/token_manager';
import { UserImpl } from '../src/core/user/user_impl';
import { Auth } from '../src/model/auth';
import { User } from '../src/model/user';

export const TEST_HOST = 'localhost';
export const TEST_TOKEN_HOST = 'localhost/token';
export const TEST_AUTH_DOMAIN = 'localhost';
export const TEST_SCHEME = 'mock';
export const TEST_KEY = 'test-api-key';

export interface TestAuth extends AuthImpl {
  persistenceLayer: MockPersistenceLayer,
}

class MockPersistenceLayer extends InMemoryPersistence {
  lastObjectSet: PersistedBlob | null = null;

  set(key: string, object: PersistedBlob): Promise<void> {
    this.lastObjectSet = object;
    return super.set(key, object);
  }

  remove(key: string): Promise<void> {
    this.lastObjectSet = null;
    return super.remove(key);
  }
}

export async function testAuth(): Promise<TestAuth> {
  const persistence = new MockPersistenceLayer();
  const auth: TestAuth = new AuthImpl(
    'test-app',
  {
    apiKey: TEST_KEY,
    authDomain: TEST_AUTH_DOMAIN,
    apiHost: TEST_HOST,
    apiScheme: TEST_SCHEME,
    tokenApiHost: TEST_TOKEN_HOST,
    sdkClientVersion: 'testSDK/0.0.0'
  },
  ) as TestAuth;

  await auth._initializeWithPersistence([persistence]);
  auth.persistenceLayer = persistence;
  return auth;
}

export function testUser(
  auth: Auth | {},
  uid: string,
  email?: string,
  fakeTokens = false
): User {
  // Create a token manager that's valid off the bat to avoid refresh calls
  const stsTokenManager = new StsTokenManager();
  if (fakeTokens) {
    Object.assign<StsTokenManager, Partial<StsTokenManager>>(stsTokenManager, {
      expirationTime: Date.now() + 100_000,
      accessToken: 'access-token',
      refreshToken: 'refresh-token'
    });
  }

  return new UserImpl({
    uid,
    auth: auth as Auth,
    stsTokenManager,
    email
  });
}
