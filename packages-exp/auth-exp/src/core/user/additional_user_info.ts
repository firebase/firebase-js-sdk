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
import {
  AdditionalUserInfo,
  UserProfile,
  ProviderId
} from '@firebase/auth-types-exp';
import { IdTokenResponse, IdTokenResponseKind } from '../../model/id_token';
import { _parseToken } from './id_token_result';

/**
 * Parse the `AdditionalUserInfo` from the ID token response.
 */
export function _fromIdTokenResponse(
  idTokenResponse: IdTokenResponse
): AdditionalUserInfo | null {
  const { providerId } = idTokenResponse;
  const profile = idTokenResponse.rawUserInfo
    ? JSON.parse(idTokenResponse.rawUserInfo)
    : {};
  const isNewUser =
    idTokenResponse.isNewUser ||
    idTokenResponse.kind === IdTokenResponseKind.SignupNewUser;
  if (!providerId && idTokenResponse?.idToken) {
    const providerId = _parseToken(idTokenResponse.idToken)?.firebase?.[
      'sign_in_provider'
    ];
    if (providerId) {
      const filteredProviderId =
        providerId !== ProviderId.ANONYMOUS && providerId !== ProviderId.CUSTOM
          ? (providerId as ProviderId)
          : null;
      // Uses generic class in accordance with the legacy SDK.
      return new GenericAdditionalUserInfo(isNewUser, filteredProviderId);
    }
  }
  if (!providerId) {
    return null;
  }
  switch (providerId) {
    case ProviderId.FACEBOOK:
      return new FacebookAdditionalUserInfo(isNewUser, profile);
    case ProviderId.GITHUB:
      return new GithubAdditionalUserInfo(isNewUser, profile);
    case ProviderId.GOOGLE:
      return new GoogleAdditionalUserInfo(isNewUser, profile);
    case ProviderId.TWITTER:
      return new TwitterAdditionalUserInfo(
        isNewUser,
        profile,
        idTokenResponse.screenName || null
      );
    case ProviderId.CUSTOM:
    case ProviderId.ANONYMOUS:
      return new GenericAdditionalUserInfo(isNewUser, null);
    default:
      return new FederatedAdditionalUserInfo(isNewUser, providerId, profile);
  }
}

class GenericAdditionalUserInfo implements AdditionalUserInfo {
  constructor(
    readonly isNewUser: boolean,
    readonly providerId: ProviderId | null
  ) {}
}

class FederatedAdditionalUserInfo extends GenericAdditionalUserInfo {
  constructor(
    isNewUser: boolean,
    providerId: ProviderId,
    readonly profile: UserProfile
  ) {
    super(isNewUser, providerId);
  }
}

class FederatedAdditionalUserInfoWithUsername extends FederatedAdditionalUserInfo {
  constructor(
    isNewUser: boolean,
    providerId: ProviderId,
    profile: UserProfile,
    readonly username: string | null
  ) {
    super(isNewUser, providerId, profile);
  }
}

class FacebookAdditionalUserInfo extends FederatedAdditionalUserInfo {
  constructor(isNewUser: boolean, profile: UserProfile) {
    super(isNewUser, ProviderId.FACEBOOK, profile);
  }
}

class GithubAdditionalUserInfo extends FederatedAdditionalUserInfoWithUsername {
  constructor(isNewUser: boolean, profile: UserProfile) {
    super(
      isNewUser,
      ProviderId.GITHUB,
      profile,
      typeof profile?.login === 'string' ? profile?.login : null
    );
  }
}

class GoogleAdditionalUserInfo extends FederatedAdditionalUserInfo {
  constructor(isNewUser: boolean, profile: UserProfile) {
    super(isNewUser, ProviderId.GOOGLE, profile);
  }
}

class TwitterAdditionalUserInfo extends FederatedAdditionalUserInfoWithUsername {
  constructor(
    isNewUser: boolean,
    profile: UserProfile,
    screenName: string | null
  ) {
    super(isNewUser, ProviderId.TWITTER, profile, screenName);
  }
}
