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

import * as exp from '@firebase/auth-exp/internal';
import { _isCordova, _isLikelyCordova } from './platform';

const _assert: typeof exp._assert = exp._assert;
const BROWSER_RESOLVER: exp.PopupRedirectResolverInternal = exp._getInstance(
  exp.browserPopupRedirectResolver
);
const CORDOVA_RESOLVER: exp.PopupRedirectResolverInternal = exp._getInstance(
  exp.cordovaPopupRedirectResolver
);

/** Platform-agnostic popup-redirect resolver */
export class CompatPopupRedirectResolver
  implements exp.PopupRedirectResolverInternal {
  private underlyingResolver: exp.PopupRedirectResolverInternal | null = null;
  _redirectPersistence = exp.browserSessionPersistence;

  _completeRedirectFn: (
    auth: exp.Auth,
    resolver: exp.PopupRedirectResolver,
    bypassAuthState: boolean
  ) => Promise<exp.UserCredential | null> = exp._getRedirectResult;

  async _initialize(auth: exp.AuthImpl): Promise<exp.EventManager> {
    await this.selectUnderlyingResolver();
    return this.assertedUnderlyingResolver._initialize(auth);
  }

  async _openPopup(
    auth: exp.AuthImpl,
    provider: exp.AuthProvider,
    authType: exp.AuthEventType,
    eventId?: string
  ): Promise<exp.AuthPopup> {
    await this.selectUnderlyingResolver();
    return this.assertedUnderlyingResolver._openPopup(
      auth,
      provider,
      authType,
      eventId
    );
  }

  async _openRedirect(
    auth: exp.AuthImpl,
    provider: exp.AuthProvider,
    authType: exp.AuthEventType,
    eventId?: string
  ): Promise<void> {
    await this.selectUnderlyingResolver();
    return this.assertedUnderlyingResolver._openRedirect(
      auth,
      provider,
      authType,
      eventId
    );
  }

  _isIframeWebStorageSupported(
    auth: exp.AuthImpl,
    cb: (support: boolean) => unknown
  ): void {
    this.assertedUnderlyingResolver._isIframeWebStorageSupported(auth, cb);
  }

  _originValidation(auth: exp.Auth): Promise<void> {
    return this.assertedUnderlyingResolver._originValidation(auth);
  }

  get _shouldInitProactively(): boolean {
    return _isLikelyCordova() || BROWSER_RESOLVER._shouldInitProactively;
  }

  private get assertedUnderlyingResolver(): exp.PopupRedirectResolverInternal {
    _assert(this.underlyingResolver, exp.AuthErrorCode.INTERNAL_ERROR);
    return this.underlyingResolver;
  }

  private async selectUnderlyingResolver(): Promise<void> {
    if (this.underlyingResolver) {
      return;
    }

    // We haven't yet determined whether or not we're in Cordova; go ahead
    // and determine that state now.
    const isCordova = await _isCordova();
    this.underlyingResolver = isCordova ? CORDOVA_RESOLVER : BROWSER_RESOLVER;
  }
}
