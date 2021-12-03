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
import { expect, use } from 'chai';
import firebase from '@firebase/app-compat';
// eslint-disable-next-line import/no-extraneous-dependencies
import '@firebase/auth-compat';

import chaiAsPromised from 'chai-as-promised';
import {
  cleanUpTestInstance,
  initializeTestInstance,
  randomEmail
} from '../../helpers/helpers';
import { updateEmulatorProjectConfig } from '../../../../auth/test/helpers/integration/emulator_rest_helpers';

declare const xit: typeof it;

use(chaiAsPromised);

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
    expect(firebase.auth().currentUser).to.eq(cred.user);
    expect(cred.operationType).to.eq('signIn');

    const { user } = cred;
    expect(user!.isAnonymous).to.be.false;
    expect(user!.uid).to.eq(uid);
    expect((await user!.getIdTokenResult(false)).claims.customClaim).to.eq(
      'some-claim'
    );
    expect(user!.providerId).to.eq('firebase');
    expect(cred.additionalUserInfo!.providerId).to.be.null;
    expect(cred.additionalUserInfo!.isNewUser).to.be.true;
  });

  it('uid will overwrite existing user, joining accounts', async () => {
    const { user: anonUser } = await firebase.auth().signInAnonymously();
    const customCred = await firebase.auth().signInWithCustomToken(
      JSON.stringify({
        uid: anonUser!.uid
      })
    );

    expect(firebase.auth().currentUser).to.eq(customCred.user);
    expect(customCred.user!.uid).to.eq(anonUser!.uid);
    expect(customCred.user!.isAnonymous).to.be.false;
  });

  it('allows the user to delete the account', async () => {
    let { user } = await firebase.auth().signInWithCustomToken(customToken);
    await user!.updateProfile({ displayName: 'Display Name' });
    expect(user!.displayName).to.eq('Display Name');

    await user!.delete();
    await expect(user!.reload()).to.be.rejectedWith(
      FirebaseError,
      'auth/user-token-expired'
    );
    expect(firebase.auth().currentUser).to.be.null;

    ({ user } = await firebase.auth().signInWithCustomToken(customToken));
    // New user in the system: the display name should be missing
    expect(user!.displayName).to.be.null;
  });

  it('sign in can be called twice successively', async () => {
    const { user: userA } = await firebase
      .auth()
      .signInWithCustomToken(customToken);
    const { user: userB } = await firebase
      .auth()
      .signInWithCustomToken(customToken);
    expect(userA!.uid).to.eq(userB!.uid);
  });

  it('allows user to update profile', async () => {
    let { user } = await firebase.auth().signInWithCustomToken(customToken);
    await user!.updateProfile({
      displayName: 'Display Name',
      photoURL: 'photo-url'
    });
    expect(user!.displayName).to.eq('Display Name');
    expect(user!.photoURL).to.eq('photo-url');

    await firebase.auth().signOut();

    user = (await firebase.auth().signInWithCustomToken(customToken)).user!;
    expect(user.displayName).to.eq('Display Name');
    expect(user.photoURL).to.eq('photo-url');
  });

  it('token can be refreshed', async () => {
    const { user } = await firebase.auth().signInWithCustomToken(customToken);
    const origToken = await user!.getIdToken();
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(await user!.getIdToken(true)).not.to.eq(origToken);
  });

  it('signing in will not override anonymous user', async () => {
    const { user: anonUser } = await firebase.auth().signInAnonymously();
    const { user: customUser } = await firebase
      .auth()
      .signInWithCustomToken(customToken);
    expect(firebase.auth().currentUser).to.eql(customUser);
    expect(customUser!.uid).not.to.eql(anonUser!.uid);
  });

  context('in passthrough mode', () => {
    beforeEach(async () => {
      const updatedConfig = await updateEmulatorProjectConfig(
        JSON.stringify({
          usageMode: 'PASSTHROUGH'
        })
      );
      expect(updatedConfig).to.eql({
        signIn: { allowDuplicateEmails: false },
        usageMode: 'PASSTHROUGH'
      });
    });

    afterEach(async () => {
      await updateEmulatorProjectConfig(
        JSON.stringify({
          usageMode: 'DEFAULT'
        })
      );
    });

    xit('signs in with custom token in passthrough mode', async () => {
      const cred = await firebase.auth().signInWithCustomToken(customToken);
      expect(firebase.auth().currentUser).to.eq(cred.user);
      expect(cred.operationType).to.eq('signIn');

      const { user } = cred;
      expect(user!.isAnonymous).to.be.false;
      expect(user!.uid).to.eq(uid);
      expect((await user!.getIdTokenResult(false)).claims.customClaim).to.eq(
        'some-claim'
      );
      expect(user!.providerId).to.eq('firebase');
      const additionalUserInfo = cred.additionalUserInfo!;
      expect(additionalUserInfo.providerId).to.be.null;
      expect(additionalUserInfo.isNewUser).to.be.false;
    });

    xit('token can be refreshed in passthrough mode', async () => {
      firebase.auth().setCustomTokenProvider({
        async getCustomToken(): Promise<string> {
          return JSON.stringify({
            uid,
            claims: {
              customClaim: 'other-claim'
            }
          });
        }
      });
      const { user } = await firebase.auth().signInWithCustomToken(customToken);
      const origToken = await user!.getIdToken();
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(await user!.getIdToken(true)).not.to.eq(origToken);
      expect((await user!.getIdTokenResult(false)).claims.customClaim).to.eq(
        'other-claim'
      );
    });
  });

  context('email/password interaction', () => {
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
      expect(emailCred.user!.uid).not.to.eql(customCred.user!.uid);

      await firebase.auth().signOut();
      customCred = await firebase.auth().signInWithCustomToken(customToken);
      const emailSignIn = await firebase
        .auth()
        .signInWithEmailAndPassword(email, 'password');
      expect(emailCred.user!.uid).to.eql(emailSignIn.user!.uid);
      expect(emailSignIn.user!.uid).not.to.eql(customCred.user!.uid);
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
      expect(emailPassUser!.uid).to.eq(customUser!.uid);
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
      expect(emailPassUser!.uid).to.eq(customUser!.uid);
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
      await expect(customUser!.linkWithCredential(cred)).to.be.rejectedWith(
        FirebaseError,
        'auth/email-already-in-use'
      );
    });
  });
});
