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

export function getIdToken(
  user: externs.User,
  forceRefresh = false
): Promise<string> {
  return user.getIdToken(forceRefresh);
}

export async function getIdTokenResult(
  externUser: externs.User,
  forceRefresh = false
): Promise<externs.IdTokenResult> {
  const user = externUser as User;
  const token = await user.getIdToken(forceRefresh);
  const claims = _parseToken(token);

  assert(
    claims && claims.exp && claims.auth_time && claims.iat,
    user.auth.name
  );
  const firebase =
    typeof claims.firebase === 'object' ? claims.firebase : undefined;

  const signInProvider: externs.ProviderId | undefined = firebase?.[
    'sign_in_provider'
  ] as externs.ProviderId;

  return {
    claims,
    token,
    authTime: utcTimestampToDateString(
      secondsStringToMilliseconds(claims.auth_time)
    ),
    issuedAtTime: utcTimestampToDateString(
      secondsStringToMilliseconds(claims.iat)
    ),
    expirationTime: utcTimestampToDateString(
      secondsStringToMilliseconds(claims.exp)
    ),
    signInProvider: signInProvider || null,
    signInSecondFactor:
      (firebase?.['sign_in_second_factor'] as externs.ProviderId) || null
  };
}

function secondsStringToMilliseconds(seconds: string): number {
  return Number(seconds) * 1000;
}

function utcTimestampToDateString(timestamp: string | number): string {
  try {
    const date = new Date(Number(timestamp));
    if (!isNaN(date.getTime())) {
      return date.toUTCString();
    }
  } catch {
    // Do nothing, return null
  }

  return ''; // TODO(avolkovi): is this the right fallback?
}

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
