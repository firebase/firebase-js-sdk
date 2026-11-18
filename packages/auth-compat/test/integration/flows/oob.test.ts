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

import firebase from '@firebase/app-compat';
import {
  getOobCodes,
  OobCodeSession
} from '../../../../auth/test/helpers/integration/emulator_rest_helpers';
import {
  cleanUpTestInstance,
  initializeTestInstance,
  randomEmail
} from '../../helpers/helpers';
import { ActionCodeSettings } from '@firebase/auth-types';

const BASE_SETTINGS: ActionCodeSettings = {
  url: 'http://localhost/action_code_return',
  handleCodeInApp: true
};

describe('Integration test: oob codes', () => {
  let email: string;

  beforeEach(() => {
    initializeTestInstance();
    email = randomEmail();
  });

  afterEach(async () => {
    await cleanUpTestInstance();
  });

  async function code(toEmail: string): Promise<OobCodeSession> {
    const codes = await getOobCodes();
    return codes.reverse().find(({ email }) => email === toEmail)!;
  }

  describe('flows beginning with sendSignInLinkToEmail', () => {
    let oobSession: OobCodeSession;

    beforeEach(async () => {
      oobSession = await sendEmailLink();
    });

    async function sendEmailLink(toEmail = email): Promise<OobCodeSession> {
      await firebase.auth().sendSignInLinkToEmail(toEmail, BASE_SETTINGS);

      // An email has been sent to the user. Normally you'd detect this state
      // when the app redirects back. We will ask the emulator for the results
      // and force the state instead.
      return code(toEmail);
    }

    it('allows user to sign in', async () => {
      const { user, operationType } = await firebase
        .auth()
        .signInWithEmailLink(email, oobSession.oobLink);

      expect(operationType).toBe('signIn');
      expect(user).toBe(firebase.auth().currentUser);
      expect(typeof user!.uid).toBe('string');
      expect(user!.email).toBe(email);
      expect(user!.emailVerified).toBe(true);
      expect(user!.isAnonymous).toBe(false);
    });

    it('sign in works with an email credential', async () => {
      const cred = firebase.auth.EmailAuthProvider.credentialWithLink(
        email,
        oobSession.oobLink
      );
      const { user, operationType } = await firebase
        .auth()
        .signInWithCredential(cred);

      expect(operationType).toBe('signIn');
      expect(user).toBe(firebase.auth().currentUser);
      expect(typeof user!.uid).toBe('string');
      expect(user!.email).toBe(email);
      expect(user!.emailVerified).toBe(true);
      expect(user!.isAnonymous).toBe(false);
    });

    it('reauthenticate works with email credential', async () => {
      let cred = firebase.auth.EmailAuthProvider.credentialWithLink(
        email,
        oobSession.oobLink
      );
      const { user: oldUser } = await firebase
        .auth()
        .signInWithCredential(cred);

      const reauthSession = await sendEmailLink();
      cred = firebase.auth.EmailAuthProvider.credentialWithLink(
        email,
        reauthSession.oobLink
      );
      const { user: newUser, operationType } =
        await oldUser!.reauthenticateWithCredential(cred);

      expect(newUser!.uid).toBe(oldUser!.uid);
      expect(operationType).toBe('reauthenticate');
      expect(firebase.auth().currentUser).toBe(newUser);
    });

    it('reauthenticate throws with different email', async () => {
      let cred = firebase.auth.EmailAuthProvider.credentialWithLink(
        email,
        oobSession.oobLink
      );
      const { user: oldUser } = await firebase
        .auth()
        .signInWithCredential(cred);

      const newEmail = randomEmail();
      const reauthSession = await sendEmailLink(newEmail);
      cred = firebase.auth.EmailAuthProvider.credentialWithLink(
        newEmail,
        reauthSession.oobLink
      );
      await expect(oldUser!.reauthenticateWithCredential(cred)).rejects.toThrow(
        'auth/user-mismatch'
      );
      expect(firebase.auth().currentUser).toBe(oldUser);
    });

    it('reauthenticate throws if user is deleted', async () => {
      let cred = firebase.auth.EmailAuthProvider.credentialWithLink(
        email,
        oobSession.oobLink
      );
      const { user: oldUser } = await firebase
        .auth()
        .signInWithCredential(cred);

      await oldUser!.delete();
      const reauthSession = await sendEmailLink(email);
      cred = firebase.auth.EmailAuthProvider.credentialWithLink(
        email,
        reauthSession.oobLink
      );
      await expect(oldUser!.reauthenticateWithCredential(cred)).rejects.toThrow(
        'auth/user-mismatch'
      );
      expect(firebase.auth().currentUser).toBeNull();
    });

    it('other accounts can be linked', async () => {
      const cred = firebase.auth.EmailAuthProvider.credentialWithLink(
        email,
        oobSession.oobLink
      );
      const { user: original } = await firebase.auth().signInAnonymously();

      expect(original!.isAnonymous).toBe(true);
      const { user: linked, operationType } =
        await original!.linkWithCredential(cred);

      expect(operationType).toBe('link');
      expect(linked!.uid).toBe(original!.uid);
      expect(linked!.isAnonymous).toBe(false);
      expect(firebase.auth().currentUser).toBe(linked);
      expect(linked!.email).toBe(email);
      expect(linked!.emailVerified).toBe(true);
    });

    it('can be linked to a custom token', async () => {
      const { user: original } = await firebase.auth().signInWithCustomToken(
        JSON.stringify({
          uid: 'custom-uid'
        })
      );

      const cred = firebase.auth.EmailAuthProvider.credentialWithLink(
        email,
        oobSession.oobLink
      );
      const { user: linked } = await original!.linkWithCredential(cred);

      expect(linked!.uid).toBe(original!.uid);
      expect(firebase.auth().currentUser).toBe(linked);
      expect(linked!.email).toBe(email);
      expect(linked!.emailVerified).toBe(true);
    });

    it('cannot link if original account is deleted', async () => {
      const cred = firebase.auth.EmailAuthProvider.credentialWithLink(
        email,
        oobSession.oobLink
      );
      const { user } = await firebase.auth().signInAnonymously();

      expect(user!.isAnonymous).toBe(true);
      await user!.delete();
      await expect(user!.linkWithCredential(cred)).rejects.toThrow(
        'auth/user-token-expired'
      );
    });

    it('code can only be used once', async () => {
      const link = oobSession.oobLink;
      await firebase.auth().signInWithEmailLink(email, link);
      await expect(
        firebase.auth().signInWithEmailLink(email, link)
      ).rejects.toThrow('auth/invalid-action-code');
    });

    it('fetchSignInMethodsForEmail returns the correct values', async () => {
      const { user } = await firebase
        .auth()
        .signInWithEmailLink(email, oobSession.oobLink);
      expect(await firebase.auth().fetchSignInMethodsForEmail(email)).toEqual([
        'emailLink'
      ]);

      await user!.updatePassword('password');
      const updatedMethods = await firebase
        .auth()
        .fetchSignInMethodsForEmail(email);
      expect(updatedMethods).toHaveLength(2);
      expect(updatedMethods).toContain('emailLink');
      expect(updatedMethods).toContain('password');
    });

    it('throws an error if the wrong code is provided', async () => {
      const otherSession = await sendEmailLink(randomEmail());
      await expect(
        firebase.auth().signInWithEmailLink(email, otherSession.oobLink)
      ).rejects.toThrow('auth/invalid-email');
    });
  });

  it('can be used to verify email', async () => {
    // Create an unverified user
    const { user } = await firebase
      .auth()
      .createUserWithEmailAndPassword(email, 'password');
    expect(user!.emailVerified).toBe(false);
    expect(await firebase.auth().fetchSignInMethodsForEmail(email)).toEqual([
      'password'
    ]);
    await user!.sendEmailVerification();

    // Apply the email verification code
    await firebase.auth().applyActionCode((await code(email)).oobCode);
    await user!.reload();
    expect(user!.emailVerified).toBe(true);
  });

  it('can be used to initiate password reset', async () => {
    const { user: original } = await firebase
      .auth()
      .createUserWithEmailAndPassword(email, 'password');
    await original!.sendEmailVerification(); // Can only reset verified user emails
    await firebase.auth().applyActionCode((await code(email)).oobCode);

    // Send and confirm the password reset
    await firebase.auth().sendPasswordResetEmail(email);
    const oobCode = (await code(email)).oobCode;
    expect(await firebase.auth().verifyPasswordResetCode(oobCode)).toBe(email);
    await firebase.auth().confirmPasswordReset(oobCode, 'new-password');

    // Make sure the new password works and the old one doesn't
    const { user } = await firebase
      .auth()
      .signInWithEmailAndPassword(email, 'new-password');
    expect(user!.uid).toBe(original!.uid);
    expect(user!.emailVerified).toBe(true);
    expect(await firebase.auth().fetchSignInMethodsForEmail(email)).toEqual([
      'password'
    ]);

    await expect(
      firebase.auth().signInWithEmailAndPassword(email, 'password')
    ).rejects.toThrow('auth/wrong-password');
  });

  // Test is ignored for now as the emulator does not currently support the
  // verify-and-change-email operation.
  // eslint-disable-next-line no-restricted-properties
  it.skip('verifyBeforeUpdateEmail waits until flow completes', async () => {
    const updatedEmail = randomEmail();

    // Create an initial user with the basic email
    await firebase.auth().sendSignInLinkToEmail(email, BASE_SETTINGS);
    const { user } = await firebase
      .auth()
      .signInWithEmailLink(email, (await code(email)).oobLink);
    await user!.verifyBeforeUpdateEmail(updatedEmail, BASE_SETTINGS);
    expect(user!.email).toBe(email);

    // Finish the update email flow
    await firebase.auth().applyActionCode((await code(updatedEmail)).oobCode);
    await user!.reload();
    expect(user!.emailVerified).toBe(true);
    expect(user!.email).toBe(updatedEmail);
    expect(firebase.auth().currentUser).toBe(user);

    // Old email doesn't work but new one does
    await expect(
      firebase.auth().signInWithEmailAndPassword(email, 'password')
    ).rejects.toThrow('auth/alskdjf');
    const { user: newSignIn } = await firebase
      .auth()
      .signInWithEmailAndPassword(updatedEmail, 'password');
    expect(newSignIn!.uid).toBe(user!.uid);
  });
});
