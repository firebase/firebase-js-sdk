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

import * as impl from '@firebase/auth-exp/internal';
import * as compat from '@firebase/auth-types';
import * as externs from '@firebase/auth-types-exp';
import '@firebase/installations';
import { User } from './user';
import { FirebaseError } from '@firebase/util';

function credentialFromResponse(
  userCredential: impl.UserCredential
): externs.AuthCredential | null {
  const { providerId, _tokenResponse } = userCredential;
  if (!_tokenResponse) {
    return null;
  }
  // Handle phone Auth credential responses, as they have a different format
  // from other backend responses (i.e. no providerId).
  if ('temporaryProof' in _tokenResponse && 'phoneNumber' in _tokenResponse) {
    return impl.PhoneAuthProvider.credentialFromResult(userCredential);
  }
  // Email and password is not supported as there is no situation where the
  // server would return the password to the client.
  if (!providerId || providerId === externs.ProviderId.PASSWORD) {
    return null;
  }

  switch (providerId) {
    case externs.ProviderId.GOOGLE:
      return impl.GoogleAuthProvider.credentialFromResult(userCredential);
    case externs.ProviderId.FACEBOOK:
      return impl.FacebookAuthProvider.credentialFromResult(userCredential!);
    case externs.ProviderId.GITHUB:
      return impl.GithubAuthProvider.credentialFromResult(userCredential!);
    case externs.ProviderId.TWITTER:
      return impl.TwitterAuthProvider.credentialFromResult(userCredential);
    default:
      const {
        oauthIdToken,
        oauthAccessToken,
        oauthTokenSecret,
        pendingToken,
        nonce
      } = _tokenResponse as impl.SignInWithIdpResponse;
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
      return new impl.OAuthProvider(providerId).credential({
        idToken: oauthIdToken,
        accessToken: oauthAccessToken,
        rawNonce: nonce
      });
  }
}

export async function convertCredential(
  auth: externs.Auth,
  credentialPromise: Promise<externs.UserCredential>
): Promise<compat.UserCredential> {
  let credential: externs.UserCredential;
  try {
    credential = await credentialPromise;
  } catch (e) {
    if (e.code === 'auth/multi-factor-auth-required') {
      e.resolver = impl.getMultiFactorResolver(auth, e);
    }
    throw e;
  }
  const { operationType, user } = await credential;

  return {
    operationType,
    credential: credentialFromResponse(credential as impl.UserCredential),
    user: user as User
  };
}

export async function convertConfirmationResult(
  auth: externs.Auth,
  confirmationResultPromise: Promise<externs.ConfirmationResult>
): Promise<compat.ConfirmationResult> {
  const { verificationId, confirm } = await confirmationResultPromise;
  return {
    verificationId,
    confirm: (verificationCode: string) =>
      convertCredential(auth, confirm(verificationCode))
  };
}
