import { expect } from 'chai';

import { signInAnonymously } from '@firebase/auth-exp/index.browser';
import { OperationType } from '@firebase/auth-types-exp';

import { withTestInstance } from '../helpers/integration/with_test_instance';

describe('integration smoke test', () => {
  it('signs in anonymously', () => {
    return withTestInstance(async auth => {
      const userCred = await signInAnonymously(auth);
      expect(auth.currentUser).to.eq(userCred.user);
      expect(userCred.operationType).to.eq(OperationType.SIGN_IN);
    });
  });
});