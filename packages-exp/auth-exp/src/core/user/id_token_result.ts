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

import { base64Decode } from '@firebase/util';

import { IdTokenResult, ParsedToken } from '../../model/id_token';
import { User } from '../../model/user';
import { ProviderId } from '../providers';
import { assert } from '../util/assert';

export async function getIdTokenResult(
  user: User,
  forceRefresh = false
): Promise<IdTokenResult> {
  const token = await user.getIdToken(forceRefresh);
  const claims = parseClaims(token);
  // const firebase = claims?.firebase;

  assert(
    claims && claims['exp'] && claims['auth_time'] && claims['iat'],
    user.auth.name
  );
  const firebase =
    typeof claims['firebase'] !== 'string' &&
    typeof claims['firebase'] !== 'undefined'
      ? claims['firebase']
      : undefined;

  return {
    claims,
    token,
    authTime: utcTimestampToDateString(Number(claims['auth_time']) * 1000),
    issuedAtTime: utcTimestampToDateString(Number(claims['iat']) * 1000),
    expirationTime: utcTimestampToDateString(Number(claims['exp']) * 1000),
    signInProvider: (firebase?.['sign_in_provider'] as ProviderId) || null,
    signInSecondFactor: (firebase?.['sign_in_second_factor'] as string) || null
  };
}

function utcTimestampToDateString(timestamp: string | number): string | null {
  try {
    const date = new Date(Number(timestamp));
    if (!isNaN(date.getTime())) {
      return date.toUTCString();
    }
  } catch {
    // Do nothing, return null
  }

  return null;
}

function parseClaims(token: string): ParsedToken | null {
  const [algorithm, jsonInfo, signature] = token.split('.');
  if (
    algorithm === undefined ||
    jsonInfo === undefined ||
    signature === undefined
  ) {
    return null;
  }

  try {
    const decoded = base64Decode(jsonInfo);
    if (!decoded) {
      return null;
    }
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}
