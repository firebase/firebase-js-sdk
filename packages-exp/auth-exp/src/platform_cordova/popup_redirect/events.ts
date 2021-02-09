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

import { querystringDecode } from '@firebase/util';
import { AuthErrorCode } from '../../core/errors';
import { PersistedBlob, Persistence } from '../../core/persistence';
import { KeyName, _persistenceKeyName } from '../../core/persistence/persistence_user_manager';
import { _createError } from '../../core/util/assert';
import { _getInstance } from '../../core/util/instantiator';
import { Auth } from '../../model/auth';
import { AuthEvent, AuthEventType } from '../../model/popup_redirect';
import { browserLocalPersistence } from '../../platform_browser/persistence/local_storage';

const SESSION_ID_LENGTH = 20;

/**
 * Generates a (partial) {@link AuthEvent}.
 */
export function _generateNewEvent(
  auth: Auth,
  type: AuthEventType,
  eventId: string | null = null
): AuthEvent {
  return {
    type,
    eventId,
    urlResponse: null,
    sessionId: generateSessionId(),
    postBody: null,
    tenantId: auth.tenantId,
    error: _createError(auth, AuthErrorCode.NO_AUTH_EVENT)
  };
}

export function _savePartialEvent(auth: Auth, event: AuthEvent): Promise<void> {
  return storage()._set(key(auth), event as object as PersistedBlob);
}

export async function _getAndRemoveEvent(auth: Auth): Promise<AuthEvent|null> {
  const event = await storage()._get(key(auth)) as AuthEvent | null;
  if (event) {
    await storage()._remove(key(auth));
  }
  return event;
}

export function _eventFromPartialAndUrl(partialEvent: AuthEvent, url: string): AuthEvent|null {
  // Parse the deep link within the dynamic link URL.
  const callbackUrl = _getDeepLinkFromCallback(url);
  // Confirm it is actually a callback URL.
  // Currently the universal link will be of this format:
  // https://<AUTH_DOMAIN>/__/auth/callback<OAUTH_RESPONSE>
  // This is a fake URL but is not intended to take the user anywhere
  // and just redirect to the app.
  if (callbackUrl.includes('/__/auth/callback')) {
    // Check if there is an error in the URL.
    // This mechanism is also used to pass errors back to the app:
    // https://<AUTH_DOMAIN>/__/auth/callback?firebaseError=<STRINGIFIED_ERROR>
    const params = searchParamsOrEmpty(callbackUrl);
    // Get the error object corresponding to the stringified error if found.
    const errorObject = params['firebaseError'] ?
        JSON.parse(decodeURIComponent(params['firebaseError'])) : null;
    const code = errorObject?.['code']?.split('auth/')?.[1];
    const error = code ? _createError(code) : null;
    if (error) {
      return {
        type: partialEvent.type,
        eventId: partialEvent.eventId,
        tenantId: partialEvent.tenantId,
        error,
        urlResponse: null,
        sessionId: null,
        postBody: null,
      };
    } else {
      return {
        type: partialEvent.type,
        eventId: partialEvent.eventId,
        tenantId: partialEvent.tenantId,
        sessionId: partialEvent.sessionId,
        urlResponse: callbackUrl,
        postBody: null,
      };
    }
  }

  return null;
}

function generateSessionId(): string {
  const chars = [];
  const allowedChars =
    '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < SESSION_ID_LENGTH; i++) {
    const idx = Math.floor(Math.random() * allowedChars.length);
    chars.push(allowedChars.charAt(idx));
  }
  return chars.join('');
}

function storage(): Persistence {
  return _getInstance(browserLocalPersistence);
}

function key(auth: Auth): string {
  return _persistenceKeyName(KeyName.AUTH_EVENT, auth.config.apiKey, auth.name);
}

// Exported for testing
export function _getDeepLinkFromCallback(url: string): string {
  const params = searchParamsOrEmpty(url);
  const link = params['link'] ? decodeURIComponent(params['link']) : undefined;
  // Double link case (automatic redirect)
  const doubleDeepLink = searchParamsOrEmpty(link)['link'];
  // iOS custom scheme links.
  const iOSDeepLink = params['deep_link_id'] ? decodeURIComponent(params['deep_link_id']) : undefined;
  const iOSDoubleDeepLink = searchParamsOrEmpty(iOSDeepLink)['link'];
  return iOSDoubleDeepLink || iOSDeepLink || doubleDeepLink || link || url;
}

/**
 * Optimistically tries to get search params from a string, or else returns an
 * empty search params object.
 */
function searchParamsOrEmpty(url: string | undefined): Record<string, string> {
  if (!url?.includes('?')) {
    return {};
  }

  const [_, ...rest] = url.split('?');
  return querystringDecode(rest.join('?')) as Record<string, string>;
}

