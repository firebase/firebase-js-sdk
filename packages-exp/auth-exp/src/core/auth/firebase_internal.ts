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

import { Unsubscribe } from '@firebase/util';

import { Auth } from '../../model/auth';
import { User } from '../../model/user';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'auth-internal-exp': AuthInternal;
  }
}

interface TokenListener {
  (tok: string | null): unknown;
}

export class AuthInternal {
  private readonly internalListeners: Map<
    TokenListener,
    Unsubscribe
  > = new Map();

  constructor(private readonly auth: Auth) {}

  getUid(): string | null {
    return this.auth.currentUser?.uid || null;
  }

  async getToken(
    forceRefresh?: boolean
  ): Promise<{ accessToken: string } | null> {
    await this.auth._initializationPromise;
    if (!this.auth.currentUser) {
      return null;
    }

    const accessToken = await this.auth.currentUser.getIdToken(forceRefresh);
    return { accessToken };
  }

  addAuthTokenListener(listener: TokenListener): void {
    if (this.internalListeners.has(listener)) {
      return;
    }

    const unsubscribe = this.auth.onIdTokenChanged(user => {
      listener((user as User|null)?.stsTokenManager.accessToken || null);
    });
    this.internalListeners.set(listener, unsubscribe);
    this.updateProactiveRefresh();
  }

  removeAuthTokenListener(listener: TokenListener): void {
    const unsubscribe = this.internalListeners.get(listener);
    if (!unsubscribe) {
      return;
    }

    this.internalListeners.delete(listener);
    unsubscribe();
    this.updateProactiveRefresh();
  }

  private updateProactiveRefresh(): void {
    if (this.internalListeners.size > 0) {
      this.auth._startProactiveRefresh();
    } else {
      this.auth._stopProactiveRefresh();
    }
  }
}
