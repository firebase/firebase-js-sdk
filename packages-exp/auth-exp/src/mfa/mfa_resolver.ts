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

import { _castAuth } from '../core/auth/auth_impl';
import { AuthErrorCode } from '../core/errors';
import { UserCredentialImpl } from '../core/user/user_credential_impl';
import { _assert, _fail } from '../core/util/assert';
import { UserCredential } from '../model/user';
import { MultiFactorAssertion } from './mfa_assertion';
import { MultiFactorError } from './mfa_error';
import { MultiFactorInfo } from './mfa_info';
import { MultiFactorSession } from './mfa_session';

export class MultiFactorResolver implements externs.MultiFactorResolver {
  private constructor(
    readonly session: MultiFactorSession,
    readonly hints: MultiFactorInfo[],
    private readonly signInResolver: (
      assertion: MultiFactorAssertion
    ) => Promise<UserCredential>
  ) {}

  /** @internal */
  static _fromError(
    authExtern: externs.Auth,
    error: MultiFactorError
  ): MultiFactorResolver {
    const auth = _castAuth(authExtern);
    const hints = (error.serverResponse.mfaInfo || []).map(enrollment =>
      MultiFactorInfo._fromServerResponse(auth, enrollment)
    );

    _assert(
      error.serverResponse.mfaPendingCredential,
      auth,
      AuthErrorCode.INTERNAL_ERROR
    );
    const session = MultiFactorSession._fromMfaPendingCredential(
      error.serverResponse.mfaPendingCredential
    );

    return new MultiFactorResolver(
      session,
      hints,
      async (assertion: MultiFactorAssertion): Promise<UserCredential> => {
        const mfaResponse = await assertion._process(auth, session);
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
              error.operationType,
              idTokenResponse
            );
            await auth._updateCurrentUser(userCredential.user);
            return userCredential;
          case externs.OperationType.REAUTHENTICATE:
            _assert(error.user, auth, AuthErrorCode.INTERNAL_ERROR);
            return UserCredentialImpl._forOperation(
              error.user,
              error.operationType,
              idTokenResponse
            );
          default:
            _fail(auth, AuthErrorCode.INTERNAL_ERROR);
        }
      }
    );
  }

  async resolveSignIn(
    assertionExtern: externs.MultiFactorAssertion
  ): Promise<externs.UserCredential> {
    const assertion = assertionExtern as MultiFactorAssertion;
    return this.signInResolver(assertion);
  }
}

/**
 * Provides a {@link @firebase/auth-types#MultiFactorResolver} suitable for completion of a
 * multi-factor flow.
 *
 * @param auth - The auth instance.
 * @param error - The {@link @firebase/auth-types#MultiFactorError} raised during a sign-in, or
 * reauthentication operation.
 *
 * @public
 */
export function getMultiFactorResolver(
  auth: externs.Auth,
  error: externs.MultiFactorError
): externs.MultiFactorResolver {
  const errorInternal = error as MultiFactorError;
  _assert(error.operationType, auth, AuthErrorCode.ARGUMENT_ERROR);
  _assert(error.credential, auth, AuthErrorCode.ARGUMENT_ERROR);
  _assert(
    errorInternal.serverResponse?.mfaPendingCredential,
    auth,
    AuthErrorCode.ARGUMENT_ERROR
  );

  return MultiFactorResolver._fromError(auth, errorInternal);
}
