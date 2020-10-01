/**
 * @license
 * Copyright 2020 Google LLC
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

import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
  signInAnonymously,
  signInWithEmailAndPassword,
  updateEmail,
  updatePassword
  // eslint-disable-next-line import/no-extraneous-dependencies
} from '@firebase/auth-exp';
import { Auth, OperationType } from '@firebase/auth-types-exp';
import { FirebaseError } from '@firebase/util';

import {
  cleanUpTestInstance,
  getTestInstance,
  randomEmail
} from '../../helpers/integration/helpers';

use(chaiAsPromised);

describe('Integration test: anonymous auth', () => {
  let auth: Auth;
  beforeEach(() => (auth = getTestInstance()));
  afterEach(() => cleanUpTestInstance(auth));

  it('signs in anonymously', async () => {
    const userCred = await signInAnonymously(auth);
    expect(auth.currentUser).to.eq(userCred.user);
    expect(userCred.operationType).to.eq(OperationType.SIGN_IN);

    const user = userCred.user;
    expect(user.isAnonymous).to.be.true;
    expect(user.uid).to.be.a('string');
  });

  it('second sign in on the same device yields same user', async () => {
    const { user: userA } = await signInAnonymously(auth);
    const { user: userB } = await signInAnonymously(auth);

    expect(userA.uid).to.eq(userB.uid);
  });

  context('email/password interaction', () => {
    let email: string;

    beforeEach(() => {
      email = randomEmail();
    });

    it('anonymous / email-password accounts remain independent', async () => {
      let anonCred = await signInAnonymously(auth);
      const emailCred = await createUserWithEmailAndPassword(
        auth,
        email,
        'password'
      );
      expect(emailCred.user.uid).not.to.eql(anonCred.user.uid);

      await auth.signOut();
      anonCred = await signInAnonymously(auth);
      const emailSignIn = await signInWithEmailAndPassword(
        auth,
        email,
        'password'
      );
      expect(emailCred.user.uid).to.eql(emailSignIn.user.uid);
      expect(emailSignIn.user.uid).not.to.eql(anonCred.user.uid);
    });

    it('account can be upgraded by setting email and password', async () => {
      const { user: anonUser } = await signInAnonymously(auth);
      await updateEmail(anonUser, email);
      await updatePassword(anonUser, 'password');

      await auth.signOut();

      const { user: emailPassUser } = await signInWithEmailAndPassword(
        auth,
        email,
        'password'
      );
      expect(emailPassUser.uid).to.eq(anonUser.uid);
    });

    it('account can be linked using email and password', async () => {
      const { user: anonUser } = await signInAnonymously(auth);
      const cred = EmailAuthProvider.credential(email, 'password');
      await linkWithCredential(anonUser, cred);
      await auth.signOut();

      const { user: emailPassUser } = await signInWithEmailAndPassword(
        auth,
        email,
        'password'
      );
      expect(emailPassUser.uid).to.eq(anonUser.uid);
    });

    it('account cannot be linked with existing email/password', async () => {
      await createUserWithEmailAndPassword(auth, email, 'password');
      const { user: anonUser } = await signInAnonymously(auth);
      const cred = EmailAuthProvider.credential(email, 'password');
      await expect(linkWithCredential(anonUser, cred)).to.be.rejectedWith(
        FirebaseError,
        'auth/email-already-in-use'
      );
    });
  });
});
