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
import { User } from '../model/user';
import { AuthPopup } from './util/popup';
import { PopupResultManager } from './strategies/popup';

export abstract class AbstractPopupRedirectResolver
  implements PopupRedirectResolver {
  private readonly redirectManager = new RedirectManager();
  private readonly popupManager = new PopupResultManager();
  private auth!: Auth;

  abstract openPopup(
    auth: Auth,
    provider: AuthProvider,
    authType: AuthEventType,
    eventId?: string
  ): Promise<AuthPopup>;

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
        case AuthEventType.UNKNOWN:
        case AuthEventType.VERIFY_APP:
          // TODO: These.
          return true;
        case AuthEventType.SIGN_IN_VIA_REDIRECT:
          isRedirect = true;
        // Fallthrough
        case AuthEventType.SIGN_IN_VIA_POPUP:
          cred = await this.execIdpTask(event, idp.signIn);
          break;
        case AuthEventType.REAUTH_VIA_REDIRECT:
          isRedirect = true;
        // Fallthrough
        case AuthEventType.REAUTH_VIA_POPUP: {
          const user = this.userForEvent(event.eventId!);
          cred = await this.execIdpTask(event, idp.reauth, user);
          break;
        }
        case AuthEventType.LINK_VIA_REDIRECT:
          isRedirect = true;
        // Fallthrough
        case AuthEventType.LINK_VIA_POPUP: {
          const user = this.userForEvent(event.eventId!);
          cred = await this.execIdpTask(event, idp.link, user);
          break;
        }
      }
      if (isRedirect) {
        this.redirectManager.broadcastRedirectResult(cred);
      } else {
        this.popupManager.broadcastPopupResult(cred);
      }
    } catch (e) {
      if (isRedirect) {
        this.redirectManager.broadcastRedirectResult(null, e);
      } else {
        this.popupManager.broadcastPopupResult(null, e);
      }
    }

    // TODO: There actually are cases where we want to return false.
    // The legacy SDK just errors.
    return true;
  }

  processPopup(
    auth: Auth,
    provider: AuthProvider,
    authType: AuthEventType,
    eventId?: string
  ): Promise<UserCredential | null> {
    // TODO: Fix the dirty hack
    this.auth = auth;
    return this.popupManager.getNewPendingPromise(async () => {
      if (!this.isInitialized()) {
        await this.initializeAndWait(auth);
      }

      return this.openPopup(auth, provider, authType, eventId);
    });
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

  private userForEvent(id: string): User | undefined {
    return this.auth
      .getPotentialRedirectUsers_()
      .find(u => u.redirectEventId_ === id);
  }

  private execIdpTask(
    event: AuthEvent,
    task: idp.IdpTask,
    user?: User
  ): Promise<UserCredential | null> {
    const { urlResponse, sessionId, postBody, tenantId } = event;
    const params: idp.IdpTaskParams = {
      requestUri: urlResponse!,
      sessionId: sessionId!,
      auth: this.auth,
      tenantId: tenantId || undefined,
      postBody: postBody || undefined,
      user
    };
    return task(params);
  }
}
