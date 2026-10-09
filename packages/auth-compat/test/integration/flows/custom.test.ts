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

import { FirebaseError } from '@firebase/util';
import firebase from '@firebase/app-compat';
// eslint-disable-next-line import/no-extraneous-dependencies
import '@firebase/auth-compat';
import {
  cleanUpTestInstance,
  initializeTestInstance,
  randomEmail
} from '../../helpers/helpers';
describe('Integration test: custom auth', () => {
  let customToken: string;
  let uid: string;

  beforeEach(() => {
    initializeTestInstance();
    uid = randomEmail();
    customToken = JSON.stringify({
      uid,
      claims: {
        customClaim: 'some-claim'
      }
    });
  });

  afterEach(async () => {
    await cleanUpTestInstance();
  });

  it('signs in with custom token', async () => {
    const cred = await firebase.auth().signInWithCustomToken(customToken);
    expect(firebase.auth().currentUser).toBe(cred.user);
    expect(cred.operationType).toBe('signIn');

    const { user } = cred;
    expect(user!.isAnonymous).toBe(false);
    expect(user!.uid).toBe(uid);
    expect((await user!.getIdTokenResult(false)).claims.customClaim).toBe(
      'some-claim'
    );
    expect(user!.providerId).toBe('firebase');
    expect(cred.additionalUserInfo!.providerId).toBeNull();
    expect(cred.additionalUserInfo!.isNewUser).toBe(true);
  });

  it('uid will overwrite existing user, joining accounts', async () => {
    const { user: anonUser } = await firebase.auth().signInAnonymously();
    const customCred = await firebase.auth().signInWithCustomToken(
      JSON.stringify({
        uid: anonUser!.uid
      })
    );

    expect(firebase.auth().currentUser).toBe(customCred.user);
    expect(customCred.user!.uid).toBe(anonUser!.uid);
    expect(customCred.user!.isAnonymous).toBe(false);
  });

  it('allows the user to delete the account', async () => {
    let { user } = await firebase.auth().signInWithCustomToken(customToken);
    await user!.updateProfile({ displayName: 'Display Name' });
    expect(user!.displayName).toBe('Display Name');

    await user!.delete();
    await expect(user!.reload()).rejects.toThrow(
      FirebaseError,
      'auth/user-token-expired'
    );
    expect(firebase.auth().currentUser).toBeNull();

    ({ user } = await firebase.auth().signInWithCustomToken(customToken));
    // New user in the system: the display name should be missing
    expect(user!.displayName).toBeNull();
  });

  it('sign in can be called twice successively', async () => {
    const { user: userA } = await firebase
      .auth()
      .signInWithCustomToken(customToken);
    const { user: userB } = await firebase
      .auth()
      .signInWithCustomToken(customToken);
    expect(userA!.uid).toBe(userB!.uid);
  });

  it('allows user to update profile', async () => {
    let { user } = await firebase.auth().signInWithCustomToken(customToken);
    await user!.updateProfile({
      displayName: 'Display Name',
      photoURL: 'photo-url'
    });
    expect(user!.displayName).toBe('Display Name');
    expect(user!.photoURL).toBe('photo-url');

    await firebase.auth().signOut();

    user = (await firebase.auth().signInWithCustomToken(customToken)).user!;
    expect(user.displayName).toBe('Display Name');
    expect(user.photoURL).toBe('photo-url');
  });

  it('token can be refreshed', async () => {
    const { user } = await firebase.auth().signInWithCustomToken(customToken);
    const origToken = await user!.getIdToken();
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(await user!.getIdToken(true)).not.toBe(origToken);
  });

  it('signing in will not override anonymous user', async () => {
    const { user: anonUser } = await firebase.auth().signInAnonymously();
    const { user: customUser } = await firebase
      .auth()
      .signInWithCustomToken(customToken);
    expect(firebase.auth().currentUser).toEqual(customUser);
    expect(customUser!.uid).not.toEqual(anonUser!.uid);
  });

  describe('email/password interaction', () => {
    let email: string;
    let customToken: string;

    beforeEach(() => {
      email = randomEmail();
      customToken = JSON.stringify({
        uid: email
      });
    });

    it('custom / email-password accounts remain independent', async () => {
      let customCred = await firebase.auth().signInWithCustomToken(customToken);
      const emailCred = await firebase
        .auth()
        .createUserWithEmailAndPassword(email, 'password');
      expect(emailCred.user!.uid).not.toEqual(customCred.user!.uid);

      await firebase.auth().signOut();
      customCred = await firebase.auth().signInWithCustomToken(customToken);
      const emailSignIn = await firebase
        .auth()
        .signInWithEmailAndPassword(email, 'password');
      expect(emailCred.user!.uid).toEqual(emailSignIn.user!.uid);
      expect(emailSignIn.user!.uid).not.toEqual(customCred.user!.uid);
    });

    it('account can have email / password attached', async () => {
      const { user: customUser } = await firebase
        .auth()
        .signInWithCustomToken(customToken);
      await customUser!.updateEmail(email);
      await customUser!.updatePassword('password');

      await firebase.auth().signOut();

      const { user: emailPassUser } = await firebase
        .auth()
        .signInWithEmailAndPassword(email, 'password');
      expect(emailPassUser!.uid).toBe(customUser!.uid);
    });

    it('account can be linked using email and password', async () => {
      const { user: customUser } = await firebase
        .auth()
        .signInWithCustomToken(customToken);
      const cred = firebase.auth.EmailAuthProvider.credential(
        email,
        'password'
      );
      await customUser!.linkWithCredential(cred);
      await firebase.auth().signOut();

      const { user: emailPassUser } = await firebase
        .auth()
        .signInWithEmailAndPassword(email, 'password');
      expect(emailPassUser!.uid).toBe(customUser!.uid);
    });

    it('account cannot be linked with existing email/password', async () => {
      await firebase.auth().createUserWithEmailAndPassword(email, 'password');
      const { user: customUser } = await firebase
        .auth()
        .signInWithCustomToken(customToken);
      const cred = firebase.auth.EmailAuthProvider.credential(
        email,
        'password'
      );
      await expect(customUser!.linkWithCredential(cred)).rejects.toThrow(
        FirebaseError,
        'auth/email-already-in-use'
      );
    });
  });
});
