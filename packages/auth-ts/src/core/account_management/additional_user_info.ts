import {AdditionalUserInfo, ProfileInfo} from '../../model/user';
import {UserCredential} from '../../model/user_credential';

export function getAdditionalUserInfo(
  userCredential: UserCredential): AdditionalUserInfo | null {
  const providerId = userCredential.credential?.providerId || userCredential.user.providerId;
  if (!providerId) {
    return null;
  }
  return null;
}

class GenericAdditionalUserInfo implements AdditionalUserInfo {

  constructor(
    readonly isNewUser: boolean,
    readonly profile: ProfileInfo,
    readonly providerId: string,
    readonly username?: string | null) {}
}


class FederatedAdditionalUserInfo extends GenericAdditionalUserInfo {

}

class FacebookAdditionalUserInfo extends FederatedAdditionalUserInfo {

}
