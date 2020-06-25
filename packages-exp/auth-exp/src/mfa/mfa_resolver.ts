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
import { PhoneOrOauthTokenResponse } from '../api/authentication/mfa';
import { Auth } from '../model/auth';
import { IdTokenResponse } from '../model/id_token';
import { UserCredential } from '../model/user';
import { AuthCredential } from '../core/credentials';
import { AuthErrorCode } from '../core/errors';
import { UserCredentialImpl } from '../core/user/user_credential_impl';
import { assert } from '../core/util/assert';
import { MultiFactorAssertion } from './assertions';
import { MultiFactorError } from './mfa_error';
import { MultiFactorInfo } from './mfa_info';
import { MultiFactorSession, MultiFactorSessionType } from './mfa_session';

type IdTokenResolver = (response: IdTokenResponse) => Promise<UserCredential>;

export class MultiFactorResolver implements externs.MultiFactorResolver {
  readonly session: MultiFactorSession;

  constructor(
    readonly auth: Auth,
    mfaPendingCredential: string,
    readonly hints: externs.MultiFactorInfo[],
    private readonly idTokenResolver: IdTokenResolver
  ) {
    this.session = new MultiFactorSession(
      MultiFactorSessionType.SIGN_IN,
      mfaPendingCredential
    );
  }

  async resolveSignIn(
    assertionExtern: externs.MultiFactorAssertion
  ): Promise<externs.UserCredential> {
    const assertion = assertionExtern as MultiFactorAssertion;
    const idTokenResponse = await assertion._process(this.session);
    return this.idTokenResolver(idTokenResponse);
  }
}

export function getMultiFactorResolver(
  authExtern: externs.Auth,
  errorExtern: externs.MultiFactorError
): MultiFactorResolver | null {
  const auth = authExtern as Auth;
  const error = errorExtern as MultiFactorError;
  if (!error.serverResponse || !error.operationType) {
    return null;
  }
  assert(error.credential, AuthErrorCode.ARGUMENT_ERROR);
  assert(
    error.serverResponse.mfaPendingCredential,
    AuthErrorCode.ARGUMENT_ERROR
  );
  const hints: externs.MultiFactorInfo[] = [];
  if (error.serverResponse.mfaInfo) {
    error.serverResponse.mfaInfo.forEach(enrollment => {
      hints.push(MultiFactorInfo._fromServerResponse(auth, enrollment));
    });
  }

  return new MultiFactorResolver(
    auth,
    error.serverResponse.mfaPendingCredential,
    hints,
    async (mfaResponse: PhoneOrOauthTokenResponse): Promise<UserCredential> => {
      // Clear out the unneeded fields from the old login response
      delete error.serverResponse.mfaInfo;
      delete error.serverResponse.mfaPendingCredential;

      Object.assign(mfaResponse, error.serverResponse);
      // TODO: we should collapse this if statement into UserCredentialImpl._forOperation and have it support the SIGN_IN case
      if (error.user && error.operationType !== externs.OperationType.SIGN_IN) {
        return UserCredentialImpl._forOperation(
          error.user,
          error.operationType,
          mfaResponse
        );
      } else {
        const userCredential = await UserCredentialImpl._fromIdTokenResponse(
          auth,
          error.credential ? (error.credential as AuthCredential) : null,
          error.operationType,
          mfaResponse
        );
        await auth.updateCurrentUser(userCredential.user);
        return userCredential;
      }
    }
  );
}
