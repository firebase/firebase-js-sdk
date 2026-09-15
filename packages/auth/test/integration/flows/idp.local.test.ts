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

// eslint-disable-next-line import/no-extraneous-dependencies
import {
  Auth,
  createUserWithEmailAndPassword,
  FacebookAuthProvider,
  getAdditionalUserInfo,
  GithubAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  OperationType,
  ProviderId,
  signInWithCredential,
  signInWithEmailAndPassword,
  unlink,
  updateEmail,
  updatePassword,
  updateProfile
} from '@firebase/auth';
import { FirebaseError } from '@firebase/util';
import {
  cleanUpTestInstance,
  getTestInstance,
  randomEmail
} from '../../helpers/integration/helpers';
import { generateMiddlewareTests } from './middleware_test_generator';
// These tests handle OAuth sign in, but they're totally headless (they don't
// use the popup/redirect flows). For testing of the popup/redirect flows, look
// under the test/integration/webdriver directory.

describe('Integration test: headless IdP', () => {
  let auth: Auth;
  let oauthIdToken: string;
  let email: string;

  beforeEach(() => {
    auth = getTestInstance(/* requireEmulator */ true);
    email = randomEmail();
    oauthIdToken = JSON.stringify({
      email,
      'email_verified': true,
      sub: `oauthidp--${email}--oauthidp`
    });
  });

  afterEach(async () => {
    await cleanUpTestInstance(auth);
  });

  it('signs in with an OAuth token', async () => {
    const cred = await signInWithCredential(
      auth,
      GoogleAuthProvider.credential(oauthIdToken)
    );
    expect(auth.currentUser).toBe(cred.user);
    expect(cred.operationType).toBe(OperationType.SIGN_IN);

    // Make sure the user is setup correctly
    const { user } = cred;
    expect(user.isAnonymous).toBe(false);
    expect(user.emailVerified).toBe(true);
    expect(user.providerData.length).toBe(1);
    expect(user.providerData[0].providerId).toBe('google.com');
    expect(user.providerData[0].email).toBe(email);

    // Make sure the additional user info is good
    const additionalUserInfo = getAdditionalUserInfo(cred)!;
    expect(additionalUserInfo.isNewUser).toBe(true);
    expect(additionalUserInfo.providerId).toBe('google.com');
  });

  it('allows the user to update profile', async () => {
    const credential = GithubAuthProvider.credential(oauthIdToken);
    const { user } = await signInWithCredential(auth, credential);

    await updateProfile(user, {
      displayName: 'David Copperfield',
      photoURL: 'http://photo.test/david.png'
    });

    // Check everything first
    expect(user.displayName).toBe('David Copperfield');
    expect(user.photoURL).toBe('http://photo.test/david.png');

    await auth.signOut();

    // Sign in again and double check; look at current user this time
    await signInWithCredential(auth, credential);
    expect(auth.currentUser!.displayName).toBe('David Copperfield');
    expect(auth.currentUser!.photoURL).toBe('http://photo.test/david.png');
  });

  it('allows the user to change the email', async () => {
    const credential = FacebookAuthProvider.credential(oauthIdToken);
    const { user } = await signInWithCredential(auth, credential);

    expect(user.email).toBe(email);
    expect(user.emailVerified).toBe(true);

    const newEmail = randomEmail();
    await updateEmail(user, newEmail);

    // Check everything first
    expect(user.email).toBe(newEmail);
    expect(user.emailVerified).toBe(false);

    await auth.signOut();

    // Sign in again
    await signInWithCredential(auth, credential);
    expect(auth.currentUser!.email).toBe(newEmail);
  });

  it('allows the user to set a password', async () => {
    const credential = GoogleAuthProvider.credential(oauthIdToken);
    const { user } = await signInWithCredential(auth, credential);

    expect(user.providerData.length).toBe(1);
    expect(user.providerData[0].providerId).toBe('google.com');

    // Set the password and check provider data
    await updatePassword(user, 'password');
    expect(user.providerData.length).toBe(2);
    expect(user.providerData.map(p => p.providerId)).to.contain.members([
      'google.com',
      'password'
    ]);

    // Sign out and sign in again
    await auth.signOut();
    await signInWithEmailAndPassword(auth, email, 'password');
    expect(auth.currentUser!.providerData.length).toBe(2);
    expect(
      auth.currentUser!.providerData.map(p => p.providerId)
    ).to.contain.members(['google.com', 'password']);

    // Update email, then sign out/sign in again
    const newEmail = randomEmail();
    await updateEmail(auth.currentUser!, newEmail);
    await auth.signOut();
    await signInWithEmailAndPassword(auth, newEmail, 'password');
    expect(auth.currentUser!.providerData.length).toBe(2);
    expect(
      auth.currentUser!.providerData.map(p => p.providerId)
    ).to.contain.members(['google.com', 'password']);
  });

  it('can link with multiple idps', async () => {
    const googleEmail = randomEmail();
    const facebookEmail = randomEmail();

    const googleCredential = GoogleAuthProvider.credential(
      JSON.stringify({
        sub: googleEmail,
        email: googleEmail,
        'email_verified': true
      })
    );

    const facebookCredential = FacebookAuthProvider.credential(
      JSON.stringify({
        sub: facebookEmail,
        email: facebookEmail
      })
    );

    // Link and then test everything
    const { user } = await signInWithCredential(auth, facebookCredential);
    await linkWithCredential(user, googleCredential);
    expect(user.email).toBe(facebookEmail);
    expect(user.emailVerified).toBe(false);
    expect(user.providerData.length).toBe(2);
    expect(
      user.providerData.find(p => p.providerId === 'google.com')!.email
    ).toBe(googleEmail);
    expect(
      user.providerData.find(p => p.providerId === 'facebook.com')!.email
    ).toBe(facebookEmail);

    // Unlink Google and check everything again
    await unlink(user, ProviderId.GOOGLE);
    expect(user.email).toBe(facebookEmail);
    expect(user.emailVerified).toBe(false);
    expect(user.providerData.length).toBe(1);
    expect(user.providerData[0].email).toBe(facebookEmail);
    expect(user.providerData[0].providerId).toBe('facebook.com');
  });

  it('IdP account takes over unverified email', async () => {
    const credential = GoogleAuthProvider.credential(oauthIdToken);
    const { user: emailUser } = await createUserWithEmailAndPassword(
      auth,
      email,
      'password'
    );

    // Check early state
    expect(emailUser.emailVerified).toBe(false);

    // Sign in with the credential and expect auto-linking
    const { user: googleUser } = await signInWithCredential(auth, credential);
    expect(googleUser.uid).toBe(emailUser.uid);
    expect(googleUser.emailVerified).toBe(true);
    expect(auth.currentUser).toBe(googleUser);
    console.log(googleUser.providerData);
    expect(googleUser.providerData.length).toBe(1);
    expect(auth.currentUser!.providerData[0].providerId).toBe('google.com');

    // Signing in with password no longer works
    await expect(
      signInWithEmailAndPassword(auth, email, 'password')
    ).rejects.toThrow(FirebaseError, 'auth/wrong-password');
  });

  it('IdP accounts automatically link with verified emails', async () => {
    const googleCredential = GoogleAuthProvider.credential(
      JSON.stringify({
        sub: email,
        email,
        'email_verified': true
      })
    );

    const githubCredential = GithubAuthProvider.credential(
      JSON.stringify({
        sub: email,
        email,
        'email_verified': true
      })
    );

    // First sign in with Google
    const { user: initialUser } = await signInWithCredential(
      auth,
      googleCredential
    );
    expect(initialUser.providerData.length).toBe(1);
    expect(initialUser.providerData[0].providerId).toBe('google.com');

    await auth.signOut();

    // Now with GitHub
    const { user: githubUser } = await signInWithCredential(
      auth,
      githubCredential
    );
    expect(githubUser.uid).toBe(initialUser.uid);
    expect(githubUser.providerData.length).toBe(2);
    expect(githubUser.providerData.map(p => p.providerId)).to.have.members([
      'google.com',
      'github.com'
    ]);

    await auth.signOut();

    // Sign in once again with the initial credential
    const { user: googleUser } = await signInWithCredential(
      auth,
      googleCredential
    );
    expect(googleUser.uid).toBe(initialUser.uid);
    expect(googleUser.providerData.length).toBe(2);
    expect(googleUser.providerData.map(p => p.providerId)).to.have.members([
      'google.com',
      'github.com'
    ]);
  });

  generateMiddlewareTests(
    () => auth,
    () => {
      return signInWithCredential(
        auth,
        GoogleAuthProvider.credential(oauthIdToken)
      );
    }
  );
});
