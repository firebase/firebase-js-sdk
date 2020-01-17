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

import { Auth } from './auth';
import { UserCredential } from './user_credential';

export class MultiFactorResolver {
  private constructor(
    readonly auth: Auth,
    readonly session: MultiFactorSession,
    readonly multiFactorInfo: MultiFactorInfo[]
  ) {}
  resolveSignIn(assertion: MultiFactorAssertion): Promise<UserCredential> {
    throw new Error('not implemented');
  }
}

export interface MultiFactorGenerator {
  readonly factorId: string;
}

export interface MultiFactorSession {}

export interface MultiFactorUser {
  readonly enrolledFactors: MultiFactorInfo[];
  getSession(): Promise<MultiFactorSession>;
  enroll(
    assertion: MultiFactorAssertion,
    displayName?: string | null
  ): Promise<void>;
  unenroll(option: MultiFactorInfo | string): Promise<void>;
}

export interface MultiFactorAssertion {
  readonly factorId: string;
}

export interface PhoneMultiFactorAssertion extends MultiFactorAssertion {
  readonly factorId: string;
}

export interface MultiFactorInfo {
  readonly uid: string;
  readonly displayName?: string | null;
  readonly enrollmentTime: string;
  readonly factorId: string;
}

export interface PhoneMultiFactorInfo extends MultiFactorInfo {
  readonly phoneNumber: string;
}
