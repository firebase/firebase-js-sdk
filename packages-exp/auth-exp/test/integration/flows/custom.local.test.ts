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

import {
  Auth,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
  OperationType,
  signInAnonymously,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  updateEmail,
  updatePassword
} from '@firebase/auth-exp';
import { FirebaseError } from '@firebase/util';
import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {
  cleanUpTestInstance,
  getTestInstance,
  randomEmail
} from '../../helpers/integration/helpers';

use(chaiAsPromised);

describe('Integration test: custom auth', () => {
  let auth: Auth;

  beforeEach(() => {
    auth = getTestInstance();

    if (!auth.emulatorConfig) {
      throw new Error('Test can only be run against the emulator!');
    }
  });

  afterEach(async () => {
    await cleanUpTestInstance(auth);
  });

  it('signs in with custom token', async () => {
    const cred = await signInWithCustomToken(
      auth,
      JSON.stringify({
        uid: 'custom-uid-yay',
        claims: { customClaim: 'some-claim' }
      })
    );
    expect(auth.currentUser).to.eq(cred.user);
    expect(cred.operationType).to.eq(OperationType.SIGN_IN);

    const { user } = cred;
    expect(user.isAnonymous).to.be.false;
    expect(user.uid).to.eq('custom-uid-yay');
    expect((await user.getIdTokenResult(false)).claims.customClaim).to.eq(
      'some-claim'
    );
    expect(user.providerId).to.eq('firebase');
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
