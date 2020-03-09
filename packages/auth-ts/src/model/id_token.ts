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

import { ProviderId } from '../core/providers';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../core/errors';

/**
 * Raw encoded JWT
 */
export type IdToken = string;

/**
 * JWT algorithm section
 */
export interface IdTokenAlgorithm {
  alg: 'RS256';
  kid: string;
  typ: 'JWT';
}

/**
 * JWT payload section
 */
export interface IdTokenPayload {
  provider_id?: ProviderId; // eslint-disable-line camelcase
  iss: string;
  aud: string;
  auth_time: number; // eslint-disable-line camelcase
  user_id: string; // eslint-disable-line camelcase
  sub: string;
  iat: number;
  exp: number;
  email_verified?: boolean; // eslint-disable-line camelcase
  firebase: {
    identities: {
      email?: string[];
    };
    sign_in_provider: ProviderId; // eslint-disable-line camelcase
  };
}

/**
 * Parsed IdToken for use in public API
 */
export interface IdTokenResult {
  token: string;
  authTime: string;
  expirationTime: string;
  issuedAtTime: string;
  signInProvider: ProviderId | null;
  signInSecondFactor: string | null;
  claims: {
    [claim: string]: string;
  };
}

/**
 * Parses but *does not verify* the IdToken received from the server.
 *
 * @param idToken raw encoded JWT from the server.
 */
export function parseIdToken(idToken: IdToken): IdTokenResult {
  const {auth_time, exp, iat, firebase} = getTokenPayload_(idToken);
  const utcTimestampToDateString = (utcTimestamp: number): string => {
    const date = new Date(utcTimestamp);
    if (isNaN(date.getTime())) {
      // TODO: throw proper AuthError
      throw new Error('Invalid timestamp');
    }
    return date.toUTCString();
  };

  return {
    token: idToken,
    authTime: utcTimestampToDateString(auth_time),
    expirationTime: utcTimestampToDateString(exp),
    issuedAtTime: utcTimestampToDateString(iat),
    signInProvider: firebase.sign_in_provider,
    signInSecondFactor: null,
    claims: {}
  };
}

function getTokenPayload_(idToken: IdToken): IdTokenPayload {
  const fields = idToken.split('.');
  if (fields.length !== 3) {
    // TODO: throw proper AuthError
    throw new Error('Invalid JWT');
  }
  return JSON.parse(atob(fields[1]));
}

/**
 * Helper function to create JWT ID Tokens given the three components.  Intended to make testing easier.
 *
 * @param algorithm JWT algorithm
 * @param payload JWT payload
 * @param signature JWT signature
 */
export function encodeIdToken(
  algorithm: IdTokenAlgorithm,
  payload: IdTokenPayload,
  signature: string
): IdToken {
  return `${btoa(JSON.stringify(algorithm))}.${btoa(
    JSON.stringify(payload)
  )}.${signature}`;
}

export interface IdTokenResponse {
  idToken: IdToken;
  refreshToken: string;
  expiresIn: string;
  localId: string;
}

export async function verifyTokenResponseUid(
  idTokenResolver: Promise<IdTokenResponse>,
  uid: string,
  appName: string,
): Promise<IdTokenResponse> {
  const mismatchError = AUTH_ERROR_FACTORY.create(
    AuthErrorCode.USER_MISMATCH,
    {appName}
  );
  try {
    const response = await idTokenResolver;
    if (!response.idToken) {
      throw mismatchError;
    }

    const {sub: localId} = getTokenPayload_(response.idToken);
    if (uid !== localId) {
      throw mismatchError;
    }

    return response;
  } catch (e) {
    // Convert user deleted error into user mismatch
    if (e?.code === `auth/${AuthErrorCode.USER_DELETED}`) {
      throw mismatchError;
    }
    throw e;
  }
}