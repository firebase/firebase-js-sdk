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

import { Auth } from '../../model/auth';
import {
  AuthEventType,
  PopupRedirectResolver
} from '../../model/popup_redirect';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';
import { assert, debugAssert } from '../util/assert';
import { Delay } from '../util/delay';
import { _generateEventId } from '../util/event_id';
import { _getInstance } from '../util/instantiator';
import { AuthPopup } from '../util/popup';
import { AbstractPopupRedirectOperation } from './abstract_popup_redirect_operation';
import { _castAuth } from '../auth/auth_impl';
import { User } from '../../model/user';

// The event timeout is the same on mobile and desktop, no need for Delay.
export const _AUTH_EVENT_TIMEOUT = 2020;
export const _POLL_WINDOW_CLOSE_TIMEOUT = new Delay(2000, 10000);

export async function signInWithPopup(
  auth: externs.Auth,
  provider: externs.AuthProvider,
  resolverExtern: externs.PopupRedirectResolver
): Promise<externs.UserCredential> {
  const resolver: PopupRedirectResolver = _getInstance(resolverExtern);

  const action = new PopupOperation(
    _castAuth(auth),
    AuthEventType.SIGN_IN_VIA_POPUP,
    provider,
    resolver
  );
  return action.executeNotNull();
}

export async function reauthenticateWithPopup(
  userExtern: externs.User,
  provider: externs.AuthProvider,
  resolverExtern: externs.PopupRedirectResolver
): Promise<externs.UserCredential> {
  const user = userExtern as User;
  const resolver: PopupRedirectResolver = _getInstance(resolverExtern);

  const action = new PopupOperation(
    user.auth,
    AuthEventType.REAUTH_VIA_POPUP,
    provider,
    resolver,
    user
  );
  return action.executeNotNull();
}

export async function linkWithPopup(
  userExtern: externs.User,
  provider: externs.AuthProvider,
  resolverExtern: externs.PopupRedirectResolver
): Promise<externs.UserCredential> {
  const user = userExtern as User;
  const resolver: PopupRedirectResolver = _getInstance(resolverExtern);

  const action = new PopupOperation(
    user.auth,
    AuthEventType.LINK_VIA_POPUP,
    provider,
    resolver,
    user
  );
  return action.executeNotNull();
}

/**
 * Popup event manager. Handles the popup's entire lifecycle; listens to auth
 * events
 */
class PopupOperation extends AbstractPopupRedirectOperation {
  // Only one popup is ever shown at once. The lifecycle of the current popup
  // can be managed / cancelled by the constructor.
  private static currentPopupAction: PopupOperation | null = null;
  private authWindow: AuthPopup | null = null;
  private pollId: number | null = null;

  constructor(
    auth: Auth,
    filter: AuthEventType,
    private readonly provider: externs.AuthProvider,
    resolver: PopupRedirectResolver,
    user?: User
  ) {
    super(auth, filter, resolver, user);
    if (PopupOperation.currentPopupAction) {
      PopupOperation.currentPopupAction.cancel();
    }

    PopupOperation.currentPopupAction = this;
  }

  async executeNotNull(): Promise<externs.UserCredential> {
    const result = await this.execute();
    assert(result, this.auth.name);
    return result;
  }

  async onExecution(): Promise<void> {
    debugAssert(
      this.filter.length === 1,
      'Popup operations only handle one event'
    );
    const eventId = _generateEventId();
    this.authWindow = await this.resolver._openPopup(
      this.auth,
      this.provider,
      this.filter[0], // There's always one, see constructor
      eventId
    );
    this.authWindow.associatedEvent = eventId;

    // Handle user closure. Notice this does *not* use await
    this.pollUserCancellation(this.auth.name);
  }

  get eventId(): string | null {
    return this.authWindow?.associatedEvent || null;
  }

  cancel(): void {
    this.reject(
      AUTH_ERROR_FACTORY.create(AuthErrorCode.EXPIRED_POPUP_REQUEST, {
        appName: this.auth.name
      })
    );
  }

  cleanUp(): void {
    if (this.authWindow) {
      this.authWindow.close();
    }

    if (this.pollId) {
      window.clearTimeout(this.pollId);
    }

    this.authWindow = null;
    this.pollId = null;
    PopupOperation.currentPopupAction = null;
  }

  private pollUserCancellation(appName: string): void {
    const poll = (): void => {
      if (this.authWindow?.window?.closed) {
        // Make sure that there is sufficient time for whatever action to
        // complete. The window could have closed but the sign in network
        // call could still be in flight.
        this.pollId = window.setTimeout(() => {
          this.pollId = null;
          this.reject(
            AUTH_ERROR_FACTORY.create(AuthErrorCode.POPUP_CLOSED_BY_USER, {
              appName
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
