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

import { Auth } from '../../model/auth';
import { UserCredential } from '../../model/user_credential';
import { User } from '../../model/user';
import * as api from '../../api/authentication';
import { ActionCodeSettings } from '../../model/action_code';
import { AUTH_ERROR_FACTORY, AuthError } from '../errors';

export async function createUserWithEmailAndPassword(
  auth: Auth,
  email: string,
  password: string
): Promise<UserCredential> {
  const { refreshToken, localId, idToken } = await api.signUp(auth, {
    returnSecureToken: true,
    email,
    password
  });
  if (!refreshToken || !idToken) {
    // TODO: throw proper AuthError
    throw new Error('token missing');
  }
  const user = new User(refreshToken, localId, idToken);
  await auth.setCurrentUser(user);
  return new UserCredential(user);
}

export async function signInWithEmailAndPassword(
  auth: Auth,
  email: string,
  password: string
): Promise<UserCredential> {
  const { refreshToken, localId, idToken } = await api.signInWithPassword(
    auth,
    {
      returnSecureToken: true,
      email,
      password
    }
  );
  if (!refreshToken || !idToken) {
    // TODO: throw proper AuthError
    throw new Error('token missing');
  }
  const user = new User(refreshToken, localId, idToken);
  await auth.setCurrentUser(user);
  return new UserCredential(user!);
}

function setActionCodeSettingsOnRequest(
  request: api.GetOobCodeRequest,
  actionCodeSettings: ActionCodeSettings
): void {
  request.continueUrl = actionCodeSettings.url;
  request.dynamicLinkDomain = actionCodeSettings.dynamicLinkDomain;
  request.canHandleCodeInApp = actionCodeSettings.handleCodeInApp;

  if (actionCodeSettings.iOS) {
    request.iosBundleId = actionCodeSettings.iOS.bundleId;
    request.iosAppStoreId = actionCodeSettings.iOS.appStoreId;
  }

  if (actionCodeSettings.android) {
    request.androidInstallApp = actionCodeSettings.android.installApp;
    request.androidMinimumVersionCode =
      actionCodeSettings.android.minimumVersion;
    request.androidPackageName = actionCodeSettings.android.packageName;
  }
}

export async function sendEmailVerification(
  auth: Auth,
  user: User,
  actionCodeSettings?: ActionCodeSettings
): Promise<void> {
  const email = user.email;
  if (!email) {
    throw AUTH_ERROR_FACTORY.create(AuthError.INVALID_EMAIL, {
      appName: auth.name
    });
  }

  const idToken = await user.getIdToken();
  const request: api.GetOobCodeRequest = {
    reqType: api.GetOobCodeRequestType.EMAIL_SIGNIN,
    email,
    idToken
  };
  if (actionCodeSettings) {
    setActionCodeSettingsOnRequest(request, actionCodeSettings);
  }

  const response = await api.sendEmailVerificationLink(auth, request);

  if (response.email !== email) {
    await user.reload();
  }
}
