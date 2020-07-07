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

import * as externs from '@firebase/auth-types-exp';
import { FirebaseError } from '@firebase/util';

import { Auth } from '../../model/auth';
import {
    AuthEvent, AuthEventConsumer, AuthEventType, EventManager, PopupRedirectResolver
} from '../../model/popup_redirect';
import { User, UserCredential } from '../../model/user';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';
import { Delay } from '../util/delay';
import { _generateEventId } from '../util/event_id';
import { AuthPopup } from '../util/popup';
import { _link, _reauth, _signIn, IdpTask, IdpTaskParams } from './idp';

// The event timeout is the same on mobile and desktop, no need for Delay.
export const _AUTH_EVENT_TIMEOUT = 2020;
export const _POLL_WINDOW_CLOSE_TIMEOUT = new Delay(2000, 10000);

interface PendingPromise {
  resolve: (cred: UserCredential) => void;
  reject: (error: Error) => void;
}

export async function signInWithPopup(authExtern: externs.Auth, provider: externs.AuthProvider, resolverExtern: externs.PopupRedirectResolver): Promise<UserCredential> {
  const auth = authExtern as Auth;
  const resolver = resolverExtern as PopupRedirectResolver;

  const action = new PopupAction(auth, AuthEventType.SIGN_IN_VIA_POPUP, _signIn, provider, resolver);
  const cred = await action.execute();

  await auth.updateCurrentUser(cred.user);
  return cred;
}

export async function reauthenticateWithPopup(userExtern: externs.User, provider: externs.AuthProvider, resolverExtern: externs.PopupRedirectResolver): Promise<UserCredential> {
  const user = userExtern as User;
  const resolver = resolverExtern as PopupRedirectResolver;

  const action = new PopupAction(user.auth, AuthEventType.REAUTH_VIA_POPUP, _reauth, provider, resolver, user);
  return action.execute();
}

export async function linkWithPopup(userExtern: externs.User, provider: externs.AuthProvider, resolverExtern: externs.PopupRedirectResolver): Promise<UserCredential> {
  const user = userExtern as User;
  const resolver = resolverExtern as PopupRedirectResolver;

  const action = new PopupAction(user.auth, AuthEventType.LINK_VIA_POPUP, _link, provider, resolver, user);
  return action.execute();
}

/**
 * Popup event manager. Handles the popup's entire lifecycle; listens to auth
 * events
 */
class PopupAction implements AuthEventConsumer {
  // Only one popup is ever shown at once. The lifecycle of the current popup
  // can be managed / cancelled by the constructor.
  private static currentPopupAction: PopupAction | null = null;
  private pendingPromise: PendingPromise | null = null;
  private authWindow: AuthPopup | null = null;
  private pollId: number | null = null;
  private eventManager: EventManager | null = null;

  constructor(
      private readonly auth: Auth,
      readonly filter: AuthEventType,
      private readonly idpTask: IdpTask,
      private readonly provider: externs.AuthProvider,
      private readonly resolver: PopupRedirectResolver,
      private readonly user?: User) {
    if (PopupAction.currentPopupAction) {
      PopupAction.currentPopupAction.cancel();
    }

    PopupAction.currentPopupAction = this;
  }

  execute(
  ): Promise<UserCredential> {
    return new Promise<UserCredential>(async (resolve, reject) => {
      this.pendingPromise = { resolve, reject };

      this.eventManager = await this.resolver._initialize(this.auth);
      const eventId = _generateEventId();
      this.authWindow = await this.resolver._openPopup(this.auth, this.provider, this.filter, eventId);
      this.authWindow.associatedEvent = eventId;

      this.eventManager.registerConsumer(this);

      // Handle user closure. Notice this does *not* use await
      this.pollUserCancellation(this.auth.name);
    });
  }

  isMatchingEvent(eventId: string | null): boolean {
    return !!eventId && this.authWindow?.associatedEvent === eventId;
  }

  async onAuthEvent(event: AuthEvent): Promise<void> {
    const { urlResponse, sessionId, postBody, tenantId, error } = event;
    if (error) {
      this.broadcastResult(null, error);
      return;
    }
    
    const params: IdpTaskParams = {
      auth: this.auth,
      requestUri: urlResponse!,
      sessionId: sessionId!,
      tenantId: tenantId || undefined,
      postBody: postBody || undefined,
      user: this.user,
    };

    try {
      this.broadcastResult(await this.idpTask(params));
    } catch (e) {
      this.broadcastResult(null, e);
    }
  }

  onError(error: FirebaseError): void {
    this.broadcastResult(null, error);
  }

  cancel(): void {
    if (this.pendingPromise) {
      // There was already a pending promise. Expire it.
      this.broadcastResult(
        null,
        AUTH_ERROR_FACTORY.create(AuthErrorCode.EXPIRED_POPUP_REQUEST, {
          appName: this.auth.name,
        })
      );
    }
  }

  private broadcastResult(cred: UserCredential | null, error?: Error): void {
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
        this.pendingPromise.resolve(cred!);
      }
    }

    this.cleanUp();
  }

  private cleanUp(): void {
    this.authWindow = null;
    this.pendingPromise = null;
    this.pollId = null;
    if (this.eventManager) {
      this.eventManager.unregisterConsumer(this);
    }
    PopupAction.currentPopupAction = null;
  }

  private pollUserCancellation(appName: string):void {
    const poll = (): void => {
      if (this.authWindow?.window?.closed) {
        // Make sure that there is sufficient time for whatever action to
        // complete. The window could have closed but the sign in network
        // call could still be in flight.
        this.pollId = window.setTimeout(() => {
          this.pollId = null;
          this.broadcastResult(
            null,
            AUTH_ERROR_FACTORY.create(AuthErrorCode.POPUP_CLOSED_BY_USER, {
              appName,
            })
          );
        }, _AUTH_EVENT_TIMEOUT);
        return;
      }

      this.pollId = window.setTimeout(poll, _POLL_WINDOW_CLOSE_TIMEOUT.get());
    };

    poll();
  }
}