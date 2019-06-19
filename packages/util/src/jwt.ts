/**
 * @license
 * Copyright 2017 Google Inc.
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

import { base64Decode } from './crypt';
import { jsonEval } from './json';

interface Claims {
  [key: string]: {};
}

interface DecodedToken {
  header: object;
  claims: Claims;
  data: object;
  signature: string;
}

/**
 * Decodes a Firebase auth. token into constituent parts.
 *
 * Notes:
 * - May return with invalid / incomplete claims if there's no native base64 decoding support.
 * - Doesn't check if the token is actually valid.
 */
export const decode = function(token: string): DecodedToken {
  let header = {},
    claims: Claims = {},
    data = {},
    signature = '';

  try {
    const parts = token.split('.');
    header = jsonEval(base64Decode(parts[0]) || '') as object;
    claims = jsonEval(base64Decode(parts[1]) || '') as Claims;
    signature = parts[2];
    data = claims['d'] || {};
    delete claims['d'];
  } catch (e) {}

  return {
    header,
    claims,
    data,
    signature
  };
};

interface DecodedToken {
  header: object;
  claims: Claims;
  data: object;
  signature: string;
}

/**
 * Decodes a Firebase auth. token and checks the validity of its time-based claims. Will return true if the
 * token is within the time window authorized by the 'nbf' (not-before) and 'iat' (issued-at) claims.
 *
 * Notes:
 * - May return a false negative if there's no native base64 decoding support.
 * - Doesn't check if the token is actually valid.
 */
export const isValidTimestamp = function(token: string): boolean {
  const claims: Claims = decode(token).claims;
  const now: number = Math.floor(new Date().getTime() / 1000);
  let validSince: number = 0,
    validUntil: number = 0;

  if (typeof claims === 'object') {
    if (claims.hasOwnProperty('nbf')) {
      validSince = claims['nbf'] as number;
    } else if (claims.hasOwnProperty('iat')) {
      validSince = claims['iat'] as number;
    }

    if (claims.hasOwnProperty('exp')) {
      validUntil = claims['exp'] as number;
    } else {
      // token will expire after 24h by default
      validUntil = validSince + 86400;
    }
  }

  return (
    !!now &&
    !!validSince &&
    !!validUntil &&
    now >= validSince &&
    now <= validUntil
  );
};

/**
 * Decodes a Firebase auth. token and returns its issued at time if valid, null otherwise.
 *
 * Notes:
 * - May return null if there's no native base64 decoding support.
 * - Doesn't check if the token is actually valid.
 */
export const issuedAtTime = function(token: string): number | null {
  const claims: Claims = decode(token).claims;
  if (typeof claims === 'object' && claims.hasOwnProperty('iat')) {
    return claims['iat'] as number;
  }
  return null;
};

/**
 * Decodes a Firebase auth. token and checks the validity of its format. Expects a valid issued-at time.
 *
 * Notes:
 * - May return a false negative if there's no native base64 decoding support.
 * - Doesn't check if the token is actually valid.
 */
export const isValidFormat = function(token: string): boolean {
  const decoded = decode(token),
    claims = decoded.claims;

  return !!claims && typeof claims === 'object' && claims.hasOwnProperty('iat');
};

/**
 * Attempts to peer into an auth token and determine if it's an admin auth token by looking at the claims portion.
 *
 * Notes:
 * - May return a false negative if there's no native base64 decoding support.
 * - Doesn't check if the token is actually valid.
 */
export const isAdmin = function(token: string): boolean {
  const claims: Claims = decode(token).claims;
  return typeof claims === 'object' && claims['admin'] === true;
};
