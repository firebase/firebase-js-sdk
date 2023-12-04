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

import {
  Auth,
  AuthProvider,
  PopupRedirectResolver,
  User,
  UserCredential
} from '../../model/public_types';

import { _castAuth } from '../../core/auth/auth_impl';
import { _assertLinkedStatus } from '../../core/user/link_unlink';
import { _assertInstanceOf } from '../../core/util/assert';
import { _generateEventId } from '../../core/util/event_id';
import { AuthEventType } from '../../model/popup_redirect';
import { UserInternal } from '../../model/user';
import { _withDefaultResolver } from '../../core/util/resolver';
import {
  RedirectAction,
  _setPendingRedirectStatus
} from '../../core/strategies/redirect';
import { FederatedAuthProvider } from '../../core/providers/federated';
import { getModularInstance } from '@firebase/util';

/**
 * Authenticates a Firebase client using a full-page redirect flow.
 *
 * @remarks
 * To handle the results and errors for this operation, refer to {@link getRedirectResult}.
 * Follow the {@link https://firebase.google.com/docs/auth/web/redirect-best-practices
 * | best practices} when using {@link signInWithRedirect}.
 *
 * This method does not work in a Node.js environment.
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
 * @param auth - The {@link Auth} instance.
 * @param provider - The provider to authenticate. The provider has to be an {@link OAuthProvider}.
 * Non-OAuth providers like {@link EmailAuthProvider} will throw an error.
 * @param resolver - An instance of {@link PopupRedirectResolver}, optional
 * if already supplied to {@link initializeAuth} or provided by {@link getAuth}.
 *
 * @public
 */
export function signInWithRedirect(
  auth: Auth,
  provider: AuthProvider,
  resolver?: PopupRedirectResolver
): Promise<never> {
  return _signInWithRedirect(auth, provider, resolver) as Promise<never>;
}

export async function _signInWithRedirect(
  auth: Auth,
  provider: AuthProvider,
  resolver?: PopupRedirectResolver
): Promise<void | never> {
  const authInternal = _castAuth(auth);
  _assertInstanceOf(auth, provider, FederatedAuthProvider);
  // Wait for auth initialization to complete, this will process pending redirects and clear the
  // PENDING_REDIRECT_KEY in persistence. This should be completed before starting a new
  // redirect and creating a PENDING_REDIRECT_KEY entry.
  await authInternal._initializationPromise;
  const resolverInternal = _withDefaultResolver(authInternal, resolver);
  await _setPendingRedirectStatus(resolverInternal, authInternal);

  return resolverInternal._openRedirect(
    authInternal,
    provider,
    AuthEventType.SIGN_IN_VIA_REDIRECT
  );
}

/**
 * Reauthenticates the current user with the specified {@link OAuthProvider} using a full-page redirect flow.
 * @remarks
 * To handle the results and errors for this operation, refer to {@link getRedirectResult}.
 * Follow the {@link https://firebase.google.com/docs/auth/web/redirect-best-practices
 * | best practices} when using {@link reauthenticateWithRedirect}.
 *
 * This method does not work in a Node.js environment.
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
 * // Reauthenticate using a redirect.
 * await reauthenticateWithRedirect(result.user, provider);
 * // This will again trigger a full page redirect away from your app
 *
 * // After returning from the redirect when your app initializes you can obtain the result
 * const result = await getRedirectResult(auth);
 * ```
 *
 * @param user - The user.
 * @param provider - The provider to authenticate. The provider has to be an {@link OAuthProvider}.
 * Non-OAuth providers like {@link EmailAuthProvider} will throw an error.
 * @param resolver - An instance of {@link PopupRedirectResolver}, optional
 * if already supplied to {@link initializeAuth} or provided by {@link getAuth}.
 *
 * @public
 */
export function reauthenticateWithRedirect(
  user: User,
  provider: AuthProvider,
  resolver?: PopupRedirectResolver
): Promise<never> {
  return _reauthenticateWithRedirect(
    user,
    provider,
    resolver
  ) as Promise<never>;
}
export async function _reauthenticateWithRedirect(
  user: User,
  provider: AuthProvider,
  resolver?: PopupRedirectResolver
): Promise<void | never> {
  const userInternal = getModularInstance(user) as UserInternal;
  _assertInstanceOf(userInternal.auth, provider, FederatedAuthProvider);
  // Wait for auth initialization to complete, this will process pending redirects and clear the
  // PENDING_REDIRECT_KEY in persistence. This should be completed before starting a new
  // redirect and creating a PENDING_REDIRECT_KEY entry.
  await userInternal.auth._initializationPromise;
  // Allow the resolver to error before persisting the redirect user
  const resolverInternal = _withDefaultResolver(userInternal.auth, resolver);
  await _setPendingRedirectStatus(resolverInternal, userInternal.auth);

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
 * @remarks
 * To handle the results and errors for this operation, refer to {@link getRedirectResult}.
 * Follow the {@link https://firebase.google.com/docs/auth/web/redirect-best-practices
 * | best practices} when using {@link linkWithRedirect}.
 *
 * This method does not work in a Node.js environment.
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
 * @param resolver - An instance of {@link PopupRedirectResolver}, optional
 * if already supplied to {@link initializeAuth} or provided by {@link getAuth}.
 *
 * @public
 */
export function linkWithRedirect(
  user: User,
  provider: AuthProvider,
  resolver?: PopupRedirectResolver
): Promise<never> {
  return _linkWithRedirect(user, provider, resolver) as Promise<never>;
}
export async function _linkWithRedirect(
  user: User,
  provider: AuthProvider,
  resolver?: PopupRedirectResolver
): Promise<void | never> {
  const userInternal = getModularInstance(user) as UserInternal;
  _assertInstanceOf(userInternal.auth, provider, FederatedAuthProvider);
  // Wait for auth initialization to complete, this will process pending redirects and clear the
  // PENDING_REDIRECT_KEY in persistence. This should be completed before starting a new
  // redirect and creating a PENDING_REDIRECT_KEY entry.
  await userInternal.auth._initializationPromise;
  // Allow the resolver to error before persisting the redirect user
  const resolverInternal = _withDefaultResolver(userInternal.auth, resolver);
  await _assertLinkedStatus(false, userInternal, provider.providerId);
  await _setPendingRedirectStatus(resolverInternal, userInternal.auth);

  const eventId = await prepareUserForRedirect(userInternal);
  return resolverInternal._openRedirect(
    userInternal.auth,
    provider,
    AuthEventType.LINK_VIA_REDIRECT,
    eventId
  );
}

/**
 * Returns a {@link UserCredential} from the redirect-based sign-in flow.
 *
 * @remarks
 * If sign-in succeeded, returns the signed in user. If sign-in was unsuccessful, fails with an
 * error. If no redirect operation was called, returns `null`.
 *
 * This method does not work in a Node.js environment.
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
 * @param auth - The {@link Auth} instance.
 * @param resolver - An instance of {@link PopupRedirectResolver}, optional
 * if already supplied to {@link initializeAuth} or provided by {@link getAuth}.
 *
 * @public
 */
export async function getRedirectResult(
  auth: Auth,
  resolver?: PopupRedirectResolver
): Promise<UserCredential | null> {
  await _castAuth(auth)._initializationPromise;
  return _getRedirectResult(auth, resolver, false);
}

export async function _getRedirectResult(
  auth: Auth,
  resolverExtern?: PopupRedirectResolver,
  bypassAuthState = false
): Promise<UserCredential | null> {
  const authInternal = _castAuth(auth);
  const resolver = _withDefaultResolver(authInternal, resolverExtern);
  const action = new RedirectAction(authInternal, resolver, bypassAuthState);
  const result = await action.execute();

  if (result && !bypassAuthState) {
    delete result.user._redirectEventId;
    await authInternal._persistUserIfCurrent(result.user as UserInternal);
    await authInternal._setRedirectUser(null, resolverExtern);
  }

  return result;
}

async function prepareUserForRedirect(user: UserInternal): Promise<string> {
  const eventId = _generateEventId(`${user.uid}:::`);
  user._redirectEventId = eventId;
  await user.auth._setRedirectUser(user);
  await user.auth._persistUserIfCurrent(user);
  return eventId;
}
