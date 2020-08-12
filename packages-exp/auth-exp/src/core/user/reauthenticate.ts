/**
 * @license
 * Copyright 2019 Google LLC
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

import { OperationType } from '@firebase/auth-types-exp';
import { _processCredentialSavingMfaContextIfNecessary } from '../../mfa/mfa_error';
import { User } from '../../model/user';
import { AuthCredential } from '../credentials';
import { AuthErrorCode } from '../errors';
import { assert, fail } from '../util/assert';
import { _parseToken } from './id_token_result';
import { UserCredentialImpl } from './user_credential_impl';

export async function _reauthenticate(
  user: User,
  credential: AuthCredential
): Promise<UserCredentialImpl> {
  const appName = user.auth.name;
  const operationType = OperationType.REAUTHENTICATE;

  try {
    const response = await _processCredentialSavingMfaContextIfNecessary(
      user.auth,
      operationType,
      credential,
      user
    );
    assert(response.idToken, AuthErrorCode.INTERNAL_ERROR, { appName });
    const parsed = _parseToken(response.idToken);
    assert(parsed, AuthErrorCode.INTERNAL_ERROR, { appName });

    const { sub: localId } = parsed;
    assert(user.uid === localId, AuthErrorCode.USER_MISMATCH, { appName });

    return UserCredentialImpl._forOperation(user, operationType, response);
  } catch (e) {
    // Convert user deleted error into user mismatch
    if (e?.code === `auth/${AuthErrorCode.USER_DELETED}`) {
      fail(AuthErrorCode.USER_MISMATCH, { appName });
    }
    throw e;
  }
}
