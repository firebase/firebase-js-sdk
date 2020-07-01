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
import { FirebaseError } from '@firebase/util';
import { Auth } from '../model/auth';
import { IdTokenResponse } from '../model/id_token';
import { AuthErrorCode } from '../core/errors';
import { User } from '../model/user';
import { AuthCredential } from '../core/credentials';
import { IdTokenMfaResponse } from '../api/authentication/mfa';

export class MultiFactorError extends FirebaseError
  implements externs.MultiFactorError {
  readonly name = 'FirebaseError';
  readonly code: string;
  readonly appName: string;
  readonly serverResponse: IdTokenMfaResponse;

  readonly email?: string;
  readonly phoneNumber?: string;
  readonly tenantid?: string;

  private constructor(
    auth: Auth,
    error: FirebaseError,
    readonly operationType: externs.OperationType,
    readonly credential: AuthCredential,
    readonly user?: User
  ) {
    super(error.code, error.message);
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, MultiFactorError.prototype);
    this.appName = auth.name;
    this.code = error.code;
    this.tenantid = auth.tenantId || undefined;
    this.serverResponse = error.serverResponse as IdTokenMfaResponse;
  }

  static _fromErrorAndCredential(
    auth: Auth,
    error: FirebaseError,
    operationType: externs.OperationType,
    credential: AuthCredential,
    user?: User
  ): MultiFactorError {
    return new MultiFactorError(auth, error, operationType, credential, user);
  }
}

export function _processCredentialSavingMfaContextIfNecessary(
  auth: Auth,
  operationType: externs.OperationType,
  credential: AuthCredential,
  user?: User
): Promise<IdTokenResponse> {
  const idTokenProvider =
    operationType === externs.OperationType.REAUTHENTICATE
      ? credential._getReauthenticationResolver(auth)
      : credential._getIdTokenResponse(auth);

  return idTokenProvider.catch(error => {
    if (error.code === `auth/${AuthErrorCode.MFA_REQUIRED}`) {
      throw MultiFactorError._fromErrorAndCredential(
        auth,
        error,
        operationType,
        credential,
        user
      );
    }

    throw error;
  });
}
