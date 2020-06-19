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

import { ProviderId } from '@firebase/auth-types-exp';

/**
 * Raw encoded JWT
 */
export type IdToken = string;

/**
 * Raw parsed JWT
 */
export interface ParsedIdToken {
  iss: string;
  aud: string;
  exp: number;
  sub: string;
  iat: number;
  email?: string;
  verified: boolean;
  providerId?: string;
  tenantId?: string;
  anonymous: boolean;
  federatedId?: string;
  displayName?: string;
  photoURL?: string;
  toString(): string;
}

/**
 * IdToken as returned by the API
 */
export interface IdTokenResponse {
  providerId?: ProviderId;
  idToken: IdToken;
  refreshToken: string;
  expiresIn: string;
  localId: string;

  // MFA-specific fields
  mfaPendingCredential?: string;
  mfaInfo?: APIMFAInfo[];
  isNewUser?: boolean;
  rawUserInfo?: string;
  screenName?: string | null;
  displayName?: string | null;
  photoUrl?: string | null;
  kind: string;
}

/**
 * MFA Info as returned by the API
 */
export interface APIMFAInfo {
  phoneInfo?: string;
  mfaEnrollmentId?: string;
  displayName?: string;
  enrolledAt?: number;
}
