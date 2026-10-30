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

import {
  AppCheckTokenListener,
  AppCheckTokenResult
} from '@firebase/app-check-interop-types';
import { FirebaseAuthTokenData } from '@firebase/auth-interop-types';
import { vi } from 'vitest';

import { TokenOptions } from '../src/core/tokenProviders/AbstractTokenProvider';
import { AppCheckTokenProvider } from '../src/core/tokenProviders/AppCheckTokenProvider';
import {
  AuthTokenListener,
  FirebaseAuthTokenProvider
} from '../src/core/tokenProviders/FirebaseAuthTokenProvider';

/**
 * Lightweight mock implementation of `FirebaseAuthTokenProvider` for tests.
 */
export class MockAuthProvider implements FirebaseAuthTokenProvider {
  readonly listeners = new Set<AuthTokenListener>();

  getToken = vi.fn(
    async (options?: TokenOptions): Promise<FirebaseAuthTokenData | null> => {
      const token = options?.forceRefresh ? this.refreshedToken : this.token;
      return token ? { accessToken: token } : null;
    }
  );

  addTokenChangeListener = vi.fn((listener: AuthTokenListener): void => {
    this.listeners.add(listener);
  });

  removeTokenChangeListener = vi.fn((listener: AuthTokenListener): void => {
    this.listeners.delete(listener);
  });

  terminate = vi.fn((): void => {
    this.listeners.clear();
  });

  getAuth = (): undefined => undefined;

  constructor(
    public token: string | null = 'initial-auth-token',
    public refreshedToken: string | null = 'refreshed-auth-token'
  ) {}

  emitTokenChange(token: string | null): void {
    this.token = token;
    for (const listener of this.listeners) {
      listener(token);
    }
  }
}

/**
 * Lightweight mock implementation of `AppCheckTokenProvider` for tests.
 */
export class MockAppCheckProvider implements AppCheckTokenProvider {
  readonly listeners = new Set<AppCheckTokenListener>();

  getToken = vi.fn(
    async (_options?: TokenOptions): Promise<AppCheckTokenResult | null> => {
      return this.token !== null ? { token: this.token } : null;
    }
  );

  addTokenChangeListener = vi.fn((listener: AppCheckTokenListener): void => {
    this.listeners.add(listener);
  });

  removeTokenChangeListener = vi.fn((listener: AppCheckTokenListener): void => {
    this.listeners.delete(listener);
  });

  terminate = vi.fn((): void => {
    this.listeners.clear();
  });

  constructor(public token: string | null) {}

  emitTokenChange(result: AppCheckTokenResult): void {
    for (const listener of this.listeners) {
      listener(result);
    }
  }
}
