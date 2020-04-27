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
import { AdditionalUserInfo, UserProfile } from '../../model/user';
import { IdTokenResponse, IdTokenResponseKind } from '../../model/id_token';
import { ProviderId } from '../providers';

export function fromIdTokenResponse(
  idTokenResponse: IdTokenResponse
): AdditionalUserInfo | null {
  const { providerId } = idTokenResponse;
  const profile =
    typeof idTokenResponse.rawUserInfo === 'string'
      ? JSON.parse(idTokenResponse.rawUserInfo)
      : {};
  const isNewUser =
    !!idTokenResponse.isNewUser ||
    idTokenResponse.kind === IdTokenResponseKind.SignupNewUser;
  /*
  Uncomment this once ID token parsing is built
  if (!providerId && !!idTokenResponse) {
    const providerId = parseIdToken(idTokenResponse.idToken).signInProvider;
    return new GenericAdditionalUserInfo(isNewUser, providerId, null, profile);
  }
  */
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
      return new GenericAdditionalUserInfo(isNewUser, null, null, profile);
    default:
      return new GenericAdditionalUserInfo(
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
    readonly username: string | null,
    readonly profile: UserProfile
  ) {}
}

class FacebookAdditionalUserInfo extends GenericAdditionalUserInfo {
  constructor(isNewUser: boolean, profile: UserProfile) {
    super(isNewUser, ProviderId.FACEBOOK, null, profile);
  }
}

class GithubAdditionalUserInfo extends GenericAdditionalUserInfo {
  constructor(isNewUser: boolean, profile: UserProfile) {
    super(
      isNewUser,
      ProviderId.GITHUB,
      typeof profile?.login === 'string' ? profile?.login : null,
      profile
    );
  }
}

class GoogleAdditionalUserInfo extends GenericAdditionalUserInfo {
  constructor(isNewUser: boolean, profile: UserProfile) {
    super(isNewUser, ProviderId.GOOGLE, null, profile);
  }
}

class TwitterAdditionalUserInfo extends GenericAdditionalUserInfo {
  constructor(
    isNewUser: boolean,
    profile: UserProfile,
    screenName: string | null
  ) {
    super(isNewUser, ProviderId.TWITTER, screenName, profile);
  }
}
