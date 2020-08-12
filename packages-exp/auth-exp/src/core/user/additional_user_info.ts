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

import { IdTokenResponse, IdTokenResponseKind } from '../../model/id_token';
import { UserCredential } from '../../model/user';
import { _parseToken } from './id_token_result';

// TODO: Need toJSON

/**
 * Parse the `AdditionalUserInfo` from the ID token response.
 */
export function _fromIdTokenResponse(
  idTokenResponse?: IdTokenResponse
): externs.AdditionalUserInfo | null {
  if (!idTokenResponse) {
    return null;
  }
  const { providerId } = idTokenResponse;
  const profile = idTokenResponse.rawUserInfo
    ? JSON.parse(idTokenResponse.rawUserInfo)
    : {};
  const isNewUser =
    idTokenResponse.isNewUser ||
    idTokenResponse.kind === IdTokenResponseKind.SignupNewUser;
  if (!providerId && idTokenResponse?.idToken) {
    const signInProvider = _parseToken(idTokenResponse.idToken)?.firebase?.[
      'sign_in_provider'
    ];
    if (signInProvider) {
      const filteredProviderId =
        providerId !== externs.ProviderId.ANONYMOUS &&
        providerId !== externs.ProviderId.CUSTOM
          ? (signInProvider as externs.ProviderId)
          : null;
      // Uses generic class in accordance with the legacy SDK.
      return new GenericAdditionalUserInfo(isNewUser, filteredProviderId);
    }
  }
  if (!providerId) {
    return null;
  }
  switch (providerId) {
    case externs.ProviderId.FACEBOOK:
      return new FacebookAdditionalUserInfo(isNewUser, profile);
    case externs.ProviderId.GITHUB:
      return new GithubAdditionalUserInfo(isNewUser, profile);
    case externs.ProviderId.GOOGLE:
      return new GoogleAdditionalUserInfo(isNewUser, profile);
    case externs.ProviderId.TWITTER:
      return new TwitterAdditionalUserInfo(
        isNewUser,
        profile,
        idTokenResponse.screenName || null
      );
    case externs.ProviderId.CUSTOM:
    case externs.ProviderId.ANONYMOUS:
      return new GenericAdditionalUserInfo(isNewUser, null);
    default:
      return new GenericAdditionalUserInfo(isNewUser, providerId, profile);
  }
}

class GenericAdditionalUserInfo implements externs.AdditionalUserInfo {
  constructor(
    readonly isNewUser: boolean,
    readonly providerId: externs.ProviderId | null,
    readonly profile: externs.UserProfile = {}
  ) {}
}

class FederatedAdditionalUserInfoWithUsername extends GenericAdditionalUserInfo {
  constructor(
    isNewUser: boolean,
    providerId: externs.ProviderId,
    profile: externs.UserProfile,
    readonly username: string | null
  ) {
    super(isNewUser, providerId, profile);
  }
}

class FacebookAdditionalUserInfo extends GenericAdditionalUserInfo {
  constructor(isNewUser: boolean, profile: externs.UserProfile) {
    super(isNewUser, externs.ProviderId.FACEBOOK, profile);
  }
}

class GithubAdditionalUserInfo extends FederatedAdditionalUserInfoWithUsername {
  constructor(isNewUser: boolean, profile: externs.UserProfile) {
    super(
      isNewUser,
      externs.ProviderId.GITHUB,
      profile,
      typeof profile?.login === 'string' ? profile?.login : null
    );
  }
}

class GoogleAdditionalUserInfo extends GenericAdditionalUserInfo {
  constructor(isNewUser: boolean, profile: externs.UserProfile) {
    super(isNewUser, externs.ProviderId.GOOGLE, profile);
  }
}

class TwitterAdditionalUserInfo extends FederatedAdditionalUserInfoWithUsername {
  constructor(
    isNewUser: boolean,
    profile: externs.UserProfile,
    screenName: string | null
  ) {
    super(isNewUser, externs.ProviderId.TWITTER, profile, screenName);
  }
}

export function getAdditionalUserInfo(
  userCredential: externs.UserCredential
): externs.AdditionalUserInfo | null {
  return _fromIdTokenResponse(
    (userCredential as UserCredential)._tokenResponse
  );
}
