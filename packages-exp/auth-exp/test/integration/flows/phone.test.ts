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

import {
  linkWithPhoneNumber,
  PhoneAuthProvider,
  reauthenticateWithPhoneNumber,
  RecaptchaVerifier,
  signInAnonymously,
  signInWithPhoneNumber,
  unlink,
  updatePhoneNumber,
  Auth,
  OperationType,
  ProviderId,
  UserCredential,
  signInWithCredential,
  ConfirmationResult,
  // eslint-disable-next-line import/no-extraneous-dependencies
} from '@firebase/auth-exp';
import { FirebaseError } from '@firebase/util';

import {
  cleanUpTestInstance,
  getTestInstance,
} from '../../helpers/integration/helpers';
import { getPhoneVerificationCodes } from '../../helpers/integration/emulator_rest_helpers';

use(chaiAsPromised);

// NOTE: These tests don't use a real phone number. In order to run these tests
// you must whitelist the following phone numbers as "testing" numbers in the
// auth console
// https://console.firebase.google.com/u/0/project/_/authentication/providers
//   • +1 (555) 555-1000, SMS code 123456
//   • +1 (555) 555-2000, SMS code 654321

const PHONE_A = {
  phoneNumber: '+15555551000',
  code: '123456'
};

const PHONE_B = {
  phoneNumber: '+15555552000',
  code: '654321'
};

describe('Integration test: phone auth', () => {
  let auth: Auth;
  let verifier: RecaptchaVerifier;
  let fakeRecaptchaContainer: HTMLElement;

  beforeEach(() => {
    auth = getTestInstance();
    fakeRecaptchaContainer = document.createElement('div');
    document.body.appendChild(fakeRecaptchaContainer);
    verifier = new RecaptchaVerifier(
      fakeRecaptchaContainer,
      undefined as any,
      auth
    );
  });

  afterEach(async () => {
    await cleanUpTestInstance(auth);
    document.body.removeChild(fakeRecaptchaContainer);
  });

  function resetVerifier(): void {
    verifier.clear();
    verifier = new RecaptchaVerifier(
      fakeRecaptchaContainer,
      undefined as any,
      auth
    );
  }

  /** If in the emulator, search for the code in the API */
  async function code(
    crOrId: ConfirmationResult | string,
    fallback: string
  ): Promise<string> {
    if (auth.emulatorConfig) {
      const codes = await getPhoneVerificationCodes();
      const vid = typeof crOrId === 'string' ? crOrId : crOrId.verificationId;
      return codes[vid].code;
    }

    return fallback;
  }

  it('allows user to sign up', async () => {
    const cr = await signInWithPhoneNumber(auth, PHONE_A.phoneNumber, verifier);
    const userCred = await cr.confirm(await code(cr, PHONE_A.code));

    expect(auth.currentUser).to.eq(userCred.user);
    expect(userCred.operationType).to.eq(OperationType.SIGN_IN);

    const user = userCred.user;
    expect(user.isAnonymous).to.be.false;
    expect(user.uid).to.be.a('string');
    expect(user.phoneNumber).to.eq(PHONE_A.phoneNumber);
  });

  it('anonymous users can link (and unlink) phone number', async () => {
    const { user } = await signInAnonymously(auth);
    const { uid: anonId } = user;

    const cr = await linkWithPhoneNumber(user, PHONE_A.phoneNumber, verifier);
    const linkResult = await cr.confirm(await code(cr, PHONE_A.code));
    expect(linkResult.operationType).to.eq(OperationType.LINK);
    expect(linkResult.user.uid).to.eq(user.uid);
    expect(linkResult.user.phoneNumber).to.eq(PHONE_A.phoneNumber);

    await unlink(user, ProviderId.PHONE);
    expect(auth.currentUser!.uid).to.eq(anonId);
    // Is anonymous stays false even after unlinking
    expect(auth.currentUser!.isAnonymous).to.be.false;
    expect(auth.currentUser!.phoneNumber).to.be.null;
  });

  it('anonymous users can upgrade using phone number', async () => {
    const { user } = await signInAnonymously(auth);
    const { uid: anonId } = user;

    const provider = new PhoneAuthProvider(auth);
    const verificationId = await provider.verifyPhoneNumber(
      PHONE_B.phoneNumber,
      verifier
    );

    await updatePhoneNumber(
      user,
      PhoneAuthProvider.credential(
        verificationId,
        await code(verificationId, PHONE_B.code)
      )
    );
    expect(user.phoneNumber).to.eq(PHONE_B.phoneNumber);

    await auth.signOut();
    resetVerifier();

    const cr = await signInWithPhoneNumber(auth, PHONE_B.phoneNumber, verifier);
    const { user: secondSignIn } = await cr.confirm(
      await code(cr, PHONE_B.code)
    );
    expect(secondSignIn.uid).to.eq(anonId);
    expect(secondSignIn.isAnonymous).to.be.false;
    expect(secondSignIn.providerData[0].phoneNumber).to.eq(PHONE_B.phoneNumber);
    expect(secondSignIn.providerData[0].providerId).to.eq('phone');
  });

  context('with already-created user', () => {
    let signUpCred: UserCredential;

    beforeEach(async () => {
      const cr = await signInWithPhoneNumber(
        auth,
        PHONE_A.phoneNumber,
        verifier
      );
      signUpCred = await cr.confirm(await code(cr, PHONE_A.code));
      resetVerifier();
      await auth.signOut();
    });

    it('allows the user to sign in again', async () => {
      const cr = await signInWithPhoneNumber(
        auth,
        PHONE_A.phoneNumber,
        verifier
      );
      const signInCred = await cr.confirm(await code(cr, PHONE_A.code));

      expect(signInCred.user.uid).to.eq(signUpCred.user.uid);
    });

    it('allows the user to update their phone number', async () => {
      let cr = await signInWithPhoneNumber(auth, PHONE_A.phoneNumber, verifier);
      const { user } = await cr.confirm(await code(cr, PHONE_A.code));

      resetVerifier();

      const provider = new PhoneAuthProvider(auth);
      const verificationId = await provider.verifyPhoneNumber(
        PHONE_B.phoneNumber,
        verifier
      );

      await updatePhoneNumber(
        user,
        PhoneAuthProvider.credential(
          verificationId,
          await code(verificationId, PHONE_B.code)
        )
      );
      expect(user.phoneNumber).to.eq(PHONE_B.phoneNumber);

      await auth.signOut();
      resetVerifier();

      cr = await signInWithPhoneNumber(auth, PHONE_B.phoneNumber, verifier);
      const { user: secondSignIn } = await cr.confirm(
        await code(cr, PHONE_B.code)
      );
      expect(secondSignIn.uid).to.eq(user.uid);
    });

    it('allows the user to reauthenticate with phone number', async () => {
      let cr = await signInWithPhoneNumber(auth, PHONE_A.phoneNumber, verifier);
      const { user } = await cr.confirm(await code(cr, PHONE_A.code));
      const oldToken = await user.getIdToken();

      resetVerifier();

      // Wait a bit to ensure the sign in time is different in the token
      await new Promise((resolve): void => {
        setTimeout(resolve, 1500);
      });

      cr = await reauthenticateWithPhoneNumber(
        user,
        PHONE_A.phoneNumber,
        verifier
      );
      await cr.confirm(await code(cr, PHONE_A.code));

      expect(await user.getIdToken()).not.to.eq(oldToken);
    });

    it('prevents reauthentication with wrong phone number', async () => {
      let cr = await signInWithPhoneNumber(auth, PHONE_A.phoneNumber, verifier);
      const { user } = await cr.confirm(await code(cr, PHONE_A.code));

      resetVerifier();

      cr = await reauthenticateWithPhoneNumber(
        user,
        PHONE_B.phoneNumber,
        verifier
      );
      await expect(cr.confirm(await code(cr, PHONE_B.code))).to.be.rejectedWith(
        FirebaseError,
        'auth/user-mismatch'
      );

      // We need to manually delete PHONE_B number since a failed
      // reauthenticateWithPhoneNumber does not trigger a state change
      resetVerifier();
      cr = await signInWithPhoneNumber(auth, PHONE_B.phoneNumber, verifier);
      const { user: otherUser } = await cr.confirm(
        await code(cr, PHONE_B.code)
      );
      await otherUser.delete();
    });

    it('handles account exists with credential errors', async () => {
      // PHONE_A is already a user. Try to link it with an email account
      const {user} = await signInAnonymously(auth);
      expect(user.uid).not.to.eq(signUpCred.user.uid);

      const provider = new PhoneAuthProvider(auth);
      const verificationId = await provider.verifyPhoneNumber(PHONE_A.phoneNumber, verifier);
      let error: FirebaseError|null = null;

      try {
        await updatePhoneNumber(user, PhoneAuthProvider.credential(verificationId, await code(verificationId, PHONE_A.code)));
      } catch (e) {
        error = e;
      }

      expect(error!.customData!.phoneNumber).to.eq(PHONE_A.phoneNumber);
      expect(error!.code).to.eq('auth/account-exists-with-different-credential');
      const credential = PhoneAuthProvider.credentialFromError(error!);
      expect(credential).not.be.null;
      const errorUserCred = await signInWithCredential(auth, credential!);
      expect(errorUserCred.user.uid).to.eq(signUpCred.user.uid);
    });
  });
});
