import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import { FirebaseError } from '@firebase/util';

import { testAuth, testUser } from '../../../test/helpers/mock_auth';
import { Auth } from '../../model/auth';
import { User } from '../../model/user';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';
import { _logoutIfInvalidated } from './invalidation';

use(chaiAsPromised);

describe('src/core/user/invalidation', () => {
  let user: User;
  let auth: Auth;

  beforeEach(async () => {
    auth = await testAuth();
    user = testUser(auth, 'uid');
    await auth.updateCurrentUser(user);
  });

  function makeError(code: AuthErrorCode): FirebaseError {
    return AUTH_ERROR_FACTORY.create(code, {appName: auth.name});
  }

  it('leaves non-invalidation errors alone', async () => {
    const error = makeError(AuthErrorCode.TOO_MANY_ATTEMPTS_TRY_LATER);
    await expect(_logoutIfInvalidated(user, Promise.reject(error))).to.be.rejectedWith(error);
    expect(auth.currentUser).to.eq(user);
  });

  it('does nothing if the promise resolves', async () => {
    await _logoutIfInvalidated(user, Promise.resolve({}));
    expect(auth.currentUser).to.eq(user);
  });

  it('logs out the user if the error is user_disabled', async () => {
    const error = makeError(AuthErrorCode.USER_DISABLED);
    await expect(_logoutIfInvalidated(user, Promise.reject(error))).to.be.rejectedWith(error);
    expect(auth.currentUser).to.be.null;
  });

  it('logs out the user if the error is token_expired', async () => {
    const error = makeError(AuthErrorCode.TOKEN_EXPIRED);
    await expect(_logoutIfInvalidated(user, Promise.reject(error))).to.be.rejectedWith(error);
    expect(auth.currentUser).to.be.null;
  });

  context('with another logged in user', () => {
    let user2: User;

    beforeEach(async () => {
      user2 = testUser(auth, 'uid2');
      await auth.updateCurrentUser(user2);
    });

    it('does not log out user2 if the error is user_disabled', async () => {
      const error = makeError(AuthErrorCode.USER_DISABLED);
      await expect(_logoutIfInvalidated(user, Promise.reject(error))).to.be.rejectedWith(error);
      expect(auth.currentUser).to.eq(user2);
    });
  });
});