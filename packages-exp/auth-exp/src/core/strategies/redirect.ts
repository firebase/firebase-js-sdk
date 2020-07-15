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
import { AuthEvent, AuthEventType, PopupRedirectResolver } from '../../model/popup_redirect';
import { User, UserCredential } from '../../model/user';
import { _assertLinkedStatus } from '../user/link_unlink';
import { _generateEventId } from '../util/event_id';
import { _getInstance } from '../util/instantiator';
import { AbstractPopupRedirectOperation } from './abstract_popup_redirect_operation';

export async function signInWithRedirect(
  authExtern: externs.Auth,
  provider: externs.AuthProvider,
  resolverExtern: externs.PopupRedirectResolver
): Promise<never> {
  const auth = authExtern as Auth;
  const resolver: PopupRedirectResolver = _getInstance(resolverExtern);

  return resolver._openRedirect(auth, provider, AuthEventType.SIGN_IN_VIA_REDIRECT);
}

export async function reauthenticateWithRedirect(
  userExtern: externs.User,
  provider: externs.AuthProvider,
  resolverExtern: externs.PopupRedirectResolver
): Promise<never> {
  const user = userExtern as User;
  const resolver: PopupRedirectResolver = _getInstance(resolverExtern);

  const eventId = _generateEventId(`${user.uid}:::`);
  user._redirectEventId = eventId;
  await user.auth._setRedirectUser(user);

  return resolver._openRedirect(user.auth, provider, AuthEventType.REAUTH_VIA_REDIRECT, eventId);
}

export async function linkWithRedirect(
  userExtern: externs.User,
  provider: externs.AuthProvider,
  resolverExtern: externs.PopupRedirectResolver
): Promise<never> {
  const user = userExtern as User;
  const resolver: PopupRedirectResolver = _getInstance(resolverExtern);

  await _assertLinkedStatus(false, user, provider.providerId);

  const eventId = _generateEventId(`${user.uid}:::`);
  user._redirectEventId = eventId;
  await user.auth._setRedirectUser(user);

  return resolver._openRedirect(user.auth, provider, AuthEventType.LINK_VIA_REDIRECT, eventId);
}

export async function getRedirectResult(authExtern: externs.Auth, resolverExtern: externs.PopupRedirectResolver): Promise<UserCredential> {
  const auth = authExtern as Auth;
  const resolver: PopupRedirectResolver = _getInstance(resolverExtern);
  const action = new RedirectAction(auth, resolver);
  return action.execute();
}


// We only get one redirect outcome for any one auth, so just store it
// in here.
const redirectOutcomeMap: Map<Auth, Promise<UserCredential>> = new Map();

class RedirectAction extends AbstractPopupRedirectOperation {
  eventId = null;

  constructor(auth: Auth, resolver: PopupRedirectResolver) {
    super(auth, [
      AuthEventType.SIGN_IN_VIA_REDIRECT,
      AuthEventType.LINK_VIA_REDIRECT,
      AuthEventType.REAUTH_VIA_REDIRECT,
    ],
    resolver);
  }

  /**
   * Override the execute function; if we already have a redirect result, then
   * just return it.
   */
  async execute(): Promise<UserCredential> {
    let readyOutcome = redirectOutcomeMap.get(this.auth);
    if (!readyOutcome) {
      readyOutcome = super.execute();
      redirectOutcomeMap.set(this.auth, readyOutcome);
    }

    return readyOutcome;
  }

  async onAuthEvent(event: AuthEvent): Promise<void> {
    if (event.type === AuthEventType.SIGN_IN_VIA_REDIRECT) {
      return super.onAuthEvent(event);
    }

    if (event.eventId) {
      const user = this.auth._redirectUserForId(event.eventId);
      // TODO(samgho): What if user is null?
      if (user) {
        this.user = user;
        return super.onAuthEvent(event);
      }
    }
  }

  async onExecution(): Promise<void> {
  }

  cleanUp(): void {
    
  }
}