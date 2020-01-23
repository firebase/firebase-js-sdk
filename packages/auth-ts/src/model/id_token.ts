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

/**
 * Raw encoded JWT
 */
export type IdToken = string;

/**
 * Supported providers
 */
export enum Provider {
  ANONYMOUS = 'anonymous',
  PASSWORD = 'password'
}

/**
 * JWT algorithm section
 */
export interface IdTokenAlgorithm {
  alg: "RS256",
  kid: string,
  typ: "JWT"
}

/**
 * JWT payload section
 */
export interface IdTokenPayload {
  provider_id?: Provider, // eslint-disable-line camelcase
  iss: string,
  aud: string,
  auth_time: number, // eslint-disable-line camelcase
  user_id: string, // eslint-disable-line camelcase
  sub: string,
  iat: number,
  exp: number,
  email_verified?: boolean, // eslint-disable-line camelcase
  firebase: {
    identities: {
      email?: string[]
    },
    sign_in_provider: Provider // eslint-disable-line camelcase
  }
}

/**
 * Parsed IdToken for use in public API
 */
export interface IdTokenResult {
  token: string;
  authTime: string;
  expirationTime: string;
  issuedAtTime: string;
  signInProvider: Provider | null;
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
  const fields = idToken.split('.');
  if (fields.length !== 3) {
    throw new Error('Invalid JWT');
  }
  const payload: IdTokenPayload = JSON.parse(atob(fields[1]));
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
    signInProvider: payload.firebase.sign_in_provider,
    signInSecondFactor: null,
    claims: {}
  };
}

/**
 * Helper function to create JWT ID Tokens given the three components.  Intended to make testing easier.
 * 
 * @param algorithm JWT algorithm
 * @param payload JWT payload
 * @param signature JWT signature
 */
export function encodeIdToken(algorithm: IdTokenAlgorithm, payload: IdTokenPayload, signature: string): IdToken {
  return `${btoa(JSON.stringify(algorithm))}.${btoa(JSON.stringify(payload))}.${signature}`;
}