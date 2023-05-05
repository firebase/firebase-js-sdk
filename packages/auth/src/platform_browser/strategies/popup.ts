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
import { AuthErrorCode } from '../../core/errors';
import {
  _assert,
  debugAssert,
  _createError,
  _assertInstanceOf
} from '../../core/util/assert';
import { Delay } from '../../core/util/delay';
import { _generateEventId } from '../../core/util/event_id';
import { AuthInternal } from '../../model/auth';
import {
  AuthEventType,
  PopupRedirectResolverInternal
} from '../../model/popup_redirect';
import { UserInternal } from '../../model/user';
import { _withDefaultResolver } from '../../core/util/resolver';
import { AuthPopup } from '../util/popup';
import { AbstractPopupRedirectOperation } from '../../core/strategies/abstract_popup_redirect_operation';
import { FederatedAuthProvider } from '../../core/providers/federated';
import { getModularInstance } from '@firebase/util';

/*
 * The event timeout is the same on mobile and desktop, no need for Delay. Set this to 8s since
 * blocking functions can take upto 7s to complete sign in, as documented in:
 * https://cloud.google.com/identity-platform/docs/blocking-functions#understanding_blocking_functions
 * https://firebase.google.com/docs/auth/extend-with-blocking-functions#understanding_blocking_functions
 */
export const enum _Timeout {
  AUTH_EVENT = 8000
}
export const _POLL_WINDOW_CLOSE_TIMEOUT = new Delay(2000, 10000);

/**
 * Authenticates a Firebase client using a popup-based OAuth authentication flow.
 *
 * @remarks
 * If succeeds, returns the signed in user along with the provider's credential. If sign in was
 * unsuccessful, returns an error object containing additional information about the error.
 *
 * This method does not work in a Node.js environment.
 *
 * @example
 * ```javascript
 * // Sign in using a popup.
 * const provider = new FacebookAuthProvider();
 * const result = await signInWithPopup(auth, provider);
 *
 * // The signed-in user info.
 * const user = result.user;
 * // This gives you a Facebook Access Token.
 * const credential = provider.credentialFromResult(auth, result);
 * const token = credential.accessToken;
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
export async function signInWithPopup(
  auth: Auth,
  provider: AuthProvider,
  resolver?: PopupRedirectResolver
): Promise<UserCredential> {
  const authInternal = _castAuth(auth);
  _assertInstanceOf(auth, provider, FederatedAuthProvider);
  const resolverInternal = _withDefaultResolver(authInternal, resolver);
  const action = new PopupOperation(
    authInternal,
    AuthEventType.SIGN_IN_VIA_POPUP,
    provider,
    resolverInternal
  );
  return action.executeNotNull();
}

/**
 * Reauthenticates the current user with the specified {@link OAuthProvider} using a pop-up based
 * OAuth flow.
 *
 * @remarks
 * If the reauthentication is successful, the returned result will contain the user and the
 * provider's credential.
 *
 * This method does not work in a Node.js environment.
 *
 * @example
 * ```javascript
 * // Sign in using a popup.
 * const provider = new FacebookAuthProvider();
 * const result = await signInWithPopup(auth, provider);
 * // Reauthenticate using a popup.
 * await reauthenticateWithPopup(result.user, provider);
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
export async function reauthenticateWithPopup(
  user: User,
  provider: AuthProvider,
  resolver?: PopupRedirectResolver
): Promise<UserCredential> {
  const userInternal = getModularInstance(user) as UserInternal;
  _assertInstanceOf(userInternal.auth, provider, FederatedAuthProvider);
  const resolverInternal = _withDefaultResolver(userInternal.auth, resolver);
  const action = new PopupOperation(
    userInternal.auth,
    AuthEventType.REAUTH_VIA_POPUP,
    provider,
    resolverInternal,
    userInternal
  );
  return action.executeNotNull();
}

/**
 * Links the authenticated provider to the user account using a pop-up based OAuth flow.
 *
 * @remarks
 * If the linking is successful, the returned result will contain the user and the provider's credential.
 *
 * This method does not work in a Node.js environment.
 *
 * @example
 * ```javascript
 * // Sign in using some other provider.
 * const result = await signInWithEmailAndPassword(auth, email, password);
 * // Link using a popup.
 * const provider = new FacebookAuthProvider();
 * await linkWithPopup(result.user, provider);
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
export async function linkWithPopup(
  user: User,
  provider: AuthProvider,
  resolver?: PopupRedirectResolver
): Promise<UserCredential> {
  const userInternal = getModularInstance(user) as UserInternal;
  _assertInstanceOf(userInternal.auth, provider, FederatedAuthProvider);
  const resolverInternal = _withDefaultResolver(userInternal.auth, resolver);

  const action = new PopupOperation(
    userInternal.auth,
    AuthEventType.LINK_VIA_POPUP,
    provider,
    resolverInternal,
    userInternal
  );
  return action.executeNotNull();
}

/**
 * Popup event manager. Handles the popup's entire lifecycle; listens to auth
 * events
 *
 */
class PopupOperation extends AbstractPopupRedirectOperation {
  // Only one popup is ever shown at once. The lifecycle of the current popup
  // can be managed / cancelled by the constructor.
  private static currentPopupAction: PopupOperation | null = null;
  private authWindow: AuthPopup | null = null;
  private pollId: number | null = null;

  constructor(
    auth: AuthInternal,
    filter: AuthEventType,
    private readonly provider: AuthProvider,
    resolver: PopupRedirectResolverInternal,
    user?: UserInternal
  ) {
    super(auth, filter, resolver, user);
    if (PopupOperation.currentPopupAction) {
      PopupOperation.currentPopupAction.cancel();
    }

    PopupOperation.currentPopupAction = this;
  }

  async executeNotNull(): Promise<UserCredential> {
    const result = await this.execute();
    _assert(result, this.auth, AuthErrorCode.INTERNAL_ERROR);
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

    // Check for web storage support and origin validation _after_ the popup is
    // loaded. These operations are slow (~1 second or so) Rather than
    // waiting on them before opening the window, optimistically open the popup
    // and check for storage support at the same time. If storage support is
    // not available, this will cause the whole thing to reject properly. It
    // will also close the popup, but since the promise has already rejected,
    // the popup closed by user poll will reject into the void.
    this.resolver._originValidation(this.auth).catch(e => {
      this.reject(e);
    });

    this.resolver._isIframeWebStorageSupported(this.auth, isSupported => {
      if (!isSupported) {
        this.reject(
          _createError(this.auth, AuthErrorCode.WEB_STORAGE_UNSUPPORTED)
        );
      }
    });

    // Handle user closure. Notice this does *not* use await
    this.pollUserCancellation();
  }

  get eventId(): string | null {
    return this.authWindow?.associatedEvent || null;
  }

  cancel(): void {
    this.reject(_createError(this.auth, AuthErrorCode.EXPIRED_POPUP_REQUEST));
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

  private pollUserCancellation(): void {
    const poll = (): void => {
      if (this.authWindow?.window?.closed) {
        // Make sure that there is sufficient time for whatever action to
        // complete. The window could have closed but the sign in network
        // call could still be in flight. This is specifically true for
        // Firefox or if the opener is in an iframe, in which case the oauth
        // helper closes the popup.
        this.pollId = window.setTimeout(() => {
          this.pollId = null;
          this.reject(
            _createError(this.auth, AuthErrorCode.POPUP_CLOSED_BY_USER)
          );
        }, _Timeout.AUTH_EVENT);
        return;
      }

      this.pollId = window.setTimeout(poll, _POLL_WINDOW_CLOSE_TIMEOUT.get());
    };

    poll();
  }
}
