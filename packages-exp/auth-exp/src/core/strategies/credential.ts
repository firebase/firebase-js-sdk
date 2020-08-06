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
import { OperationType, UserCredential } from '@firebase/auth-types-exp';

import { PhoneOrOauthTokenResponse } from '../../api/authentication/mfa';
import { SignInWithPhoneNumberResponse } from '../../api/authentication/sms';
import { Auth } from '../../model/auth';
import { User } from '../../model/user';
import { AuthCredential } from '../credentials';
import { PhoneAuthCredential } from '../credentials/phone';
import { AuthErrorCode } from '../errors';
import { _reloadWithoutSaving } from '../user/reload';
import { UserCredentialImpl } from '../user/user_credential_impl';
import { assert } from '../util/assert';
import { providerDataAsNames } from '../util/providers';

export async function signInWithCredential(
  authExtern: externs.Auth,
  credentialExtern: externs.AuthCredential
): Promise<UserCredential> {
  const auth = authExtern as Auth;
  const credential = credentialExtern as AuthCredential;
  // TODO: handle mfa by wrapping with callApiWithMfaContext
  const response = await credential._getIdTokenResponse(auth);
  const userCredential = await UserCredentialImpl._fromIdTokenResponse(
    auth,
    credential,
    OperationType.SIGN_IN,
    response
  );
  await auth.updateCurrentUser(userCredential.user);
  return userCredential;
}

export async function linkWithCredential(
  userExtern: externs.User,
  credentialExtern: externs.AuthCredential
): Promise<UserCredential> {
  const user = userExtern as User;
  const credential = credentialExtern as AuthCredential;
  await _assertLinkedStatus(false, user, credential.providerId);

  const response = await credential._linkToIdToken(
    user.auth,
    await user.getIdToken()
  );

  const newCred = _authCredentialFromTokenResponse(response);
  await user._updateTokensIfNecessary(response, /* reload */ true);
  return new UserCredentialImpl(user, newCred, OperationType.LINK);
}

export function _authCredentialFromTokenResponse(
  response: PhoneOrOauthTokenResponse
): AuthCredential | null {
  const {
    temporaryProof,
    phoneNumber
  } = response as SignInWithPhoneNumberResponse;
  if (temporaryProof && phoneNumber) {
    return new PhoneAuthCredential({ temporaryProof, phoneNumber });
  }

  // TODO: Handle Oauth cases
  return null;
}

export async function _assertLinkedStatus(
  expected: boolean,
  user: User,
  provider: externs.ProviderId
): Promise<void> {
  await _reloadWithoutSaving(user);
  const providerIds = providerDataAsNames(user.providerData);

  const code =
    expected === false
      ? AuthErrorCode.PROVIDER_ALREADY_LINKED
      : AuthErrorCode.NO_SUCH_PROVIDER;
  assert(providerIds.has(provider) === expected, user.auth.name, code);
}
