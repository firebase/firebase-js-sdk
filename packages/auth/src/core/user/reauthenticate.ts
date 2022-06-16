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

import { FirebaseError } from '@firebase/util';
import { _processCredentialSavingMfaContextIfNecessary } from '../../mfa/mfa_error';
import { OperationType } from '../../model/enums';
import { UserInternal } from '../../model/user';
import { AuthCredential } from '../credentials';
import { AuthErrorCode } from '../errors';
import { _assert, _fail } from '../util/assert';
import { _parseToken } from './id_token_result';
import { _logoutIfInvalidated } from './invalidation';
import { UserCredentialImpl } from './user_credential_impl';

export async function _reauthenticate(
  user: UserInternal,
  credential: AuthCredential,
  bypassAuthState = false
): Promise<UserCredentialImpl> {
  const { auth } = user;
  const operationType = OperationType.REAUTHENTICATE;

  try {
    const response = await _logoutIfInvalidated(
      user,
      _processCredentialSavingMfaContextIfNecessary(
        auth,
        operationType,
        credential,
        user
      ),
      bypassAuthState
    );
    _assert(response.idToken, auth, AuthErrorCode.INTERNAL_ERROR);
    const parsed = _parseToken(response.idToken);
    _assert(parsed, auth, AuthErrorCode.INTERNAL_ERROR);

    const { sub: localId } = parsed;
    _assert(user.uid === localId, auth, AuthErrorCode.USER_MISMATCH);

    return UserCredentialImpl._forOperation(user, operationType, response);
  } catch (e) {
    // Convert user deleted error into user mismatch
    if ((e as FirebaseError)?.code === `auth/${AuthErrorCode.USER_DELETED}`) {
      _fail(auth, AuthErrorCode.USER_MISMATCH);
    }
    throw e;
  }
}
