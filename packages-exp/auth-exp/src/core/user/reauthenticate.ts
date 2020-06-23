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

import { AuthCredential, OperationType } from '@firebase/auth-types-exp';

import { IdTokenResponse } from '../../model/id_token';
import { User } from '../../model/user';
import { AuthErrorCode } from '../errors';
import { assert, fail } from '../util/assert';
import { _parseToken } from './id_token_result';
import { UserCredentialImpl } from './user_credential_impl';

export async function _reauthenticate<T extends AuthCredential|null>(user: User, reauthAction: Promise<IdTokenResponse>): Promise<UserCredentialImpl<T>> {
  const appName = user.auth.name;
  
  try {
    const response = await reauthAction;
    assert(response.idToken, appName, AuthErrorCode.INTERNAL_ERROR);
    const parsed = _parseToken(response.idToken);
    assert(parsed, appName, AuthErrorCode.INTERNAL_ERROR);

    const { sub: localId } = parsed;
    assert(user.uid === localId, appName, AuthErrorCode.USER_MISMATCH);

    return UserCredentialImpl._forOperation(user, OperationType.REAUTHENTICATE, response);
  } catch (e) {
    // Convert user deleted error into user mismatch
    if (e?.code === `auth/${AuthErrorCode.USER_DELETED}`) {
      fail(appName, AuthErrorCode.USER_MISMATCH);
    }
    throw e;
  }
}