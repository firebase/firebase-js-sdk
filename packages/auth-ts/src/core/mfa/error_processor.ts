/**
 * @license
 * Copyright 2019 Google Inc.
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

import { AuthErrorCode } from '../errors';
import { User } from '../../model/user';
import { OperationType } from '../../model/user_credential';
import { IdTokenResponse } from '../../model/id_token';

function processIfMfaError(e: any, user: User|null, operationType: OperationType) {
  if (e.code === AuthErrorCode.MFA_REQUIRED) {
    Object.assign(e, {user, operationType});
  }

  return e;
}

export async function callApiWithMfaContext<T>(cb: () => Promise<T>, operationType: OperationType, user?: User): Promise<T> {
  try {
    return await cb();
  } catch (e) {
    if (e.code === `auth/${AuthErrorCode.MFA_REQUIRED}`) {
      Object.assign(e, {user, operationType});
    }

    throw e;
  }
}