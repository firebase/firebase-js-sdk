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
