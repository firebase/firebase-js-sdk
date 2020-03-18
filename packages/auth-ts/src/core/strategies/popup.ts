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

import { Auth } from '../../model/auth';
import { AuthErrorCode, AUTH_ERROR_FACTORY } from '../errors';
import { AuthEventType } from '../../model/auth_event';
import { PopupRedirectResolver } from '../../model/popup_redirect_resolver';
import { OAuthProvider } from '../providers/oauth';
import { UserCredential } from '../../model/user_credential';
import { User } from '../../model/user';
import { generateEventId } from '../util/event_id';
import { reloadWithoutSaving } from '../account_management/reload';
import { AuthPopup } from '../util/popup';
import { Delay } from '../util/delay';

const AUTH_EVENT_TIMEOUT_ = new Delay(2000, 2000);
const WINDOW_CLOSE_TIMEOUT_ = new Delay(2000, 10000);

export async function signInWithPopup(
  auth: Auth,
  provider: OAuthProvider,
  resolver?: PopupRedirectResolver
): Promise<UserCredential | null> {
  resolver = resolver || auth.popupRedirectResolver;
  if (!resolver) {
    throw AUTH_ERROR_FACTORY.create(AuthErrorCode.OPERATION_NOT_SUPPORTED, {
      appName: auth.name
    });
  }

  return resolver.processPopup(auth, provider, AuthEventType.SIGN_IN_VIA_POPUP);
}

export async function reauthenticateWithPopup(
  auth: Auth,
  user: User,
  provider: OAuthProvider,
  resolver?: PopupRedirectResolver
): Promise<UserCredential | null> {
  resolver = resolver || auth.popupRedirectResolver;
  if (!resolver) {
    throw AUTH_ERROR_FACTORY.create(AuthErrorCode.OPERATION_NOT_SUPPORTED, {
      appName: auth.name
    });
  }

  const eventId = generateEventId(`${user.uid}:::`);
  user.redirectEventId_ = eventId;

  return resolver.processPopup(
    auth,
    provider,
    AuthEventType.REAUTH_VIA_POPUP,
    eventId
  );
}

export async function linkWithPopup(
  auth: Auth,
  user: User,
  provider: OAuthProvider,
  resolver?: PopupRedirectResolver
): Promise<UserCredential | null> {
  resolver = resolver || auth.popupRedirectResolver;
  if (!resolver) {
    throw AUTH_ERROR_FACTORY.create(AuthErrorCode.OPERATION_NOT_SUPPORTED, {
      appName: auth.name
    });
  }

  // First, make sure the user isn't already linked
  await reloadWithoutSaving(auth, user);
  if (user.providerData.find(p => p.providerId === provider.providerId)) {
    auth.updateCurrentUser(user);
    throw AUTH_ERROR_FACTORY.create(AuthErrorCode.PROVIDER_ALREADY_LINKED, {
      appName: auth.name
    });
  }

  const eventId = generateEventId(`${user.uid}:::`);
  user.redirectEventId_ = eventId;

  return resolver.processPopup(
    auth,
    provider,
    AuthEventType.LINK_VIA_POPUP,
    eventId
  );
}

interface PendingPromise {
  resolve: (cred: UserCredential | null) => void;
  reject: (error: Error) => void;
}

export class PopupResultManager {
  private pendingPromise: PendingPromise | null = null;
  private authWindow: AuthPopup | null = null;
  private userCancelledPromise: Promise<void> | null = null;
  private pollId: number | null = null;

  getNewPendingPromise(
    cb: () => Promise<AuthPopup>
  ): Promise<UserCredential | null> {
    if (this.pendingPromise) {
      // There was already a pending promise. Expire it.
      this.broadcastPopupResult(
        null,
        AUTH_ERROR_FACTORY.create(AuthErrorCode.EXPIRED_POPUP_REQUEST, {
          appName: 'TODO'
        })
      );
    }

    return new Promise<UserCredential | null>(async (resolve, reject) => {
      this.pendingPromise = { resolve, reject };
      this.authWindow = await cb();

      // Handle user closure. Notice this does *not* use await
      this.pollUserCancellation();
    });
  }

  broadcastPopupResult(cred: UserCredential | null, error?: Error) {
    if (this.authWindow) {
      this.authWindow.close();
    }

    if (this.pollId) {
      window.clearTimeout(this.pollId);
    }

    if (this.pendingPromise) {
      if (error) {
        this.pendingPromise.reject(error);
      } else {
        this.pendingPromise.resolve(cred);
      }
    }
  }

  private pollUserCancellation() {
    const poll = () => {
      if (this.authWindow?.window.closed) {
        this.pollId = window.setTimeout(() => {
          this.pollId = null;
          this.broadcastPopupResult(null, AUTH_ERROR_FACTORY.create(
            AuthErrorCode.POPUP_CLOSED_BY_USER, {
              appName: 'TODO',
            }
          ));
        }, AUTH_EVENT_TIMEOUT_.get())
      }

      this.pollId = window.setTimeout(poll, WINDOW_CLOSE_TIMEOUT_.get());
    };
    
    poll();
  }
}
