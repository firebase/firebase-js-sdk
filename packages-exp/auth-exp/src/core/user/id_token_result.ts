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
import { base64Decode } from '@firebase/util';

import { User } from '../../model/user';
import { assert } from '../util/assert';
import { _logError } from '../util/log';
import { utcTimestampToDateString } from '../util/time';
import { AuthErrorCode } from '../errors';

/**
 * Returns a JSON Web Token (JWT) used to identify the user to a Firebase service.
 *
 * @remarks
 * Returns the current token if it has not expired or if it will not expire in the next five
 * minutes. Otherwise, this will refresh the token and return a new one.
 *
 * @param user - The user.
 * @param forceRefresh - Force refresh regardless of token expiration.
 *
 * @public
 */
export function getIdToken(
  user: externs.User,
  forceRefresh = false
): Promise<string> {
  return user.getIdToken(forceRefresh);
}

/**
 * Returns a deserialized JSON Web Token (JWT) used to identitfy the user to a Firebase service.
 *
 * @remarks
 * Returns the current token if it has not expired or if it will not expire in the next five
 * minutes. Otherwise, this will refresh the token and return a new one.
 *
 * @param user - The user.
 * @param forceRefresh - Force refresh regardless of token expiration.
 *
 * @public
 */
export async function getIdTokenResult(
  user: externs.User,
  forceRefresh = false
): Promise<externs.IdTokenResult> {
  const userInternal = user as User;
  const token = await user.getIdToken(forceRefresh);
  const claims = _parseToken(token);

  assert(
    claims && claims.exp && claims.auth_time && claims.iat,
    AuthErrorCode.INTERNAL_ERROR,
    { appName: userInternal.auth.name }
  );
  const firebase =
    typeof claims.firebase === 'object' ? claims.firebase : undefined;

  const signInProvider: string | undefined = firebase?.['sign_in_provider'];

  return {
    claims,
    token,
    authTime: utcTimestampToDateString(
      secondsStringToMilliseconds(claims.auth_time)
    )!,
    issuedAtTime: utcTimestampToDateString(
      secondsStringToMilliseconds(claims.iat)
    )!,
    expirationTime: utcTimestampToDateString(
      secondsStringToMilliseconds(claims.exp)
    )!,
    signInProvider: signInProvider || null,
    signInSecondFactor: firebase?.['sign_in_second_factor'] || null
  };
}

function secondsStringToMilliseconds(seconds: string): number {
  return Number(seconds) * 1000;
}

/** @internal */
export function _parseToken(token: string): externs.ParsedToken | null {
  const [algorithm, payload, signature] = token.split('.');
  if (
    algorithm === undefined ||
    payload === undefined ||
    signature === undefined
  ) {
    _logError('JWT malformed, contained fewer than 3 sections');
    return null;
  }

  try {
    const decoded = base64Decode(payload);
    if (!decoded) {
      _logError('Failed to decode base64 JWT payload');
      return null;
    }
    return JSON.parse(decoded);
  } catch (e) {
    _logError('Caught error parsing JWT payload as JSON', e);
    return null;
  }
}
