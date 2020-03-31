import { ProviderId } from '../core/providers';
import { UserCredential } from './user_credential';
import { IdTokenResponse, parseIdToken } from './id_token';

export interface AdditionalUserInfo {
  readonly isNewUser: boolean;
  readonly profile: {[key: string]: unknown} | null;
  readonly providerId: ProviderId | null;
  readonly username: string | null;
}

export function getAdditionalUserInfo(userCredential: UserCredential): AdditionalUserInfo | null {
  return additionalInfo.get(userCredential) || null;
}

export function updateAdditionalUserInfoFromIdTokenResponse(userCredential: UserCredential, idTokenResponse: IdTokenResponse) {
  const additionalUserInfo = additionalUserInfoFromIdTokenResponse(idTokenResponse);
  if (!!additionalUserInfo) {
    additionalInfo.set(userCredential, additionalUserInfo);
  }
}

const additionalInfo = new WeakMap<UserCredential, AdditionalUserInfo>();

function additionalUserInfoFromIdTokenResponse(idTokenResponse: IdTokenResponse): AdditionalUserInfo | null {
  const providerId = idTokenResponse.providerId;
  const profile = typeof idTokenResponse.rawUserInfo === 'string' ? JSON.parse(idTokenResponse.rawUserInfo) : {};
  const isNewUser = !!idTokenResponse.isNewUser || idTokenResponse.kind === 'identitytoolkit#SignupNewUserResponse';
  if (!providerId && idTokenResponse.idToken !== undefined) {
    const providerId = parseIdToken(idTokenResponse.idToken).signInProvider;
    return new GenericAdditionalUserInfo(isNewUser, providerId, null, profile);
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
      return new TwitterAdditionalUserInfo(isNewUser, profile, idTokenResponse.screenName || null);
    case ProviderId.CUSTOM:
    case ProviderId.ANONYMOUS:
      return new GenericAdditionalUserInfo(isNewUser, null,null, profile);
    default:
      return new GenericAdditionalUserInfo(isNewUser, providerId, null, profile);
  }
}

class GenericAdditionalUserInfo implements AdditionalUserInfo {
  constructor(readonly isNewUser: boolean,
              readonly providerId: ProviderId | null,
  readonly username: string | null, readonly profile: {[key: string]: unknown} | null) {
  }
}

class FacebookAdditionalUserInfo extends GenericAdditionalUserInfo {
  constructor(isNewUser: boolean, profile: {[key: string]: unknown} | null) {
    super(isNewUser, ProviderId.FACEBOOK, null, profile);
  }
}

class GithubAdditionalUserInfo extends GenericAdditionalUserInfo {
  constructor(isNewUser: boolean, profile: {[key: string]: unknown} | null) {
    super(isNewUser, ProviderId.GITHUB, typeof profile?.login === 'string' ? profile?.login : null, profile);
  }
}

class GoogleAdditionalUserInfo extends GenericAdditionalUserInfo {
  constructor(isNewUser: boolean, profile: {[key: string]: unknown} | null) {
    super(isNewUser, ProviderId.GOOGLE, null, profile);
  }
}

class TwitterAdditionalUserInfo extends GenericAdditionalUserInfo {
  constructor(isNewUser: boolean, profile: {[key: string]: unknown} | null, screenName: string | null) {
    super(isNewUser, ProviderId.TWITTER, screenName, profile);
  }
}
