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
import {
  AdditionalUserInfo,
  UserProfile,
  ProviderId
} from '@firebase/auth-types-exp';
import { IdTokenResponse, IdTokenResponseKind } from '../../model/id_token';
import { _parseToken } from './id_token_result';
import { assert } from '../util/assert';

/**
 * Parse the `AdditionalUserInfo` from the ID token response.
 */
export function fromIdTokenResponse(
  idTokenResponse: IdTokenResponse,
  appName: string
): AdditionalUserInfo | null {
  const { providerId } = idTokenResponse;
  const profile = idTokenResponse.rawUserInfo
    ? JSON.parse(idTokenResponse.rawUserInfo)
    : {};
  const isNewUser =
    !!idTokenResponse.isNewUser ||
    idTokenResponse.kind === IdTokenResponseKind.SignupNewUser;
  if (!providerId && !!idTokenResponse) {
    const providerId = _parseToken(idTokenResponse.idToken)?.firebase?.[
      'sign_in_provider'
    ];
    assert(
      // @ts-ignore - Check to see if string is castable to enum.
      !providerId || Object.values(ProviderId).includes(providerId),
      appName
    );
    if (providerId) {
      const filteredProviderId =
        providerId !== ProviderId.ANONYMOUS && providerId !== ProviderId.CUSTOM
          ? (providerId as ProviderId)
          : null;
      // Uses generic class in accordance with the legacy SDK.
      return new GenericAdditionalUserInfo(isNewUser, filteredProviderId, null);
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
      return new GenericAdditionalUserInfo(isNewUser, null, null);
    default:
      return new FederatedAdditionalUserInfo(
        isNewUser,
        providerId,
        null,
        profile
      );
  }
}

class GenericAdditionalUserInfo implements AdditionalUserInfo {
  constructor(
    readonly isNewUser: boolean,
    readonly providerId: ProviderId | null,
    readonly username: string | null
  ) {}
}

class FederatedAdditionalUserInfo extends GenericAdditionalUserInfo {
  constructor(
    isNewUser: boolean,
    providerId: ProviderId | null,
    username: string | null,
    readonly profile: UserProfile
  ) {
    super(isNewUser, providerId, username);
  }
}

class FacebookAdditionalUserInfo extends FederatedAdditionalUserInfo {
  constructor(isNewUser: boolean, profile: UserProfile) {
    super(isNewUser, ProviderId.FACEBOOK, null, profile);
  }
}

class GithubAdditionalUserInfo extends FederatedAdditionalUserInfo {
  constructor(isNewUser: boolean, profile: UserProfile) {
    super(
      isNewUser,
      ProviderId.GITHUB,
      typeof profile?.login === 'string' ? profile?.login : null,
      profile
    );
  }
}

class GoogleAdditionalUserInfo extends FederatedAdditionalUserInfo {
  constructor(isNewUser: boolean, profile: UserProfile) {
    super(isNewUser, ProviderId.GOOGLE, null, profile);
  }
}

class TwitterAdditionalUserInfo extends FederatedAdditionalUserInfo {
  constructor(
    isNewUser: boolean,
    profile: UserProfile,
    screenName: string | null
  ) {
    super(isNewUser, ProviderId.TWITTER, screenName, profile);
  }
}
