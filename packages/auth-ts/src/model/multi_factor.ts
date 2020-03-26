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

import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../core/errors';
import { IdTokenResponse, APIMFAInfo } from './id_token';
import { Auth } from './auth';
import { UserCredential } from './user_credential';
import { ProviderId } from '../core/providers';

export enum MultiFactorSessionType {
  ENROLL = 'enroll',
  SIGN_IN = 'signin',
};

export interface MultiFactorAssertion {
  readonly factorId: string;
  process(session: MultiFactorSession, displayName?: string): Promise<IdTokenResponse>;
}

export interface EnrollmentRequestInfo {
  idToken: string;
  displayName?: string;
}

export interface SignInRequestInfo {
  mfaPendingCredential: string;
}

export interface MultiFactorActionOutcome {
  idToken: string,
  refreshToken: string,
}

export interface MultiFactorInfo {
  readonly uid: string;
  readonly displayName?: string | null;
  readonly enrollmentTime: string | null;
  readonly factorId: string;
}

export interface PhoneMultiFactorInfo extends MultiFactorInfo {
  readonly phoneNumber: string;
}

export interface MultiFactorUser {
  readonly enrolledFactors: MultiFactorInfo[];
  getSession(): Promise<MultiFactorSession>;
  enroll(auth: Auth, assertion: MultiFactorAssertion, displayName?: string): Promise<void>;
  unenroll(option: MultiFactorInfo|string): Promise<void>;
}

export interface MultiFactorResolver {
  readonly auth: Auth;
  readonly session: MultiFactorSession;
  readonly hints: MultiFactorInfo[];
  resolveSignIn(assertion: MultiFactorAssertion): Promise<UserCredential>;
}

export class MultiFactorSession {
  readonly type: MultiFactorSessionType;

  constructor(
    private readonly idToken: string|null = null,
    private readonly mfaPendingCredential: string|null = null,
  ) {
    // Exactly one of idToken and mfaPendingCredential should be set
    if (!idToken && !mfaPendingCredential) {
      throw AUTH_ERROR_FACTORY.create(AuthErrorCode.INTERNAL_ERROR, {
        appName: 'TODO',
      });
    }

    if (idToken && mfaPendingCredential) {
      throw AUTH_ERROR_FACTORY.create(AuthErrorCode.INTERNAL_ERROR, {
        appName: 'TODO',
      });
    }

    this.type = idToken ? MultiFactorSessionType.ENROLL : MultiFactorSessionType.SIGN_IN;
  }

  get rawSession(): string {
    // Based on checks in the constructor we know it's safe to assert this
    return (this.idToken ? this.idToken : this.mfaPendingCredential)!;
  }
}

export function extractMfaInfo(mfaInfo: APIMFAInfo[]): MultiFactorInfo[] {
  // For now, only phone is supported
  const factorId = ProviderId.PHONE;

  return mfaInfo.map(ifo => {
    const enrollmentTime = ifo.enrolledAt ? 
        new Date(ifo.enrolledAt).toUTCString() : null;
    return {
      phoneNumber: ifo.phoneInfo,
      uid: ifo.mfaEnrollmentId!,
      enrollmentTime,
      displayName: ifo.displayName,
      factorId,
    };
  });
}