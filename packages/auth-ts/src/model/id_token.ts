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

export type IdToken = string;

export interface IdTokenResult {
  token: string;
  authTime: string;
  expirationTime: string;
  issuedAtTime: string;
  signInProvider: string | null;
  signInSecondFactor: string | null;
  claims: {
    [claim: string]: string;
  };
}

export function parseIdToken(idToken: IdToken): IdTokenResult {
  const fields = idToken.split('.');
  if (fields.length !== 3) {
    throw new Error('Invalid JWT');
  }
  const payload = JSON.parse(atob(fields[1]));
  const utcTimestampToDateString = (utcTimestamp: number): string => {
    const date = new Date(utcTimestamp);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid timestamp');
    }
    return date.toUTCString();
  };

  return {
    token: idToken,
    authTime: utcTimestampToDateString(payload.auth_time),
    expirationTime: utcTimestampToDateString(payload.exp),
    issuedAtTime: utcTimestampToDateString(payload.iat),
    signInProvider: payload.provider_id,
    signInSecondFactor: null,
    claims: {}
  };
}
