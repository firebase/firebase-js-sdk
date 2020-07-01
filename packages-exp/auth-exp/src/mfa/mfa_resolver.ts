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
import { AuthErrorCode } from '../core/errors';
import { UserCredentialImpl } from '../core/user/user_credential_impl';
import { assert } from '../core/util/assert';
import { MultiFactorAssertion } from './assertions';
import { MultiFactorError } from './mfa_error';
import { MultiFactorInfo } from './mfa_info';
import { MultiFactorSession } from './mfa_session';

type IdTokenResolver = (response: IdTokenResponse) => Promise<UserCredential>;

export class MultiFactorResolver implements externs.MultiFactorResolver {
  readonly session: MultiFactorSession;

  private constructor(
    readonly auth: Auth,
    mfaPendingCredential: string,
    readonly hints: MultiFactorInfo[],
    private readonly idTokenResolver: IdTokenResolver
  ) {
    this.session = MultiFactorSession._fromMfaPendingCredential(
      mfaPendingCredential
    );
  }

  static _fromError(auth: Auth, error: MultiFactorError): MultiFactorResolver {
    const hints = (error.serverResponse.mfaInfo || []).map(enrollment =>
      MultiFactorInfo._fromServerResponse(auth, enrollment)
    );

    return new MultiFactorResolver(
      auth,
      error.serverResponse.mfaPendingCredential,
      hints,
      async (
        mfaResponse: PhoneOrOauthTokenResponse
      ): Promise<UserCredential> => {
        // Clear out the unneeded fields from the old login response
        delete error.serverResponse.mfaInfo;
        delete error.serverResponse.mfaPendingCredential;

        Object.assign(mfaResponse, error.serverResponse);
        // TODO: we should collapse this if statement into UserCredentialImpl._forOperation and have it support the SIGN_IN case
        if (
          error.user &&
          error.operationType !== externs.OperationType.SIGN_IN
        ) {
          return UserCredentialImpl._forOperation(
            error.user,
            error.operationType,
            mfaResponse
          );
        } else {
          const userCredential = await UserCredentialImpl._fromIdTokenResponse(
            auth,
            error.credential,
            error.operationType,
            mfaResponse
          );
          await auth.updateCurrentUser(userCredential.user);
          return userCredential;
        }
      }
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
  auth: externs.Auth,
  errorExtern: externs.MultiFactorError
): externs.MultiFactorResolver {
  const error = errorExtern as MultiFactorError;
  assert(error.operationType, auth.name, AuthErrorCode.ARGUMENT_ERROR);
  assert(error.credential, auth.name, AuthErrorCode.ARGUMENT_ERROR);
  assert(
    error.serverResponse?.mfaPendingCredential,
    auth.name,
    AuthErrorCode.ARGUMENT_ERROR
  );

  return MultiFactorResolver._fromError(auth as Auth, error);
}
