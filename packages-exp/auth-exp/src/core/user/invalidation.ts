import { FirebaseError } from '@firebase/util';

import { User } from '../../model/user';
import { AuthErrorCode } from '../errors';

export async function _logoutIfInvalidated<T>(user: User, promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (e) {
    if (e instanceof FirebaseError && isUserInvalidated(e)) {
      if (user.auth.currentUser === user) {
        await user.auth.signOut();
      }
    }

    throw e;
  }
}

function isUserInvalidated({code}: FirebaseError): boolean {
  return code === `auth/${AuthErrorCode.USER_DISABLED}` ||
    code === `auth/${AuthErrorCode.TOKEN_EXPIRED}`;
}