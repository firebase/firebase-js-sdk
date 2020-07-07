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
import { FinalizeMfaResponse } from '../api/authentication/mfa';
import { Auth } from '../model/auth';
import { UserCredential } from '../model/user';
import { AuthErrorCode } from '../core/errors';
import { UserCredentialImpl } from '../core/user/user_credential_impl';
import { assert, fail } from '../core/util/assert';
import { MultiFactorAssertion } from './assertions';
import { MultiFactorError } from './mfa_error';
import { MultiFactorInfo } from './mfa_info';
import { MultiFactorSession } from './mfa_session';

export class MultiFactorResolver implements externs.MultiFactorResolver {
  readonly session: MultiFactorSession;

  private constructor(
    readonly auth: Auth,
    mfaPendingCredential: string,
    readonly hints: MultiFactorInfo[],
    private readonly signInResolver: (
      response: FinalizeMfaResponse
    ) => Promise<UserCredential>
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
      async (mfaResponse: FinalizeMfaResponse): Promise<UserCredential> => {
        // Clear out the unneeded fields from the old login response
        delete error.serverResponse.mfaInfo;
        delete error.serverResponse.mfaPendingCredential;

        // Use in the new token & refresh token in the old response
        const idTokenResponse = {
          ...error.serverResponse,
          idToken: mfaResponse.idToken,
          refreshToken: mfaResponse.refreshToken
        };

        // TODO: we should collapse this switch statement into UserCredentialImpl._forOperation and have it support the SIGN_IN case
        switch (error.operationType) {
          case externs.OperationType.SIGN_IN:
            const userCredential = await UserCredentialImpl._fromIdTokenResponse(
              auth,
              error.credential,
              error.operationType,
              idTokenResponse
            );
            await auth.updateCurrentUser(userCredential.user);
            return userCredential;
          case externs.OperationType.REAUTHENTICATE:
            assert(error.user, auth.name);
            return UserCredentialImpl._forOperation(
              error.user,
              error.operationType,
              idTokenResponse
            );
          default:
            fail(auth.name, AuthErrorCode.INTERNAL_ERROR);
        }
      }
    );
  }

  async resolveSignIn(
    assertionExtern: externs.MultiFactorAssertion
  ): Promise<externs.UserCredential> {
    const assertion = assertionExtern as MultiFactorAssertion;
    const finalizeMfaResponse = await assertion._process(this.session);
    return this.signInResolver(finalizeMfaResponse);
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
