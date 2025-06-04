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

import { FirebaseApp } from '@firebase/app';
import { Provider } from '@firebase/component';
import { AppCheckTokenResult } from '@firebase/app-check-interop-types';
import { PopupRedirectResolver } from '../../src/model/public_types';
import { debugErrorMap } from '../../src';

import { AuthImpl } from '../../src/core/auth/auth_impl';
import { PersistedBlob } from '../../src/core/persistence';
import { InMemoryPersistence } from '../../src/core/persistence/in_memory';
import { StsTokenManager } from '../../src/core/user/token_manager';
import { UserImpl } from '../../src/core/user/user_impl';
import { AuthInternal } from '../../src/model/auth';
import { UserInternal } from '../../src/model/user';
import { ClientPlatform } from '../../src/core/util/version';

export const TEST_HOST = 'localhost';
export const TEST_TOKEN_HOST = 'localhost/token';
export const TEST_AUTH_DOMAIN = 'localhost';
export const TEST_SCHEME = 'mock';
export const TEST_KEY = 'test-api-key';

export interface TestAuth extends AuthImpl {
  persistenceLayer: MockPersistenceLayer;
}

const FAKE_APP: FirebaseApp = {
  name: 'test-app',
  options: {
    projectId: 'test-project-id'
  },
  automaticDataCollectionEnabled: false
};

export const FAKE_HEARTBEAT_CONTROLLER = {
  getHeartbeatsHeader: async () => ''
};

export const FAKE_HEARTBEAT_CONTROLLER_PROVIDER: Provider<'heartbeat'> = {
  getImmediate(): typeof FAKE_HEARTBEAT_CONTROLLER {
    return FAKE_HEARTBEAT_CONTROLLER;
  }
} as unknown as Provider<'heartbeat'>;

export const FAKE_APP_CHECK_CONTROLLER = {
  getToken: async () => {
    return { token: '' } as AppCheckTokenResult;
  }
};

export const FAKE_APP_CHECK_CONTROLLER_PROVIDER: Provider<'app-check-internal'> =
  {
    getImmediate(): typeof FAKE_APP_CHECK_CONTROLLER {
      return FAKE_APP_CHECK_CONTROLLER;
    }
  } as unknown as Provider<'app-check-internal'>;

export class MockPersistenceLayer extends InMemoryPersistence {
  lastObjectSet: PersistedBlob | null = null;

  _set(key: string, object: PersistedBlob): Promise<void> {
    this.lastObjectSet = object;
    return super._set(key, object);
  }

  _remove(key: string): Promise<void> {
    this.lastObjectSet = null;
    return super._remove(key);
  }
}

export async function testAuth(
  popupRedirectResolver?: PopupRedirectResolver,
  persistence = new MockPersistenceLayer(),
  skipAwaitOnInit?: boolean
): Promise<TestAuth> {
  const auth: TestAuth = new AuthImpl(
    FAKE_APP,
    FAKE_HEARTBEAT_CONTROLLER_PROVIDER,
    FAKE_APP_CHECK_CONTROLLER_PROVIDER,
    {
      apiKey: TEST_KEY,
      authDomain: TEST_AUTH_DOMAIN,
      apiHost: TEST_HOST,
      apiScheme: TEST_SCHEME,
      tokenApiHost: TEST_TOKEN_HOST,
      clientPlatform: ClientPlatform.BROWSER,
      sdkClientVersion: 'testSDK/0.0.0'
    }
  ) as TestAuth;
  auth._updateErrorMap(debugErrorMap);

  if (skipAwaitOnInit) {
    // This is used to verify scenarios where auth flows (like signInWithRedirect) are invoked before auth is fully initialized.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    auth._initializeWithPersistence([persistence], popupRedirectResolver);
  } else {
    await auth._initializeWithPersistence([persistence], popupRedirectResolver);
  }
  auth.persistenceLayer = persistence;
  auth.settings.appVerificationDisabledForTesting = true;
  return auth;
}

export async function regionalTestAuth(
  popupRedirectResolver?: PopupRedirectResolver,
  persistence = new MockPersistenceLayer(),
  skipAwaitOnInit?: boolean
): Promise<TestAuth> {
  const tenantConfig = { 'location': 'us', 'tenantId': 'tenant-1' };
  const auth: TestAuth = new AuthImpl(
    FAKE_APP,
    FAKE_HEARTBEAT_CONTROLLER_PROVIDER,
    FAKE_APP_CHECK_CONTROLLER_PROVIDER,
    {
      apiKey: TEST_KEY,
      authDomain: TEST_AUTH_DOMAIN,
      apiHost: TEST_HOST,
      apiScheme: TEST_SCHEME,
      tokenApiHost: TEST_TOKEN_HOST,
      clientPlatform: ClientPlatform.BROWSER,
      sdkClientVersion: 'testSDK/0.0.0'
    },
    tenantConfig
  ) as TestAuth;
  if (skipAwaitOnInit) {
    // This is used to verify scenarios where auth flows (like signInWithRedirect) are invoked before auth is fully initialized.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    auth._initializeWithPersistence([persistence], popupRedirectResolver);
  } else {
    await auth._initializeWithPersistence([persistence], popupRedirectResolver);
  }
  auth.persistenceLayer = persistence;
  auth.settings.appVerificationDisabledForTesting = true;
  return auth;
}

export function testUser(
  auth: AuthInternal,
  uid: string,
  email?: string,
  fakeTokens = false
): UserInternal {
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
    auth: auth as AuthInternal,
    stsTokenManager,
    email
  });
}
