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

// eslint-disable-next-line import/no-extraneous-dependencies
import {
  Auth,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAdditionalUserInfo,
  linkWithCredential,
  OperationType,
  reload,
  signInAnonymously,
  signInWithCustomToken,
  signInWithEmailAndPassword,
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
describe('Integration test: custom auth', () => {
  let auth: Auth;
  let customToken: string;
  let uid: string;

  beforeEach(() => {
    auth = getTestInstance(/* requireEmulator */ true);
    uid = randomEmail();
    customToken = JSON.stringify({
      uid,
      claims: {
        customClaim: 'some-claim'
      }
    });
  });

  afterEach(async () => {
    await cleanUpTestInstance(auth);
  });

  it('signs in with custom token', async () => {
    const cred = await signInWithCustomToken(auth, customToken);
    expect(auth.currentUser).toBe(cred.user);
    expect(cred.operationType).toBe(OperationType.SIGN_IN);

    const { user } = cred;
    expect(user.isAnonymous).toBe(false);
    expect(user.uid).toBe(uid);
    expect((await user.getIdTokenResult(false)).claims.customClaim).toBe(
      'some-claim'
    );
    expect(user.providerId).toBe('firebase');
    const additionalUserInfo = await getAdditionalUserInfo(cred)!;
    expect(additionalUserInfo.providerId).toBeNull();
    expect(additionalUserInfo.isNewUser).toBe(true);
  });

  it('uid will overwrite existing user, joining accounts', async () => {
    const { user: anonUser } = await signInAnonymously(auth);
    const customCred = await signInWithCustomToken(
      auth,
      JSON.stringify({
        uid: anonUser.uid
      })
    );

    expect(auth.currentUser).toBe(customCred.user);
    expect(customCred.user.uid).toBe(anonUser.uid);
    expect(customCred.user.isAnonymous).toBe(false);
  });

  it('allows the user to delete the account', async () => {
    let { user } = await signInWithCustomToken(auth, customToken);
    await updateProfile(user, { displayName: 'Display Name' });
    expect(user.displayName).toBe('Display Name');

    await user.delete();
    await expect(reload(user)).rejects.toThrow(
      FirebaseError,
      'auth/user-token-expired'
    );
    expect(auth.currentUser).toBeNull();

    ({ user } = await signInWithCustomToken(auth, customToken));
    // New user in the system: the display name should be missing
    expect(user.displayName).toBeNull();
  });

  it('sign in can be called twice successively', async () => {
    const { user: userA } = await signInWithCustomToken(auth, customToken);
    const { user: userB } = await signInWithCustomToken(auth, customToken);
    expect(userA.uid).toBe(userB.uid);
  });

  it('allows user to update profile', async () => {
    let { user } = await signInWithCustomToken(auth, customToken);
    await updateProfile(user, {
      displayName: 'Display Name',
      photoURL: 'photo-url'
    });
    expect(user.displayName).toBe('Display Name');
    expect(user.photoURL).toBe('photo-url');

    await auth.signOut();

    user = (await signInWithCustomToken(auth, customToken)).user;
    expect(user.displayName).toBe('Display Name');
    expect(user.photoURL).toBe('photo-url');
  });

  it('token can be refreshed', async () => {
    const { user } = await signInWithCustomToken(auth, customToken);
    const origToken = await user.getIdToken();
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(await user.getIdToken(true)).not.toBe(origToken);
  });

  it('signing in will not override anonymous user', async () => {
    const { user: anonUser } = await signInAnonymously(auth);
    const { user: customUser } = await signInWithCustomToken(auth, customToken);
    expect(auth.currentUser).toEqual(customUser);
    expect(customUser.uid).not.toEqual(anonUser.uid);
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
      let customCred = await signInWithCustomToken(auth, customToken);
      const emailCred = await createUserWithEmailAndPassword(
        auth,
        email,
        'password'
      );
      expect(emailCred.user.uid).not.toEqual(customCred.user.uid);

      await auth.signOut();
      customCred = await signInWithCustomToken(auth, customToken);
      const emailSignIn = await signInWithEmailAndPassword(
        auth,
        email,
        'password'
      );
      expect(emailCred.user.uid).toEqual(emailSignIn.user.uid);
      expect(emailSignIn.user.uid).not.toEqual(customCred.user.uid);
    });

    it('account can have email / password attached', async () => {
      const { user: customUser } = await signInWithCustomToken(
        auth,
        customToken
      );
      await updateEmail(customUser, email);
      await updatePassword(customUser, 'password');

      await auth.signOut();

      const { user: emailPassUser } = await signInWithEmailAndPassword(
        auth,
        email,
        'password'
      );
      expect(emailPassUser.uid).toBe(customUser.uid);
    });

    it('account can be linked using email and password', async () => {
      const { user: customUser } = await signInWithCustomToken(
        auth,
        customToken
      );
      const cred = EmailAuthProvider.credential(email, 'password');
      await linkWithCredential(customUser, cred);
      await auth.signOut();

      const { user: emailPassUser } = await signInWithEmailAndPassword(
        auth,
        email,
        'password'
      );
      expect(emailPassUser.uid).toBe(customUser.uid);
    });

    it('account cannot be linked with existing email/password', async () => {
      await createUserWithEmailAndPassword(auth, email, 'password');
      const { user: customUser } = await signInWithCustomToken(
        auth,
        customToken
      );
      const cred = EmailAuthProvider.credential(email, 'password');
      await expect(linkWithCredential(customUser, cred)).rejects.toThrow(
        FirebaseError,
        'auth/email-already-in-use'
      );
    });
  });

  generateMiddlewareTests(
    () => auth,
    () => {
      return signInWithCustomToken(auth, customToken);
    }
  );
});
