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

import { AdditionalUserInfo, UserCredential } from '../../model/public_types';
import { IdTokenResponse, IdTokenResponseKind } from '../../model/id_token';
import { _parseToken } from './id_token_result';
import { UserCredentialInternal } from '../../model/user';
import { ProviderId } from '../../model/enums';

/**
 * Parse the `AdditionalUserInfo` from the ID token response.
 *
 */
export function _fromIdTokenResponse(
  idTokenResponse?: IdTokenResponse
): AdditionalUserInfo | null {
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
        signInProvider !== ProviderId.ANONYMOUS &&
        signInProvider !== ProviderId.CUSTOM
          ? (signInProvider as ProviderId)
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
      return new GenericAdditionalUserInfo(isNewUser, providerId, profile);
  }
}

class GenericAdditionalUserInfo implements AdditionalUserInfo {
  constructor(
    readonly isNewUser: boolean,
    readonly providerId: ProviderId | string | null,
    readonly profile: Record<string, unknown> = {}
  ) {}
}

class FederatedAdditionalUserInfoWithUsername extends GenericAdditionalUserInfo {
  constructor(
    isNewUser: boolean,
    providerId: ProviderId,
    profile: Record<string, unknown>,
    readonly username: string | null
  ) {
    super(isNewUser, providerId, profile);
  }
}

class FacebookAdditionalUserInfo extends GenericAdditionalUserInfo {
  constructor(isNewUser: boolean, profile: Record<string, unknown>) {
    super(isNewUser, ProviderId.FACEBOOK, profile);
  }
}

class GithubAdditionalUserInfo extends FederatedAdditionalUserInfoWithUsername {
  constructor(isNewUser: boolean, profile: Record<string, unknown>) {
    super(
      isNewUser,
      ProviderId.GITHUB,
      profile,
      typeof profile?.login === 'string' ? profile?.login : null
    );
  }
}

class GoogleAdditionalUserInfo extends GenericAdditionalUserInfo {
  constructor(isNewUser: boolean, profile: Record<string, unknown>) {
    super(isNewUser, ProviderId.GOOGLE, profile);
  }
}

class TwitterAdditionalUserInfo extends FederatedAdditionalUserInfoWithUsername {
  constructor(
    isNewUser: boolean,
    profile: Record<string, unknown>,
    screenName: string | null
  ) {
    super(isNewUser, ProviderId.TWITTER, profile, screenName);
  }
}

/**
 * Extracts provider specific {@link AdditionalUserInfo} for the given credential.
 *
 * @param userCredential - The user credential.
 *
 * @public
 */
export function getAdditionalUserInfo(
  userCredential: UserCredential
): AdditionalUserInfo | null {
  const { user, _tokenResponse } = userCredential as UserCredentialInternal;
  if (user.isAnonymous && !_tokenResponse) {
    // Handle the special case where signInAnonymously() gets called twice.
    // No network call is made so there's nothing to actually fill this in
    return {
      providerId: null,
      isNewUser: false,
      profile: null
    };
  }

  return _fromIdTokenResponse(_tokenResponse);
}
