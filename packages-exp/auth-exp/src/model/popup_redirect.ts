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

import { AuthPopup } from '../platform_browser/util/popup';
import { Auth } from './auth';

/** @internal */
export const enum EventFilter {
  POPUP,
  REDIRECT
}

/** @internal */
export const enum GapiOutcome {
  ACK = 'ACK',
  ERROR = 'ERROR'
}

/** @internal */
export interface GapiAuthEvent extends gapi.iframes.Message {
  authEvent: AuthEvent;
}

/** @internal */
export const enum AuthEventType {
  LINK_VIA_POPUP = 'linkViaPopup',
  LINK_VIA_REDIRECT = 'linkViaRedirect',
  REAUTH_VIA_POPUP = 'reauthViaPopup',
  REAUTH_VIA_REDIRECT = 'reauthViaRedirect',
  SIGN_IN_VIA_POPUP = 'signInViaPopup',
  SIGN_IN_VIA_REDIRECT = 'signInViaRedirect',
  UNKNOWN = 'unknown',
  VERIFY_APP = 'verifyApp'
}

/** @internal */
export interface AuthEventError extends Error {
  code: string; // in the form of auth/${AuthErrorCode}
  message: string;
}

/** @internal */
export interface AuthEvent {
  type: AuthEventType;
  eventId: string | null;
  urlResponse: string | null;
  sessionId: string | null;
  postBody: string | null;
  tenantId: string | null;
  error?: AuthEventError;
}

/** @internal */
export interface AuthEventConsumer {
  readonly filter: AuthEventType[];
  eventId: string | null;
  onAuthEvent(event: AuthEvent): unknown;
  onError(error: FirebaseError): unknown;
}

/** @internal */
export interface EventManager {
  registerConsumer(authEventConsumer: AuthEventConsumer): void;
  unregisterConsumer(authEventConsumer: AuthEventConsumer): void;
}

/** @internal */
export interface PopupRedirectResolver extends externs.PopupRedirectResolver {
  /** @internal */
  _initialize(auth: Auth): Promise<EventManager>;
  /** @internal */
  _openPopup(
    auth: Auth,
    provider: externs.AuthProvider,
    authType: AuthEventType,
    eventId?: string
  ): Promise<AuthPopup>;
  /** @internal */
  _openRedirect(
    auth: Auth,
    provider: externs.AuthProvider,
    authType: AuthEventType,
    eventId?: string
  ): Promise<never>;
  /** @internal */
  _isIframeWebStorageSupported(
    auth: Auth,
    cb: (support: boolean) => unknown
  ): void;
  _redirectPersistence: externs.Persistence;

  // This is needed so that auth does not have a hard dependency on redirect
  _completeRedirectFn: (auth: externs.Auth, resolver: externs.PopupRedirectResolver, bypassAuthState: boolean) => Promise<externs.UserCredential | null>;
}
