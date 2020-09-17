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

import * as externs from '@firebase/auth-types-exp';

import { deleteLinkedAccounts } from '../../api/account_management/account';
import { _processCredentialSavingMfaContextIfNecessary } from '../../mfa/mfa_error';
import { User, UserCredential } from '../../model/user';
import { AuthCredential } from '../credentials';
import { AuthErrorCode } from '../errors';
import { assert } from '../util/assert';
import { providerDataAsNames } from '../util/providers';
import { _logoutIfInvalidated } from './invalidation';
import { _reloadWithoutSaving } from './reload';
import { UserCredentialImpl } from './user_credential_impl';

/**
 *  This is the externally visible unlink function
 */
export async function unlink(
  userExtern: externs.User,
  providerId: externs.ProviderId
): Promise<externs.User> {
  const user = userExtern as User;
  await _assertLinkedStatus(true, user, providerId);
  const { providerUserInfo } = await deleteLinkedAccounts(user.auth, {
    idToken: await user.getIdToken(),
    deleteProvider: [providerId]
  });

  const providersLeft = providerDataAsNames(providerUserInfo || []);

  user.providerData = user.providerData.filter(pd =>
    providersLeft.has(pd.providerId)
  );
  if (!providersLeft.has(externs.ProviderId.PHONE)) {
    user.phoneNumber = null;
  }

  await user.auth._persistUserIfCurrent(user);
  return user;
}

/**
 * Internal-only link helper
 */
export async function _link(
  user: User,
  credential: AuthCredential
): Promise<UserCredential> {
  const response = await _logoutIfInvalidated(
    user,
    credential._linkToIdToken(user.auth, await user.getIdToken())
  );
  return UserCredentialImpl._forOperation(
    user,
    externs.OperationType.LINK,
    response
  );
}

export async function _assertLinkedStatus(
  expected: boolean,
  user: User,
  provider: string
): Promise<void> {
  await _reloadWithoutSaving(user);
  const providerIds = providerDataAsNames(user.providerData);

  const code =
    expected === false
      ? AuthErrorCode.PROVIDER_ALREADY_LINKED
      : AuthErrorCode.NO_SUCH_PROVIDER;
  assert(providerIds.has(provider) === expected, code, {
    appName: user.auth.name
  });
}
