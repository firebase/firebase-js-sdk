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

import {
  MultiFactorResolver,
  MultiFactorSession,
  MultiFactorInfo,
  MultiFactorAssertion,
  extractMfaInfo
} from '../../model/multi_factor';
import { Auth } from '../../model/auth';
import { UserCredential, OperationType } from '../../model/user_credential';
import { IdTokenResponse, verifyTokenResponseUid } from '../../model/id_token';
import { User } from '../../model/user';
import { initializeCurrentUserFromIdTokenResponse } from '../strategies';
import { authCredentialFromTokenResponse } from '../strategies/auth_credential';

interface AnyError extends Error {
  [key: string]: unknown;
}

class MultiFactorResolverImpl implements MultiFactorResolver {
  constructor(
    readonly auth: Auth,
    readonly session: MultiFactorSession,
    readonly hints: MultiFactorInfo[],
    private readonly originalResponse: IdTokenResponse,
    private readonly operationType: OperationType,
    private readonly user: User | null
  ) {}

  async resolveSignIn(
    assertion: MultiFactorAssertion
  ): Promise<UserCredential> {
    const result = await assertion.process(this.session);
    // Clear out the unneeded fields from the old login response
    delete this.originalResponse.mfaInfo;
    delete this.originalResponse.mfaPendingCredential;

    Object.assign(result, this.originalResponse);
    if (this.operationType === OperationType.REAUTHENTICATE && this.user) {
      const idTokenResponse = await verifyTokenResponseUid(
        Promise.resolve(result),
        this.user.uid,
        this.auth.name
      );
      this.user.stsTokenManager.updateFromServerResponse(idTokenResponse);
      const cred = authCredentialFromTokenResponse(idTokenResponse);
      const userCred = new UserCredential(
        this.user,
        cred,
        OperationType.REAUTHENTICATE
      );

      await this.user.reload(this.auth);
      return userCred;
    } else {
      const user = await initializeCurrentUserFromIdTokenResponse(
        this.auth,
        result
      );
      const credential = authCredentialFromTokenResponse(result);
      return new UserCredential(user, credential, OperationType.SIGN_IN);
    }
  }
}

export function getMultiFactorResolver(
  auth: Auth,
  error: AnyError
): MultiFactorResolver | null {
  if (!error.serverResponse || !error.operationType) {
    return null;
  }

  const serverResponse = error.serverResponse as IdTokenResponse;
  const { mfaInfo, mfaPendingCredential } = serverResponse;
  if (!mfaPendingCredential) {
    return null;
  }

  const multiFactorInfo = mfaInfo ? extractMfaInfo(mfaInfo) : [];

  const session = new MultiFactorSession(null, mfaPendingCredential);
  return new MultiFactorResolverImpl(
    auth,
    session,
    multiFactorInfo,
    serverResponse,
    error.operationType as OperationType,
    (error.user as User) || null
  );
}
