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
  reload,
  signInWithCredential,
  signInWithEmailAndPassword,
  updateProfile
  // eslint-disable-next-line import/no-extraneous-dependencies
} from '@firebase/auth-exp';
import { Auth, OperationType, UserCredential } from '@firebase/auth-types-exp';
import { FirebaseError } from '@firebase/util';

import {
  cleanUpTestInstance,
  getTestInstance,
  randomEmail
} from '../../helpers/integration/helpers';

use(chaiAsPromised);

describe('Integration test: email/password auth', () => {
  let auth: Auth;
  let email: string;
  beforeEach(() => {
    auth = getTestInstance();
    email = randomEmail();
  });

  afterEach(() => cleanUpTestInstance(auth));

  it('allows user to sign up', async () => {
    const userCred = await createUserWithEmailAndPassword(
      auth,
      email,
      'password'
    );
    expect(auth.currentUser).to.eq(userCred.user);
    expect(userCred.operationType).to.eq(OperationType.SIGN_IN);

    const user = userCred.user;
    expect(user.isAnonymous).to.be.false;
    expect(user.uid).to.be.a('string');
    expect(user.email).to.eq(email);
    expect(user.emailVerified).to.be.false;
  });

  it('errors when createUser called twice', async () => {
    await createUserWithEmailAndPassword(auth, email, 'password');
    await expect(
      createUserWithEmailAndPassword(auth, email, 'password')
    ).to.be.rejectedWith(FirebaseError, 'auth/email-already-in-use');
  });

  context('with existing user', () => {
    let signUpCred: UserCredential;

    beforeEach(async () => {
      signUpCred = await createUserWithEmailAndPassword(
        auth,
        email,
        'password'
      );
      await auth.signOut();
    });

    it('allows the user to sign in with signInWithEmailAndPassword', async () => {
      const signInCred = await signInWithEmailAndPassword(
        auth,
        email,
        'password'
      );
      expect(auth.currentUser).to.eq(signInCred.user);

      expect(signInCred.operationType).to.eq(OperationType.SIGN_IN);
      expect(signInCred.user.uid).to.eq(signUpCred.user.uid);
    });

    it('allows the user to sign in with signInWithCredential', async () => {
      const credential = EmailAuthProvider.credential(email, 'password');
      const signInCred = await signInWithCredential(auth, credential);
      expect(auth.currentUser).to.eq(signInCred.user);

      expect(signInCred.operationType).to.eq(OperationType.SIGN_IN);
      expect(signInCred.user.uid).to.eq(signUpCred.user.uid);
    });

    it('allows the user to update profile', async () => {
      let { user } = await signInWithEmailAndPassword(auth, email, 'password');
      await updateProfile(user, {
        displayName: 'Display Name',
        photoURL: 'photo-url'
      });
      expect(user.displayName).to.eq('Display Name');
      expect(user.photoURL).to.eq('photo-url');

      await auth.signOut();

      user = (await signInWithEmailAndPassword(auth, email, 'password')).user;
      expect(user.displayName).to.eq('Display Name');
      expect(user.photoURL).to.eq('photo-url');
    });

    it('allows the user to delete the account', async () => {
      const { user } = await signInWithEmailAndPassword(
        auth,
        email,
        'password'
      );
      await user.delete();

      await expect(reload(user)).to.be.rejectedWith(
        FirebaseError,
        'auth/user-token-expired'
      );

      expect(auth.currentUser).to.be.null;
      await expect(
        signInWithEmailAndPassword(auth, email, 'password')
      ).to.be.rejectedWith(FirebaseError, 'auth/user-not-found');
    });

    it('sign in can be called twice successively', async () => {
      const { user: userA } = await signInWithEmailAndPassword(
        auth,
        email,
        'password'
      );
      const { user: userB } = await signInWithEmailAndPassword(
        auth,
        email,
        'password'
      );
      expect(userA.uid).to.eq(userB.uid);
    });
  });
});
