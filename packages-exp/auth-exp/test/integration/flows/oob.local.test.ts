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
  ActionCodeSettings,
  applyActionCode,
  Auth,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  OperationType,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInAnonymously,
  SignInMethod,
  signInWithCredential,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  updatePassword,
  verifyBeforeUpdateEmail,
  verifyPasswordResetCode
  // eslint-disable-next-line import/no-extraneous-dependencies
} from '@firebase/auth-exp';
import { FirebaseError } from '@firebase/util';
import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {
  getOobCodes,
  OobCodeSession
} from '../../helpers/integration/emulator_rest_helpers';
import {
  cleanUpTestInstance,
  getTestInstance,
  randomEmail
} from '../../helpers/integration/helpers';

use(chaiAsPromised);

declare const xit: typeof it;

const BASE_SETTINGS: ActionCodeSettings = {
  url: 'http://localhost/action_code_return',
  handleCodeInApp: true
};

describe('Integration test: oob codes', () => {
  let auth: Auth;
  let email: string;

  beforeEach(() => {
    auth = getTestInstance(/* requireEmulator */ true);
    email = randomEmail();
  });

  afterEach(async () => {
    await cleanUpTestInstance(auth);
  });

  async function code(toEmail: string): Promise<OobCodeSession> {
    const codes = await getOobCodes();
    return codes.reverse().find(({ email }) => email === toEmail)!;
  }

  context('flows beginning with sendSignInLinkToEmail', () => {
    let oobSession: OobCodeSession;

    beforeEach(async () => {
      oobSession = await sendEmailLink();
    });

    async function sendEmailLink(toEmail = email): Promise<OobCodeSession> {
      await sendSignInLinkToEmail(auth, toEmail, BASE_SETTINGS);

      // An email has been sent to the user. Normally you'd detect this state
      // when the app redirects back. We will ask the emulator for the results
      // and force the state instead.
      return code(toEmail);
    }

    it('allows user to sign in', async () => {
      const { user, operationType } = await signInWithEmailLink(
        auth,
        email,
        oobSession.oobLink
      );

      expect(operationType).to.eq(OperationType.SIGN_IN);
      expect(user).to.eq(auth.currentUser);
      expect(user.uid).to.be.a('string');
      expect(user.email).to.eq(email);
      expect(user.emailVerified).to.be.true;
      expect(user.isAnonymous).to.be.false;
    });

    it('sign in works with an email credential', async () => {
      const cred = EmailAuthProvider.credentialWithLink(
        email,
        oobSession.oobLink
      );
      const { user, operationType } = await signInWithCredential(auth, cred);

      expect(operationType).to.eq(OperationType.SIGN_IN);
      expect(user).to.eq(auth.currentUser);
      expect(user.uid).to.be.a('string');
      expect(user.email).to.eq(email);
      expect(user.emailVerified).to.be.true;
      expect(user.isAnonymous).to.be.false;
    });

    it('reauthenticate works with email credential', async () => {
      let cred = EmailAuthProvider.credentialWithLink(
        email,
        oobSession.oobLink
      );
      const { user: oldUser } = await signInWithCredential(auth, cred);

      const reauthSession = await sendEmailLink();
      cred = EmailAuthProvider.credentialWithLink(email, reauthSession.oobLink);
      const {
        user: newUser,
        operationType
      } = await reauthenticateWithCredential(oldUser, cred);

      expect(newUser.uid).to.eq(oldUser.uid);
      expect(operationType).to.eq(OperationType.REAUTHENTICATE);
      expect(auth.currentUser).to.eq(newUser);
    });

    it('reauthenticate throws with different email', async () => {
      let cred = EmailAuthProvider.credentialWithLink(
        email,
        oobSession.oobLink
      );
      const { user: oldUser } = await signInWithCredential(auth, cred);

      const newEmail = randomEmail();
      const reauthSession = await sendEmailLink(newEmail);
      cred = EmailAuthProvider.credentialWithLink(
        newEmail,
        reauthSession.oobLink
      );
      await expect(
        reauthenticateWithCredential(oldUser, cred)
      ).to.be.rejectedWith(FirebaseError, 'auth/user-mismatch');
      expect(auth.currentUser).to.eq(oldUser);
    });

    it('reauthenticate throws if user is deleted', async () => {
      let cred = EmailAuthProvider.credentialWithLink(
        email,
        oobSession.oobLink
      );
      const { user: oldUser } = await signInWithCredential(auth, cred);

      await deleteUser(oldUser);
      const reauthSession = await sendEmailLink(email);
      cred = EmailAuthProvider.credentialWithLink(email, reauthSession.oobLink);
      await expect(
        reauthenticateWithCredential(oldUser, cred)
      ).to.be.rejectedWith(FirebaseError, 'auth/user-mismatch');
      expect(auth.currentUser).to.be.null;
    });

    it('other accounts can be linked', async () => {
      const cred = EmailAuthProvider.credentialWithLink(
        email,
        oobSession.oobLink
      );
      const { user: original } = await signInAnonymously(auth);

      expect(original.isAnonymous).to.be.true;
      const { user: linked, operationType } = await linkWithCredential(
        original,
        cred
      );

      expect(operationType).to.eq(OperationType.LINK);
      expect(linked.uid).to.eq(original.uid);
      expect(linked.isAnonymous).to.be.false;
      expect(auth.currentUser).to.eq(linked);
      expect(linked.email).to.eq(email);
      expect(linked.emailVerified).to.be.true;
    });

    it('can be linked to a custom token', async () => {
      const { user: original } = await signInWithCustomToken(
        auth,
        JSON.stringify({
          uid: 'custom-uid'
        })
      );

      const cred = EmailAuthProvider.credentialWithLink(
        email,
        oobSession.oobLink
      );
      const { user: linked } = await linkWithCredential(original, cred);

      expect(linked.uid).to.eq(original.uid);
      expect(auth.currentUser).to.eq(linked);
      expect(linked.email).to.eq(email);
      expect(linked.emailVerified).to.be.true;
    });

    it('cannot link if original account is deleted', async () => {
      const cred = EmailAuthProvider.credentialWithLink(
        email,
        oobSession.oobLink
      );
      const { user } = await signInAnonymously(auth);

      expect(user.isAnonymous).to.be.true;
      await deleteUser(user);
      await expect(linkWithCredential(user, cred)).to.be.rejectedWith(
        FirebaseError,
        'auth/user-token-expired'
      );
    });

    it('code can only be used once', async () => {
      const link = oobSession.oobLink;
      await signInWithEmailLink(auth, email, link);
      await expect(signInWithEmailLink(auth, email, link)).to.be.rejectedWith(
        FirebaseError,
        'auth/invalid-action-code'
      );
    });

    it('fetchSignInMethodsForEmail returns the correct values', async () => {
      const { user } = await signInWithEmailLink(
        auth,
        email,
        oobSession.oobLink
      );
      expect(await fetchSignInMethodsForEmail(auth, email)).to.eql([
        SignInMethod.EMAIL_LINK
      ]);

      await updatePassword(user, 'password');
      const updatedMethods = await fetchSignInMethodsForEmail(auth, email);
      expect(updatedMethods).to.have.length(2);
      expect(updatedMethods).to.include(SignInMethod.EMAIL_LINK);
      expect(updatedMethods).to.include(SignInMethod.EMAIL_PASSWORD);
    });

    it('throws an error if the wrong code is provided', async () => {
      const otherSession = await sendEmailLink(randomEmail());
      await expect(
        signInWithEmailLink(auth, email, otherSession.oobLink)
      ).to.be.rejectedWith(FirebaseError, 'auth/invalid-email');
    });
  });

  it('can be used to verify email', async () => {
    // Create an unverified user
    const { user } = await createUserWithEmailAndPassword(
      auth,
      email,
      'password'
    );
    expect(user.emailVerified).to.be.false;
    expect(await fetchSignInMethodsForEmail(auth, email)).to.eql([
      SignInMethod.EMAIL_PASSWORD
    ]);
    await sendEmailVerification(user);

    // Apply the email verification code
    await applyActionCode(auth, (await code(email)).oobCode);
    await user.reload();
    expect(user.emailVerified).to.be.true;
  });

  it('can be used to initiate password reset', async () => {
    const { user: original } = await createUserWithEmailAndPassword(
      auth,
      email,
      'password'
    );
    await sendEmailVerification(original); // Can only reset verified user emails
    await applyActionCode(auth, (await code(email)).oobCode);

    // Send and confirm the password reset
    await sendPasswordResetEmail(auth, email);
    const oobCode = (await code(email)).oobCode;
    expect(await verifyPasswordResetCode(auth, oobCode)).to.eq(email);
    await confirmPasswordReset(auth, oobCode, 'new-password');

    // Make sure the new password works and the old one doesn't
    const { user } = await signInWithEmailAndPassword(
      auth,
      email,
      'new-password'
    );
    expect(user.uid).to.eq(original.uid);
    expect(user.emailVerified).to.be.true;
    expect(await fetchSignInMethodsForEmail(auth, email)).to.eql([
      SignInMethod.EMAIL_PASSWORD
    ]);

    await expect(
      signInWithEmailAndPassword(auth, email, 'password')
    ).to.be.rejectedWith(FirebaseError, 'auth/wrong-password');
  });

  // Test is ignored for now as the emulator does not currently support the
  // verify-and-change-email operation.
  xit('verifyBeforeUpdateEmail waits until flow completes', async () => {
    const updatedEmail = randomEmail();

    // Create an initial user with the basic email
    await sendSignInLinkToEmail(auth, email, BASE_SETTINGS);
    const { user } = await signInWithEmailLink(
      auth,
      email,
      (await code(email)).oobLink
    );
    await verifyBeforeUpdateEmail(user, updatedEmail, BASE_SETTINGS);
    expect(user.email).to.eq(email);

    // Finish the update email flow
    await applyActionCode(auth, (await code(updatedEmail)).oobCode);
    await user.reload();
    expect(user.emailVerified).to.be.true;
    expect(user.email).to.eq(updatedEmail);
    expect(auth.currentUser).to.eq(user);

    // Old email doesn't work but new one does
    await expect(
      signInWithEmailAndPassword(auth, email, 'password')
    ).to.be.rejectedWith(FirebaseError, 'auth/alskdjf');
    const { user: newSignIn } = await signInWithEmailAndPassword(
      auth,
      updatedEmail,
      'password'
    );
    expect(newSignIn.uid).to.eq(user.uid);
  });
});
