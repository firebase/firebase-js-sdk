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

import { OAuthProvider } from '../../core';
import { _castAuth } from '../../core/auth/auth_impl';
import { AuthErrorCode } from '../../core/errors';
import { _assertLinkedStatus } from '../../core/user/link_unlink';
import { assert } from '../../core/util/assert';
import { _generateEventId } from '../../core/util/event_id';
import { _getInstance } from '../../core/util/instantiator';
import { Auth } from '../../model/auth';
import {
  AuthEvent,
  AuthEventType,
  PopupRedirectResolver
} from '../../model/popup_redirect';
import { User, UserCredential } from '../../model/user';
import { _withDefaultResolver } from '../popup_redirect';
import { AbstractPopupRedirectOperation } from './abstract_popup_redirect_operation';

/**
 * Authenticates a Firebase client using a full-page redirect flow.
 *
 * @remarks
 * To handle the results and errors for this operation, refer to {@link getRedirectResult}.
 *
 * @example
 * ```javascript
 * // Sign in using a redirect.
 * const provider = new FacebookAuthProvider();
 * // You can add additional scopes to the provider:
 * provider.addScope('user_birthday');
 * // Start a sign in process for an unauthenticated user.
 * await signInWithRedirect(auth, provider);
 * // This will trigger a full page redirect away from your app
 *
 * // After returning from the redirect when your app initializes you can obtain the result
 * const result = await getRedirectResult(auth);
 * if (result) {
 *   // This is the signed-in user
 *   const user = result.user;
 *   // This gives you a Facebook Access Token.
 *   const credential = provider.credentialFromResult(auth, result);
 *   const token = credential.accessToken;
 * }
 * // As this API can be used for sign-in, linking and reauthentication,
 * // check the operationType to determine what triggered this redirect
 * // operation.
 * const operationType = result.operationType;
 * ```
 *
 * @param auth - The Auth instance.
 * @param provider - The provider to authenticate. The provider has to be an {@link OAuthProvider}.
 * Non-OAuth providers like {@link EmailAuthProvider} will throw an error.
 * @param resolver - An instance of {@link @firebase/auth-types#PopupRedirectResolver}, optional
 * if already supplied to {@link initializeAuth} or provided by {@link getAuth}.
 *
 * @public
 */
export async function signInWithRedirect(
  auth: externs.Auth,
  provider: externs.AuthProvider,
  resolver?: externs.PopupRedirectResolver
): Promise<never> {
  const authInternal = _castAuth(auth);
  assert(provider instanceof OAuthProvider, AuthErrorCode.ARGUMENT_ERROR, {
    appName: auth.name
  });

  return _withDefaultResolver(authInternal, resolver)._openRedirect(
    authInternal,
    provider,
    AuthEventType.SIGN_IN_VIA_REDIRECT
  );
}

/**
 * Reauthenticates the current user with the specified {@link OAuthProvider} using a full-page redirect flow.
 *
 * @example
 * ```javascript
 * // Sign in using a redirect.
 * const provider = new FacebookAuthProvider();
 * const result = await signInWithRedirect(auth, provider);
 * // This will trigger a full page redirect away from your app
 *
 * // After returning from the redirect when your app initializes you can obtain the result
 * const result = await getRedirectResult(auth);
 * // Link using a redirect.
 * await linkWithRedirect(result.user, provider);
 * // This will again trigger a full page redirect away from your app
 *
 * // After returning from the redirect when your app initializes you can obtain the result
 * const result = await getRedirectResult(auth);
 * ```
 *
 * @param user - The user.
 * @param provider - The provider to authenticate. The provider has to be an {@link OAuthProvider}.
 * Non-OAuth providers like {@link EmailAuthProvider} will throw an error.
 * @param resolver - An instance of {@link @firebase/auth-types#PopupRedirectResolver}, optional
 * if already supplied to {@link initializeAuth} or provided by {@link getAuth}.
 *
 * @public
 */
export async function reauthenticateWithRedirect(
  user: externs.User,
  provider: externs.AuthProvider,
  resolver?: externs.PopupRedirectResolver
): Promise<never> {
  const userInternal = user as User;
  assert(provider instanceof OAuthProvider, AuthErrorCode.ARGUMENT_ERROR, {
    appName: userInternal.auth.name
  });

  // Allow the resolver to error before persisting the redirect user
  const resolverInternal = _withDefaultResolver(userInternal.auth, resolver);

  const eventId = await prepareUserForRedirect(userInternal);
  return resolverInternal._openRedirect(
    userInternal.auth,
    provider,
    AuthEventType.REAUTH_VIA_REDIRECT,
    eventId
  );
}

/**
 * Links the {@link OAuthProvider} to the user account using a full-page redirect flow.
 *
 * @example
 * ```javascript
 * // Sign in using some other provider.
 * const result = await signInWithEmailAndPassword(auth, email, password);
 * // Link using a redirect.
 * const provider = new FacebookAuthProvider();
 * await linkWithRedirect(result.user, provider);
 * // This will trigger a full page redirect away from your app
 *
 * // After returning from the redirect when your app initializes you can obtain the result
 * const result = await getRedirectResult(auth);
 * ```
 *
 * @param user - The user.
 * @param provider - The provider to authenticate. The provider has to be an {@link OAuthProvider}.
 * Non-OAuth providers like {@link EmailAuthProvider} will throw an error.
 * @param resolver - An instance of {@link @firebase/auth-types#PopupRedirectResolver}, optional
 * if already supplied to {@link initializeAuth} or provided by {@link getAuth}.
 *
 *
 * @public
 */
export async function linkWithRedirect(
  user: externs.User,
  provider: externs.AuthProvider,
  resolver?: externs.PopupRedirectResolver
): Promise<never> {
  const userInternal = user as User;
  assert(provider instanceof OAuthProvider, AuthErrorCode.ARGUMENT_ERROR, {
    appName: userInternal.auth.name
  });

  // Allow the resolver to error before persisting the redirect user
  const resolverInternal = _withDefaultResolver(userInternal.auth, resolver);

  await _assertLinkedStatus(false, userInternal, provider.providerId);
  const eventId = await prepareUserForRedirect(userInternal);
  return resolverInternal._openRedirect(
    userInternal.auth,
    provider,
    AuthEventType.LINK_VIA_REDIRECT,
    eventId
  );
}

/**
 * Returns a {@link @firebase/auth-types#UserCredential} from the redirect-based sign-in flow.
 *
 * @remarks
 * If sign-in succeeded, returns the signed in user. If sign-in was unsuccessful, fails with an
 * error. If no redirect operation was called, returns a {@link @firebase/auth-types#UserCredential}
 * with a null `user`.
 *
 * @example
 * ```javascript
 * // Sign in using a redirect.
 * const provider = new FacebookAuthProvider();
 * // You can add additional scopes to the provider:
 * provider.addScope('user_birthday');
 * // Start a sign in process for an unauthenticated user.
 * await signInWithRedirect(auth, provider);
 * // This will trigger a full page redirect away from your app
 *
 * // After returning from the redirect when your app initializes you can obtain the result
 * const result = await getRedirectResult(auth);
 * if (result) {
 *   // This is the signed-in user
 *   const user = result.user;
 *   // This gives you a Facebook Access Token.
 *   const credential = provider.credentialFromResult(auth, result);
 *   const token = credential.accessToken;
 * }
 * // As this API can be used for sign-in, linking and reauthentication,
 * // check the operationType to determine what triggered this redirect
 * // operation.
 * const operationType = result.operationType;
 * ```
 *
 * @param auth - The Auth instance.
 * @param resolver - An instance of {@link @firebase/auth-types#PopupRedirectResolver}, optional
 * if already supplied to {@link initializeAuth} or provided by {@link getAuth}.
 *
 * @public
 */
export async function getRedirectResult(
  auth: externs.Auth,
  resolver?: externs.PopupRedirectResolver
): Promise<externs.UserCredential | null> {
  const authInternal = _castAuth(auth);
  const resolverInternal = _withDefaultResolver(authInternal, resolver);
  const action = new RedirectAction(authInternal, resolverInternal);
  const result = await action.execute();

  if (result) {
    delete result.user._redirectEventId;
    await authInternal._persistUserIfCurrent(result.user as User);
    await authInternal._setRedirectUser(null, resolver);
  }

  return result;
}

/** @internal */
async function prepareUserForRedirect(user: User): Promise<string> {
  const eventId = _generateEventId(`${user.uid}:::`);
  user._redirectEventId = eventId;
  await user.auth._setRedirectUser(user);
  await user.auth._persistUserIfCurrent(user);
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

/** @internal */
export function _clearOutcomes(): void {
  redirectOutcomeMap.clear();
}
