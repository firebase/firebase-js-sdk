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
  setCustomTokenProvider,
  signInAnonymously,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  updateEmail,
  updatePassword,
  updateProfile
} from '@firebase/auth';
import { FirebaseError } from '@firebase/util';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { updateEmulatorProjectConfig } from '../../helpers/integration/emulator_rest_helpers';
import {
  cleanUpTestInstance,
  getTestInstance,
  randomEmail
} from '../../helpers/integration/helpers';

declare const xit: typeof it;

use(chaiAsPromised);

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
    expect(auth.currentUser).to.eq(cred.user);
    expect(cred.operationType).to.eq(OperationType.SIGN_IN);

    const { user } = cred;
    expect(user.isAnonymous).to.be.false;
    expect(user.uid).to.eq(uid);
    expect((await user.getIdTokenResult(false)).claims.customClaim).to.eq(
      'some-claim'
    );
    expect(user.providerId).to.eq('firebase');
    const additionalUserInfo = await getAdditionalUserInfo(cred)!;
    expect(additionalUserInfo.providerId).to.be.null;
    expect(additionalUserInfo.isNewUser).to.be.true;
  });

  it('uid will overwrite existing user, joining accounts', async () => {
    const { user: anonUser } = await signInAnonymously(auth);
    const customCred = await signInWithCustomToken(
      auth,
      JSON.stringify({
        uid: anonUser.uid
      })
    );

    expect(auth.currentUser).to.eq(customCred.user);
    expect(customCred.user.uid).to.eq(anonUser.uid);
    expect(customCred.user.isAnonymous).to.be.false;
  });

  it('allows the user to delete the account', async () => {
    let { user } = await signInWithCustomToken(auth, customToken);
    await updateProfile(user, { displayName: 'Display Name' });
    expect(user.displayName).to.eq('Display Name');

    await user.delete();
    await expect(reload(user)).to.be.rejectedWith(
      FirebaseError,
      'auth/user-token-expired'
    );
    expect(auth.currentUser).to.be.null;

    ({ user } = await signInWithCustomToken(auth, customToken));
    // New user in the system: the display name should be missing
    expect(user.displayName).to.be.null;
  });

  it('sign in can be called twice successively', async () => {
    const { user: userA } = await signInWithCustomToken(auth, customToken);
    const { user: userB } = await signInWithCustomToken(auth, customToken);
    expect(userA.uid).to.eq(userB.uid);
  });

  it('allows user to update profile', async () => {
    let { user } = await signInWithCustomToken(auth, customToken);
    await updateProfile(user, {
      displayName: 'Display Name',
      photoURL: 'photo-url'
    });
    expect(user.displayName).to.eq('Display Name');
    expect(user.photoURL).to.eq('photo-url');

    await auth.signOut();

    user = (await signInWithCustomToken(auth, customToken)).user;
    expect(user.displayName).to.eq('Display Name');
    expect(user.photoURL).to.eq('photo-url');
  });

  it('token can be refreshed', async () => {
    const { user } = await signInWithCustomToken(auth, customToken);
    const origToken = await user.getIdToken();
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(await user.getIdToken(true)).not.to.eq(origToken);
  });

  it('signing in will not override anonymous user', async () => {
    const { user: anonUser } = await signInAnonymously(auth);
    const { user: customUser } = await signInWithCustomToken(auth, customToken);
    expect(auth.currentUser).to.eql(customUser);
    expect(customUser.uid).not.to.eql(anonUser.uid);
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
      const cred = await signInWithCustomToken(auth, customToken);
      expect(auth.currentUser).to.eq(cred.user);
      expect(cred.operationType).to.eq(OperationType.SIGN_IN);

      const { user } = cred;
      expect(user.isAnonymous).to.be.false;
      expect(user.uid).to.eq(uid);
      expect((await user.getIdTokenResult(false)).claims.customClaim).to.eq(
        'some-claim'
      );
      expect(user.providerId).to.eq('firebase');
      const additionalUserInfo = await getAdditionalUserInfo(cred)!;
      expect(additionalUserInfo.providerId).to.be.null;
      expect(additionalUserInfo.isNewUser).to.be.false;
    });

    xit('token can be refreshed in passthrough mode', async () => {
      setCustomTokenProvider(auth, {
        async getCustomToken(): Promise<string> {
          return JSON.stringify({
            uid,
            claims: {
              customClaim: 'other-claim'
            }
          });
        }
      });
      const { user } = await signInWithCustomToken(auth, customToken);
      const origToken = await user.getIdToken();
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(await user.getIdToken(true)).not.to.eq(origToken);
      expect((await user.getIdTokenResult(false)).claims.customClaim).to.eq(
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
      let customCred = await signInWithCustomToken(auth, customToken);
      const emailCred = await createUserWithEmailAndPassword(
        auth,
        email,
        'password'
      );
      expect(emailCred.user.uid).not.to.eql(customCred.user.uid);

      await auth.signOut();
      customCred = await signInWithCustomToken(auth, customToken);
      const emailSignIn = await signInWithEmailAndPassword(
        auth,
        email,
        'password'
      );
      expect(emailCred.user.uid).to.eql(emailSignIn.user.uid);
      expect(emailSignIn.user.uid).not.to.eql(customCred.user.uid);
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
      expect(emailPassUser.uid).to.eq(customUser.uid);
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
      expect(emailPassUser.uid).to.eq(customUser.uid);
    });

    it('account cannot be linked with existing email/password', async () => {
      await createUserWithEmailAndPassword(auth, email, 'password');
      const { user: customUser } = await signInWithCustomToken(
        auth,
        customToken
      );
      const cred = EmailAuthProvider.credential(email, 'password');
      await expect(linkWithCredential(customUser, cred)).to.be.rejectedWith(
        FirebaseError,
        'auth/email-already-in-use'
      );
    });
  });
});
