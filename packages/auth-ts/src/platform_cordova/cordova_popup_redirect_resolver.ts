/**
 * @license
 * Copyright 2019 Google Inc.
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

import { PopupRedirectResolver } from '../model/popup_redirect_resolver';
import { Auth } from '../../src';
import { AuthEventType } from '../model/auth_event';
import { UserCredential } from '../model/user_credential';
import { OAuthProvider } from '../core/providers/oauth';

export class CordovaPopupRedirectResolver implements PopupRedirectResolver {
  processPopup(
    auth: Auth,
    provider: OAuthProvider,
    authType: AuthEventType
  ): Promise<UserCredential> {
    throw new Error('not implemented');
  }

  processRedirect(
    auth: Auth,
    provider: OAuthProvider,
    authType: AuthEventType
  ): Promise<never> {
    throw new Error('not implemented');
  }
}

export const cordovaPopupRedirectResolver: CordovaPopupRedirectResolver = new CordovaPopupRedirectResolver();
