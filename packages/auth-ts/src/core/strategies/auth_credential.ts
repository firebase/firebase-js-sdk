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
import { UserCredential, OperationType } from '../../model/user_credential';
import { Auth } from '../..';
import {
  initializeCurrentUserFromIdTokenResponse,
  checkIfAlreadyLinked
} from '.';
import { IdTokenResponse, parseIdToken } from '../../model/id_token';
import { User } from '../../model/user';
import {
  PhoneOrOauthTokenResponse,
  SignInWithPhoneNumberResponse,
  SignInWithIdpResponse
} from '../../api/authentication';
import { AuthCredential } from '../../model/auth_credential';
import { PhoneAuthProvider } from '../providers/phone';
import { ProviderId, SignInMethod } from '../providers';
import { GoogleAuthProvider } from '../providers/google';
import { FacebookAuthProvider } from '../providers/facebook';
import { GithubAuthProvider } from '../providers/github';
import { TwitterAuthProvider } from '../providers/twitter';
import { SAML_PROVIDER_PREFIX, SAMLAuthProvider } from '../providers/saml';
import { GenericOAuthCredential } from '../providers/oauth_credential';
import { OAuthProvider } from '../providers/oauth';

export async function signInWithCredential(
  auth: Auth,
  credential: AuthCredential
): Promise<UserCredential> {
  const response: IdTokenResponse = await credential.getIdTokenResponse_(auth);
  const user = await initializeCurrentUserFromIdTokenResponse(auth, response);
  return new UserCredential(user, credential, OperationType.SIGN_IN);
}

export async function linkWithCredential(
  auth: Auth,
  user: User,
  credential: AuthCredential
): Promise<UserCredential> {
  await checkIfAlreadyLinked(auth, user, credential.providerId);
  const token = await user.getIdToken();
  const response = await credential.linkToIdToken_(auth, token);
  const newCred = authCredentialFromTokenResponse(response);
  user.stsTokenManager.updateFromServerResponse(response);
  await user.reload(auth);
  return new UserCredential(user, newCred, OperationType.LINK);
}

export function authCredentialFromTokenResponse(
  response: PhoneOrOauthTokenResponse
): AuthCredential | null {
  const {
    temporaryProof,
    phoneNumber
  } = response as SignInWithPhoneNumberResponse;
  if (temporaryProof && phoneNumber) {
    return PhoneAuthProvider.credentialFromProof(temporaryProof, phoneNumber);
  }

  // Try OAuth
  const {
    providerId,
    oauthAccessToken: accessToken,
    oauthTokenSecret: accessTokenSecret,
    nonce: rawNonce,
    idToken,
    oauthIdToken,
    pendingToken
  } = response as SignInWithIdpResponse;

  if (!providerId || providerId === ProviderId.PASSWORD) {
    return null;
  }

  try {
    switch (providerId) {
      case ProviderId.GOOGLE:
        return GoogleAuthProvider.credential(idToken, accessToken);
      case ProviderId.FACEBOOK:
        return FacebookAuthProvider.credential(accessToken!);
      case ProviderId.GITHUB:
        return GithubAuthProvider.credential(accessToken!);
      case ProviderId.TWITTER:
        return TwitterAuthProvider.credential(accessToken!, accessTokenSecret!);
    }

    if (!accessToken && !accessTokenSecret && !idToken && !pendingToken) {
      return null;
    }

    if (pendingToken) {
      if (providerId.includes(SAML_PROVIDER_PREFIX)) {
        return SAMLAuthProvider.credential(providerId, pendingToken);
      }

      return new GenericOAuthCredential({
        providerId: providerId as ProviderId,
        pendingToken,
        idToken: oauthIdToken,
        accessToken,
        signInMethod: providerId as SignInMethod
      });
    }

    return new OAuthProvider(providerId as ProviderId).credential({
      idToken,
      accessToken,
      rawNonce
    });
  } catch (e) {
    // Swallow errors
  }
  return null;
}

export async function reauthenticateWithCredential(
  auth: Auth,
  user: User,
  credential: AuthCredential
): Promise<UserCredential> {
  const idTokenResponse = await credential.matchIdTokenWithUid_(auth, user.uid);
  user.stsTokenManager.updateFromServerResponse(idTokenResponse);
  const newCred = authCredentialFromTokenResponse(idTokenResponse);
  const userCred = new UserCredential(
    user,
    newCred,
    OperationType.REAUTHENTICATE
  );
  await user.reload(auth);
  return userCred;
}
