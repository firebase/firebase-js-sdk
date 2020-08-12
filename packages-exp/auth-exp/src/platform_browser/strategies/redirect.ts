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

import { _castAuth } from '../../core/auth/auth_impl';
import { _assertLinkedStatus } from '../../core/user/link_unlink';
import { _generateEventId } from '../../core/util/event_id';
import { _getInstance } from '../../core/util/instantiator';
import { Auth } from '../../model/auth';
import { AuthEvent, AuthEventType, PopupRedirectResolver } from '../../model/popup_redirect';
import { User, UserCredential } from '../../model/user';
import { AbstractPopupRedirectOperation } from './abstract_popup_redirect_operation';

// TODO: Check that the providers are instance of OAuthProvider
// TODO: (Cordova) check unloadsOnRedirect

export async function signInWithRedirect(
  auth: externs.Auth,
  provider: externs.AuthProvider,
  resolverExtern: externs.PopupRedirectResolver
): Promise<never> {
  const resolver: PopupRedirectResolver = _getInstance(resolverExtern);

  return resolver._openRedirect(
    auth,
    provider,
    AuthEventType.SIGN_IN_VIA_REDIRECT
  );
}

export async function reauthenticateWithRedirect(
  userExtern: externs.User,
  provider: externs.AuthProvider,
  resolverExtern: externs.PopupRedirectResolver
): Promise<never> {
  const user = userExtern as User;
  const resolver: PopupRedirectResolver = _getInstance(resolverExtern);

  const eventId = await prepareUserForRedirect(user.auth, user);
  return resolver._openRedirect(
    user.auth,
    provider,
    AuthEventType.REAUTH_VIA_REDIRECT,
    eventId
  );
}

export async function linkWithRedirect(
  userExtern: externs.User,
  provider: externs.AuthProvider,
  resolverExtern: externs.PopupRedirectResolver
): Promise<never> {
  const user = userExtern as User;
  const resolver: PopupRedirectResolver = _getInstance(resolverExtern);

  await _assertLinkedStatus(false, user, provider.providerId);
  const eventId = await prepareUserForRedirect(user.auth, user);
  return resolver._openRedirect(
    user.auth,
    provider,
    AuthEventType.LINK_VIA_REDIRECT,
    eventId
  );
}

export async function getRedirectResult(
  authExtern: externs.Auth,
  resolverExtern: externs.PopupRedirectResolver
): Promise<externs.UserCredential | null> {
  const auth = _castAuth(authExtern);
  const resolver: PopupRedirectResolver = _getInstance(resolverExtern);
  const action = new RedirectAction(auth, resolver);
  const result = await action.execute();

  if (result) {
    delete result.user._redirectEventId;
    await auth._persistUserIfCurrent(result.user as User);
    await auth._setRedirectUser(null, resolverExtern);
  }

  return result;
}

async function prepareUserForRedirect(auth: Auth, user: User): Promise<string> {
  const eventId = _generateEventId(`${user.uid}:::`);
  user._redirectEventId = eventId;
  await user.auth._setRedirectUser(user);
  await auth._persistUserIfCurrent(user);
  return eventId;
}

// We only get one redirect outcome for any one auth, so just store it
// in here.
const redirectOutcomeMap: Map<
  string,
  () => Promise<UserCredential | null>
> = new Map();

class RedirectAction extends AbstractPopupRedirectOperation {
  eventId = null;

  constructor(auth: Auth, resolver: PopupRedirectResolver) {
    super(
      auth,
      [
        AuthEventType.SIGN_IN_VIA_REDIRECT,
        AuthEventType.LINK_VIA_REDIRECT,
        AuthEventType.REAUTH_VIA_REDIRECT,
        AuthEventType.UNKNOWN
      ],
      resolver
    );
  }

  /**
   * Override the execute function; if we already have a redirect result, then
   * just return it.
   */
  async execute(): Promise<UserCredential | null> {
    let readyOutcome = redirectOutcomeMap.get(this.auth._key());
    if (!readyOutcome) {
      try {
        const result = await super.execute();
        readyOutcome = () => Promise.resolve(result);
      } catch (e) {
        readyOutcome = () => Promise.reject(e);
      }

      redirectOutcomeMap.set(this.auth._key(), readyOutcome);
    }

    return readyOutcome();
  }

  async onAuthEvent(event: AuthEvent): Promise<void> {
    if (event.type === AuthEventType.SIGN_IN_VIA_REDIRECT) {
      return super.onAuthEvent(event);
    } else if (event.type === AuthEventType.UNKNOWN) {
      // This is a sentinel value indicating there's no pending redirect
      this.resolve(null);
      return;
    }

    if (event.eventId) {
      const user = await this.auth._redirectUserForId(event.eventId);
      if (user) {
        this.user = user;
        return super.onAuthEvent(event);
      } else {
        this.resolve(null);
      }
    }
  }

  async onExecution(): Promise<void> {}

  cleanUp(): void {}
}

export function _clearOutcomes(): void {
  redirectOutcomeMap.clear();
}
