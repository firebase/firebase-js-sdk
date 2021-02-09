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

import { AuthErrorCode } from '../../core/errors';
import { _createError } from '../../core/util/assert';
import { Auth } from '../../model/auth';
import { AuthEvent, AuthEventType } from '../../model/popup_redirect';

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
