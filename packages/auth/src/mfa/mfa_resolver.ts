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

import {
  Auth,
  MultiFactorResolver,
  UserCredential,
  MultiFactorError
} from '../model/public_types';

import { _castAuth } from '../core/auth/auth_impl';
import { AuthErrorCode } from '../core/errors';
import { UserCredentialImpl } from '../core/user/user_credential_impl';
import { _assert, _fail } from '../core/util/assert';
import { UserCredentialInternal } from '../model/user';
import { MultiFactorAssertionImpl } from './mfa_assertion';
import { MultiFactorError as MultiFactorErrorInternal } from './mfa_error';
import { MultiFactorInfoImpl } from './mfa_info';
import { MultiFactorSessionImpl } from './mfa_session';
import { getModularInstance } from '@firebase/util';
import { OperationType } from '../model/enums';

export class MultiFactorResolverImpl implements MultiFactorResolver {
  private constructor(
    readonly session: MultiFactorSessionImpl,
    readonly hints: MultiFactorInfoImpl[],
    private readonly signInResolver: (
      assertion: MultiFactorAssertionImpl
    ) => Promise<UserCredentialInternal>
  ) {}

  /** @internal */
  static _fromError(
    authExtern: Auth,
    error: MultiFactorErrorInternal
  ): MultiFactorResolverImpl {
    const auth = _castAuth(authExtern);
    const serverResponse = error.customData._serverResponse;
    const hints = (serverResponse.mfaInfo || []).map(enrollment =>
      MultiFactorInfoImpl._fromServerResponse(auth, enrollment)
    );

    _assert(
      serverResponse.mfaPendingCredential,
      auth,
      AuthErrorCode.INTERNAL_ERROR
    );
    const session = MultiFactorSessionImpl._fromMfaPendingCredential(
      serverResponse.mfaPendingCredential
    );

    return new MultiFactorResolverImpl(
      session,
      hints,
      async (
        assertion: MultiFactorAssertionImpl
      ): Promise<UserCredentialInternal> => {
        const mfaResponse = await assertion._process(auth, session);
        // Clear out the unneeded fields from the old login response
        delete serverResponse.mfaInfo;
        delete serverResponse.mfaPendingCredential;

        // Use in the new token & refresh token in the old response
        const idTokenResponse = {
          ...serverResponse,
          idToken: mfaResponse.idToken,
          refreshToken: mfaResponse.refreshToken
        };

        // TODO: we should collapse this switch statement into UserCredentialImpl._forOperation and have it support the SIGN_IN case
        switch (error.operationType) {
          case OperationType.SIGN_IN:
            const userCredential =
              await UserCredentialImpl._fromIdTokenResponse(
                auth,
                error.operationType,
                idTokenResponse
              );
            await auth._updateCurrentUser(userCredential.user);
            return userCredential;
          case OperationType.REAUTHENTICATE:
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
    assertionExtern: MultiFactorAssertionImpl
  ): Promise<UserCredential> {
    const assertion = assertionExtern as MultiFactorAssertionImpl;
    return this.signInResolver(assertion);
  }
}

/**
 * Provides a {@link MultiFactorResolver} suitable for completion of a
 * multi-factor flow.
 *
 * @param auth - The {@link Auth} instance.
 * @param error - The {@link MultiFactorError} raised during a sign-in, or
 * reauthentication operation.
 *
 * @public
 */
export function getMultiFactorResolver(
  auth: Auth,
  error: MultiFactorError
): MultiFactorResolver {
  const authModular = getModularInstance(auth);
  const errorInternal = error as MultiFactorErrorInternal;
  _assert(
    error.customData.operationType,
    authModular,
    AuthErrorCode.ARGUMENT_ERROR
  );
  _assert(
    errorInternal.customData._serverResponse?.mfaPendingCredential,
    authModular,
    AuthErrorCode.ARGUMENT_ERROR
  );

  return MultiFactorResolverImpl._fromError(authModular, errorInternal);
}
