/**
 * @license
 * Copyright 2021 Google LLC
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

import firebase from '@firebase/app-compat';
import {
  cleanUpTestInstance,
  initializeTestInstance,
  randomEmail
} from '../../helpers/helpers';
// These tests handle OAuth sign in, but they're totally headless (they don't
// use the popup/redirect flows).

describe('Integration test: headless IdP', () => {
  let oauthIdToken: string;
  let email: string;

  beforeEach(() => {
    initializeTestInstance();
    email = randomEmail();
    oauthIdToken = JSON.stringify({
      email,
      'email_verified': true,
      sub: `oauthidp--${email}--oauthidp`
    });
  });

  afterEach(async () => {
    await cleanUpTestInstance();
  });

  it('signs in with an OAuth token', async () => {
    const cred = await firebase
      .auth()
      .signInWithCredential(
        firebase.auth.GoogleAuthProvider.credential(oauthIdToken)
      );
    expect(firebase.auth().currentUser).toBe(cred.user);
    expect(cred.operationType).toBe('signIn');

    // Make sure the user is setup correctly
    const user = cred.user!;
    expect(user.isAnonymous).toBe(false);
    expect(user.emailVerified).toBe(true);
    expect(user.providerData.length).toBe(1);
    expect(user.providerData[0]!.providerId).toBe('google.com');
    expect(user.providerData[0]!.email).toBe(email);

    // Make sure the additional user info is good
    const additionalUserInfo = cred.additionalUserInfo!;
    expect(additionalUserInfo.isNewUser).toBe(true);
    expect(additionalUserInfo.providerId).toBe('google.com');
  });

  it('allows the user to update profile', async () => {
    const credential =
      firebase.auth.GithubAuthProvider.credential(oauthIdToken);
    const { user } = await firebase.auth().signInWithCredential(credential);

    await user!.updateProfile({
      displayName: 'David Copperfield',
      photoURL: 'http://photo.test/david.png'
    });

    // Check everything first
    expect(user!.displayName).toBe('David Copperfield');
    expect(user!.photoURL).toBe('http://photo.test/david.png');

    await firebase.auth().signOut();

    // Sign in again and double check; look at current user this time
    await firebase.auth().signInWithCredential(credential);
    expect(firebase.auth().currentUser!.displayName).toBe('David Copperfield');
    expect(firebase.auth().currentUser!.photoURL).toBe(
      'http://photo.test/david.png'
    );
  });

  it('allows the user to change the email', async () => {
    const credential =
      firebase.auth.FacebookAuthProvider.credential(oauthIdToken);
    const { user } = await firebase.auth().signInWithCredential(credential);

    expect(user!.email).toBe(email);
    expect(user!.emailVerified).toBe(true);

    const newEmail = randomEmail();
    await user!.updateEmail(newEmail);

    // Check everything first
    expect(user!.email).toBe(newEmail);
    expect(user!.emailVerified).toBe(false);

    await firebase.auth().signOut();

    // Sign in again
    await firebase.auth().signInWithCredential(credential);
    expect(firebase.auth().currentUser!.email).toBe(newEmail);
  });

  it('allows the user to set a password', async () => {
    const credential =
      firebase.auth.GoogleAuthProvider.credential(oauthIdToken);
    const { user } = await firebase.auth().signInWithCredential(credential);

    expect(user!.providerData.length).toBe(1);
    expect(user!.providerData[0]!.providerId).toBe('google.com');

    // Set the password and check provider data
    await user!.updatePassword('password');
    expect(user!.providerData.length).toBe(2);
    expect(user!.providerData.map(p => p!.providerId)).toEqual(
      expect.arrayContaining(['google.com', 'password'])
    );

    // Sign out and sign in again
    await firebase.auth().signOut();
    await firebase.auth().signInWithEmailAndPassword(email, 'password');
    expect(firebase.auth().currentUser!.providerData.length).toBe(2);
    expect(
      firebase.auth().currentUser!.providerData.map(p => p!.providerId)
    ).toEqual(expect.arrayContaining(['google.com', 'password']));

    // Update email, then sign out/sign in again
    const newEmail = randomEmail();
    await firebase.auth().currentUser!.updateEmail(newEmail);
    await firebase.auth().signOut();
    await firebase.auth().signInWithEmailAndPassword(newEmail, 'password');
    expect(firebase.auth().currentUser!.providerData.length).toBe(2);
    expect(
      firebase.auth().currentUser!.providerData.map(p => p!.providerId)
    ).toEqual(expect.arrayContaining(['google.com', 'password']));
  });

  it('can link with multiple idps', async () => {
    const googleEmail = randomEmail();
    const facebookEmail = randomEmail();

    const googleCredential = firebase.auth.GoogleAuthProvider.credential(
      JSON.stringify({
        sub: googleEmail,
        email: googleEmail,
        'email_verified': true
      })
    );

    const facebookCredential = firebase.auth.FacebookAuthProvider.credential(
      JSON.stringify({
        sub: facebookEmail,
        email: facebookEmail
      })
    );

    // Link and then test everything
    const { user } = await firebase
      .auth()
      .signInWithCredential(facebookCredential);
    await user!.linkWithCredential(googleCredential);
    expect(user!.email).toBe(facebookEmail);
    expect(user!.emailVerified).toBe(false);
    expect(user!.providerData.length).toBe(2);
    expect(
      user!.providerData.find(p => p!.providerId === 'google.com')!.email
    ).toBe(googleEmail);
    expect(
      user!.providerData.find(p => p!.providerId === 'facebook.com')!.email
    ).toBe(facebookEmail);

    // Unlink Google and check everything again
    await user!.unlink('google.com');
    expect(user!.email).toBe(facebookEmail);
    expect(user!.emailVerified).toBe(false);
    expect(user!.providerData.length).toBe(1);
    expect(user!.providerData[0]!.email).toBe(facebookEmail);
    expect(user!.providerData[0]!.providerId).toBe('facebook.com');
  });

  it('IdP account takes over unverified email', async () => {
    const credential =
      firebase.auth.GoogleAuthProvider.credential(oauthIdToken);
    const { user: emailUser } = await firebase
      .auth()
      .createUserWithEmailAndPassword(email, 'password');

    // Check early state
    expect(emailUser!.emailVerified).toBe(false);

    // Sign in with the credential and expect auto-linking
    const { user: googleUser } = await firebase
      .auth()
      .signInWithCredential(credential);
    expect(googleUser!.uid).toBe(emailUser!.uid);
    expect(googleUser!.emailVerified).toBe(true);
    expect(firebase.auth().currentUser).toBe(googleUser);
    expect(googleUser!.providerData.length).toBe(1);
    expect(firebase.auth().currentUser!.providerData[0]!.providerId).toBe(
      'google.com'
    );

    // Signing in with password no longer works
    await expect(
      firebase.auth().signInWithEmailAndPassword(email, 'password')
    ).rejects.toThrow('auth/wrong-password');
  });

  it('IdP accounts automatically link with verified emails', async () => {
    const googleCredential = firebase.auth.GoogleAuthProvider.credential(
      JSON.stringify({
        sub: email,
        email,
        'email_verified': true
      })
    );

    const githubCredential = firebase.auth.GithubAuthProvider.credential(
      JSON.stringify({
        sub: email,
        email,
        'email_verified': true
      })
    );

    // First sign in with Google
    const { user: initialUser } = await firebase
      .auth()
      .signInWithCredential(googleCredential);
    expect(initialUser!.providerData.length).toBe(1);
    expect(initialUser!.providerData[0]!.providerId).toBe('google.com');

    await firebase.auth().signOut();

    // Now with GitHub
    const { user: githubUser } = await firebase
      .auth()
      .signInWithCredential(githubCredential);
    expect(githubUser!.uid).toBe(initialUser!.uid);
    expect(githubUser!.providerData.length).toBe(2);
    expect(githubUser!.providerData.map(p => p!.providerId)).toEqual(
      expect.arrayContaining(['google.com', 'github.com'])
    );

    await firebase.auth().signOut();

    // Sign in once again with the initial credential
    const { user: googleUser } = await firebase
      .auth()
      .signInWithCredential(googleCredential);
    expect(googleUser!.uid).toBe(initialUser!.uid);
    expect(googleUser!.providerData.length).toBe(2);
    expect(googleUser!.providerData.map(p => p!.providerId)).toEqual(
      expect.arrayContaining(['google.com', 'github.com'])
    );
  });
});
