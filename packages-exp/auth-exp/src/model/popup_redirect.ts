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

export const enum EventFilter {
  POPUP,
  REDIRECT
}

export const enum GapiOutcome {
  ACK = 'ACK',
  ERROR = 'ERROR'
}

export interface GapiAuthEvent extends gapi.iframes.Message {
  authEvent: AuthEvent;
}

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

export interface AuthEventError extends Error {
  code: string; // in the form of auth/${AuthErrorCode}
  message: string;
}

export interface AuthEvent {
  type: AuthEventType;
  eventId: string | null;
  urlResponse: string | null;
  sessionId: string | null;
  postBody: string | null;
  tenantId: string | null;
  error?: AuthEventError;
}

export interface AuthEventConsumer {
  readonly filter: AuthEventType[];
  eventId: string | null;
  onAuthEvent(event: AuthEvent): unknown;
  onError(error: FirebaseError): unknown;
}

export interface EventManager {
  registerConsumer(authEventConsumer: AuthEventConsumer): void;
  unregisterConsumer(authEventConsumer: AuthEventConsumer): void;
}

export interface PopupRedirectResolver extends externs.PopupRedirectResolver {
  _initialize(auth: Auth): Promise<EventManager>;
  _openPopup(
    auth: Auth,
    provider: externs.AuthProvider,
    authType: AuthEventType,
    eventId?: string
  ): Promise<AuthPopup>;
  _openRedirect(
    auth: Auth,
    provider: externs.AuthProvider,
    authType: AuthEventType,
    eventId?: string
  ): Promise<never>;
  _isIframeWebStorageSupported(
    auth: Auth,
    cb: (support: boolean) => unknown
  ): void;
  _redirectPersistence: externs.Persistence;
}
