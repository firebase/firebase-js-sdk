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

import { Auth } from '../../src';
import { AuthProvider } from '../core/providers';
import { PopupRedirectResolver } from '../model/popup_redirect_resolver';
import { AuthEventType, AuthEvent } from '../model/auth_event';
import { UserCredential } from '../model/user_credential';
import { RedirectManager } from './strategies/redirect';
import * as idp from './strategies/idp';

export abstract class AbstractPopupRedirectResolver
  implements PopupRedirectResolver {
  private readonly redirectManager = new RedirectManager();
  private auth!: Auth;

  abstract processPopup(
    auth: Auth,
    provider: AuthProvider,
    authType: AuthEventType
  ): Promise<UserCredential>;

  abstract processRedirect(
    auth: Auth,
    provider: AuthProvider,
    authType: AuthEventType
  ): Promise<never>;

  abstract initializeAndWait(auth: Auth): Promise<void>;
  abstract isInitialized(): boolean;

  async onEvent(event: AuthEvent): Promise<boolean> {
    let cred: UserCredential | null = null;
    let isRedirect = false;
    try {
      switch (event.type) {
        case AuthEventType.SIGN_IN_VIA_REDIRECT:
          isRedirect = true;
        // Fallthrough
        case AuthEventType.SIGN_IN_VIA_POPUP:
          cred = await this.execIdpTask(event, idp.signIn);
          break;
      }
      if (isRedirect) {
        this.redirectManager.broadcastRedirectResult(cred);
      }
      return true;
    } catch (e) {
      if (isRedirect) {
        this.redirectManager.broadcastRedirectResult(null, e);
      }
      return false;
    }
  }

  getRedirectResult(auth: Auth): Promise<UserCredential | null> {
    // TODO: Fix this dirty hack
    this.auth = auth;
    return this.redirectManager.getRedirectPromiseOrInit(() => {
      if (!this.isInitialized()) {
        this.initializeAndWait(auth);
      }
    });
  }

  private execIdpTask(
    event: AuthEvent,
    task: idp.IdpTask
  ): Promise<UserCredential | null> {
    const { urlResponse, sessionId, postBody, tenantId } = event;

    return task(this.auth, urlResponse!, sessionId!, tenantId!, postBody!);
  }
}
