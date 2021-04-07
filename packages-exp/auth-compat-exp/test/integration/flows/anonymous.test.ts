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

import firebase from '@firebase/app-compat';
import { FirebaseError } from '@firebase/util';
import {
  cleanUpTestInstance,
  initializeTestInstance,
  randomEmail
} from '../../helpers/helpers';

use(chaiAsPromised);

describe('Integration test: anonymous auth', () => {
  beforeEach(() => {
    initializeTestInstance();
  });

  afterEach(async () => {
    await cleanUpTestInstance();
  });

  it('signs in anonymously', async () => {
    const userCred = await firebase.auth().signInAnonymously();
    expect(firebase.auth().currentUser).to.eq(userCred.user);
    expect(userCred.operationType).to.eq('signIn');

    const user = userCred.user!;
    expect(user.isAnonymous).to.be.true;
    expect(user.uid).to.be.a('string');
  });

  it('second sign in on the same device yields same user', async () => {
    const { user: userA } = await firebase.auth().signInAnonymously();
    const { user: userB } = await firebase.auth().signInAnonymously();

    expect(userA!.uid).to.eq(userB!.uid);
  });

  context('email/password interaction', () => {
    let email: string;

    beforeEach(() => {
      email = randomEmail();
    });

    it('anonymous / email-password accounts remain independent', async () => {
      let anonCred = await firebase.auth().signInAnonymously();
      const emailCred = await firebase
        .auth()
        .createUserWithEmailAndPassword(email, 'password');
      expect(emailCred.user!.uid).not.to.eql(anonCred.user!.uid);

      await firebase.auth().signOut();
      anonCred = await firebase.auth().signInAnonymously();
      const emailSignIn = await firebase
        .auth()
        .signInWithEmailAndPassword(email, 'password');
      expect(emailCred.user!.uid).to.eql(emailSignIn.user!.uid);
      expect(emailSignIn.user!.uid).not.to.eql(anonCred.user!.uid);
    });

    it('account can be upgraded by setting email and password', async () => {
      const { user: anonUser } = await firebase.auth().signInAnonymously();
      await anonUser!.updateEmail(email);
      await anonUser!.updatePassword('password');

      await firebase.auth().signOut();

      const {
        user: emailPassUser
      } = await firebase.auth().signInWithEmailAndPassword(email, 'password');
      expect(emailPassUser!.uid).to.eq(anonUser!.uid);
    });

    it('account can be linked using email and password', async () => {
      const { user: anonUser } = await firebase.auth().signInAnonymously();
      const cred = firebase.auth.EmailAuthProvider.credential(
        email,
        'password'
      );
      await anonUser!.linkWithCredential(cred);
      await firebase.auth().signOut();

      const {
        user: emailPassUser
      } = await firebase.auth().signInWithEmailAndPassword(email, 'password');
      expect(emailPassUser!.uid).to.eq(anonUser!.uid);
    });

    it('account cannot be linked with existing email/password', async () => {
      await firebase.auth().createUserWithEmailAndPassword(email, 'password');
      const { user: anonUser } = await firebase.auth().signInAnonymously();
      const cred = firebase.auth.EmailAuthProvider.credential(
        email,
        'password'
      );
      await expect(anonUser!.linkWithCredential(cred)).to.be.rejectedWith(
        FirebaseError,
        'auth/email-already-in-use'
      );
    });
  });
});
