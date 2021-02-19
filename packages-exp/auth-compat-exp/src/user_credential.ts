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

import * as exp from '@firebase/auth-exp/internal';
import * as compat from '@firebase/auth-types';
import { User } from './user';

function credentialFromResponse(
  userCredential: exp.UserCredentialInternal
): exp.AuthCredential | null {
  const { providerId, _tokenResponse } = userCredential;
  if (!_tokenResponse) {
    return null;
  }
  // Handle phone Auth credential responses, as they have a different format
  // from other backend responses (i.e. no providerId).
  if ('temporaryProof' in _tokenResponse && 'phoneNumber' in _tokenResponse) {
    return exp.PhoneAuthProvider.credentialFromResult(userCredential);
  }
  // Email and password is not supported as there is no situation where the
  // server would return the password to the client.
  if (!providerId || providerId === exp.ProviderId.PASSWORD) {
    return null;
  }

  switch (providerId) {
    case exp.ProviderId.GOOGLE:
      return exp.GoogleAuthProvider.credentialFromResult(userCredential);
    case exp.ProviderId.FACEBOOK:
      return exp.FacebookAuthProvider.credentialFromResult(userCredential!);
    case exp.ProviderId.GITHUB:
      return exp.GithubAuthProvider.credentialFromResult(userCredential!);
    case exp.ProviderId.TWITTER:
      return exp.TwitterAuthProvider.credentialFromResult(userCredential);
    default:
      const {
        oauthIdToken,
        oauthAccessToken,
        oauthTokenSecret,
        pendingToken,
        nonce
      } = _tokenResponse as exp.SignInWithIdpResponse;
      if (
        !oauthAccessToken &&
        !oauthTokenSecret &&
        !oauthIdToken &&
        !pendingToken
      ) {
        return null;
      }
      // TODO(avolkovi): uncomment this and get it working with SAML & OIDC
      // if (pendingToken) {
      //   if (providerId.indexOf(compat.constants.SAML_PREFIX) == 0) {
      //     return new impl.SAMLAuthCredential(providerId, pendingToken);
      //   } else {
      //     // OIDC and non-default providers excluding Twitter.
      //     return new impl.OAuthCredential(
      //       providerId,
      //       {
      //         pendingToken,
      //         idToken: oauthIdToken,
      //         accessToken: oauthAccessToken
      //       },
      //       providerId);
      //   }
      // }
      return new exp.OAuthProvider(providerId).credential({
        idToken: oauthIdToken,
        accessToken: oauthAccessToken,
        rawNonce: nonce
      });
  }
}

export async function convertCredential(
  auth: exp.Auth,
  credentialPromise: Promise<exp.UserCredential>
): Promise<compat.UserCredential> {
  let credential: exp.UserCredential;
  try {
    credential = await credentialPromise;
  } catch (e) {
    if (e.code === 'auth/multi-factor-auth-required') {
      e.resolver = exp.getMultiFactorResolver(auth, e);
    }
    throw e;
  }
  const { operationType, user } = await credential;

  return {
    operationType,
    credential: credentialFromResponse(
      credential as exp.UserCredentialInternal
    ),
    additionalUserInfo: exp.getAdditionalUserInfo(
      credential as exp.UserCredential
    ),
    user: User.getOrCreate(user)
  };
}

export async function convertConfirmationResult(
  auth: exp.Auth,
  confirmationResultPromise: Promise<exp.ConfirmationResult>
): Promise<compat.ConfirmationResult> {
  const confirmationResultExp = await confirmationResultPromise;
  return {
    verificationId: confirmationResultExp.verificationId,
    confirm: (verificationCode: string) =>
      convertCredential(auth, confirmationResultExp.confirm(verificationCode))
  };
}
