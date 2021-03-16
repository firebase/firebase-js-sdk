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

import { FirebaseError } from '@firebase/util';
import firebase from '@firebase/app-compat';
import {
  cleanUpTestInstance,
  initializeTestInstance,
  randomEmail
} from '../../helpers/helpers';
import { UserCredential } from '@firebase/auth-types';

use(chaiAsPromised);

describe('Integration test: email/password auth', () => {
  let email: string;
  beforeEach(() => {
    initializeTestInstance();
    email = randomEmail();
  });

  afterEach(() => cleanUpTestInstance());

  it('allows user to sign up', async () => {
    const userCred = await firebase
      .auth()
      .createUserWithEmailAndPassword(email, 'password');
    expect(firebase.auth().currentUser).to.eq(userCred.user);
    expect(userCred.operationType).to.eq('signIn');

    const user = userCred.user!;
    expect(user.isAnonymous).to.be.false;
    expect(user.uid).to.be.a('string');
    expect(user.email).to.eq(email);
    expect(user.emailVerified).to.be.false;
    expect(user.providerData.length).to.eq(1);
    expect(user.providerData[0]!.providerId).to.eq('password');
    expect(user.providerData[0]!.email).to.eq(email);

    const additionalUserInfo = userCred.additionalUserInfo!;
    expect(additionalUserInfo.isNewUser).to.be.true;
    expect(additionalUserInfo.providerId).to.eq('password');
  });

  it('errors when createUser called twice', async () => {
    await firebase.auth().createUserWithEmailAndPassword(email, 'password');
    await expect(
      firebase.auth().createUserWithEmailAndPassword(email, 'password')
    ).to.be.rejectedWith(FirebaseError, 'auth/email-already-in-use');
  });

  context('with existing user', () => {
    let signUpCred: UserCredential;

    beforeEach(async () => {
      signUpCred = await firebase
        .auth()
        .createUserWithEmailAndPassword(email, 'password');
      await firebase.auth().signOut();
    });

    it('allows the user to sign in with signInWithEmailAndPassword', async () => {
      const signInCred = await firebase
        .auth()
        .signInWithEmailAndPassword(email, 'password');
      expect(firebase.auth().currentUser).to.eq(signInCred.user);

      expect(signInCred.operationType).to.eq('signIn');
      expect(signInCred.user!.uid).to.eq(signUpCred.user!.uid);
      const additionalUserInfo = signInCred.additionalUserInfo!;
      expect(additionalUserInfo.isNewUser).to.be.false;
      expect(additionalUserInfo.providerId).to.eq('password');
    });

    it('allows the user to sign in with signInWithCredential', async () => {
      const credential = firebase.auth.EmailAuthProvider.credential(
        email,
        'password'
      );
      const signInCred = await firebase.auth().signInWithCredential(credential);
      expect(firebase.auth().currentUser).to.eq(signInCred.user);

      expect(signInCred.operationType).to.eq('signIn');
      expect(signInCred.user!.uid).to.eq(signUpCred.user!.uid);
      const additionalUserInfo = signInCred.additionalUserInfo!;
      expect(additionalUserInfo.isNewUser).to.be.false;
      expect(additionalUserInfo.providerId).to.eq('password');
    });

    it('allows the user to update profile', async () => {
      let { user } = await firebase
        .auth()
        .signInWithEmailAndPassword(email, 'password');
      await user!.updateProfile({
        displayName: 'Display Name',
        photoURL: 'photo-url'
      });
      expect(user!.displayName).to.eq('Display Name');
      expect(user!.photoURL).to.eq('photo-url');

      await firebase.auth().signOut();

      user = (
        await firebase.auth().signInWithEmailAndPassword(email, 'password')
      ).user;
      expect(user!.displayName).to.eq('Display Name');
      expect(user!.photoURL).to.eq('photo-url');
    });

    it('allows the user to delete the account', async () => {
      const { user } = await firebase
        .auth()
        .signInWithEmailAndPassword(email, 'password');
      await user!.delete();

      await expect(user!.reload()).to.be.rejectedWith(
        FirebaseError,
        'auth/user-token-expired'
      );

      expect(firebase.auth().currentUser).to.be.null;
      await expect(
        firebase.auth().signInWithEmailAndPassword(email, 'password')
      ).to.be.rejectedWith(FirebaseError, 'auth/user-not-found');
    });

    it('sign in can be called twice successively', async () => {
      const { user: userA } = await firebase
        .auth()
        .signInWithEmailAndPassword(email, 'password');
      const { user: userB } = await firebase
        .auth()
        .signInWithEmailAndPassword(email, 'password');
      expect(userA!.uid).to.eq(userB!.uid);
    });
  });
});
