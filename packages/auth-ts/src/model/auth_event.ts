import { AuthErrorCode } from '../core/errors';

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

export const AUTH_EVENT_MESSAGE_TYPE = 'authEvent';

export enum AuthEventType {
  LINK_VIA_POPUP = 'linkViaPopup',
  LINK_VIA_REDIRECT = 'linkViaRedirect',
  REAUTH_VIA_POPUP = 'reauthViaPopup',
  REAUTH_VIA_REDIRECT = 'reauthViaRedirect',
  SIGN_IN_VIA_POPUP = 'signInViaPopup',
  SIGN_IN_VIA_REDIRECT = 'signInViaRedirect',
  UNKNOWN = 'unknown',
  VERIFY_APP = 'verifyApp'
}

// TODO: convert from these to FirebaseError
export interface AuthEventError {
  code: string; // in the form of auth/${AuthErrorCode}
  message: string;
}

export interface AuthEvent extends gapi.iframes.Message {
  authEvent: {
    type: AuthEventType;
    eventId: string | null;
    urlResponse: string | null;
    sessionId: string | null;
    postBody: string | null;
    tenantId: string | null;
    error: AuthEventError;
  };
}
