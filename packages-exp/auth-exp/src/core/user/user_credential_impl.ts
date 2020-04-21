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

import { Auth } from '../../model/auth';
import { AuthCredential } from '../../model/auth_credential';
import { IdTokenResponse } from '../../model/id_token';
import { User } from '../../model/user';
import { OperationType, UserCredential } from '../../model/user_credential';
import { UserImpl } from './user_impl';


export class UserCredentialImpl implements UserCredential {
  constructor(
    public readonly user: User,
    public readonly credential: AuthCredential | null,
    public readonly operationType: OperationType
  ) { }

  static async _fromIdTokenResponse(
    auth: Auth,
    credential: AuthCredential | null,
    operationType: OperationType,
    idTokenResponse: IdTokenResponse
  ): Promise<UserCredential> {
    const user = await UserImpl._fromIdTokenResponse(auth, idTokenResponse);
    // TODO: Rebase and uncomment
    // await auth.updateCurrentUser(user);
    const userCred = new UserCredentialImpl(user, credential, operationType);
    // TODO: handle additional user info
    // updateAdditionalUserInfoFromIdTokenResponse(userCred, idTokenResponse);
    return userCred;
  }
}