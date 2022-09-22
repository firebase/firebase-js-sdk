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
import { FirebaseAuthInternal } from '@firebase/auth-interop-types';

import { AuthInternal } from '../../model/auth';
import { UserInternal } from '../../model/user';
import { _assert } from '../util/assert';
import { AuthErrorCode } from '../errors';

interface TokenListener {
  (tok: string | null): unknown;
}

export class AuthInterop implements FirebaseAuthInternal {
  private readonly internalListeners: Map<TokenListener, Unsubscribe> =
    new Map();

  constructor(private readonly auth: AuthInternal) {}

  getUid(): string | null {
    this.assertAuthConfigured();
    return this.auth.currentUser?.uid || null;
  }

  async getToken(
    forceRefresh?: boolean
  ): Promise<{ accessToken: string } | null> {
    this.assertAuthConfigured();
    await this.auth._initializationPromise;
    if (!this.auth.currentUser) {
      return null;
    }

    const accessToken = await this.auth.currentUser.getIdToken(forceRefresh);
    return { accessToken };
  }

  addAuthTokenListener(listener: TokenListener): void {
    this.assertAuthConfigured();
    if (this.internalListeners.has(listener)) {
      return;
    }

    const unsubscribe = this.auth.onIdTokenChanged(user => {
      listener(
        (user as UserInternal | null)?.stsTokenManager.accessToken || null
      );
    });
    this.internalListeners.set(listener, unsubscribe);
    this.updateProactiveRefresh();
  }

  removeAuthTokenListener(listener: TokenListener): void {
    this.assertAuthConfigured();
    const unsubscribe = this.internalListeners.get(listener);
    if (!unsubscribe) {
      return;
    }

    this.internalListeners.delete(listener);
    unsubscribe();
    this.updateProactiveRefresh();
  }

  private assertAuthConfigured(): void {
    _assert(
      this.auth._initializationPromise,
      AuthErrorCode.DEPENDENT_SDK_INIT_BEFORE_AUTH
    );
  }

  private updateProactiveRefresh(): void {
    if (this.internalListeners.size > 0) {
      this.auth._startProactiveRefresh();
    } else {
      this.auth._stopProactiveRefresh();
    }
  }
}
