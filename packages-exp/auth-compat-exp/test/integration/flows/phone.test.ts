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
import { FirebaseError } from '@firebase/util';
import firebase from '@firebase/app-compat';
import {
  cleanUpTestInstance,
  initializeTestInstance
} from '../../helpers/helpers';
import { getPhoneVerificationCodes } from '../../../../auth-exp/test/helpers/integration/emulator_rest_helpers';
import {
  ConfirmationResult,
  RecaptchaVerifier,
  UserCredential
} from '@firebase/auth-types';

use(chaiAsPromised);

const PHONE_A = {
  phoneNumber: '+15555551000',
  code: '123456'
};

const PHONE_B = {
  phoneNumber: '+15555552000',
  code: '654321'
};

describe('Integration test: phone auth', () => {
  if (typeof document === 'undefined') {
    console.warn('Skipping phone auth tests in Node environment');
    return;
  }

  let verifier: RecaptchaVerifier;
  let fakeRecaptchaContainer: HTMLElement;

  beforeEach(() => {
    initializeTestInstance();
    fakeRecaptchaContainer = document.createElement('div');
    document.body.appendChild(fakeRecaptchaContainer);
    verifier = new firebase.auth.RecaptchaVerifier(
      fakeRecaptchaContainer,
      undefined as any
    );
  });

  afterEach(async () => {
    await cleanUpTestInstance();
    document.body.removeChild(fakeRecaptchaContainer);
  });

  function resetVerifier(): void {
    verifier.clear();
    verifier = new firebase.auth.RecaptchaVerifier(
      fakeRecaptchaContainer,
      undefined as any
    );
  }

  /** If in the emulator, search for the code in the API */
  async function code(crOrId: ConfirmationResult | string): Promise<string> {
    const codes = await getPhoneVerificationCodes();
    const vid = typeof crOrId === 'string' ? crOrId : crOrId.verificationId;
    return codes[vid].code;
  }

  it('allows user to sign up', async () => {
    const cr = await firebase
      .auth()
      .signInWithPhoneNumber(PHONE_A.phoneNumber, verifier);
    const userCred = await cr.confirm(await code(cr));

    expect(firebase.auth().currentUser).to.eq(userCred.user);
    expect(userCred.operationType).to.eq('signIn');

    const user = userCred.user;
    expect(user!.isAnonymous).to.be.false;
    expect(user!.uid).to.be.a('string');
    expect(user!.phoneNumber).to.eq(PHONE_A.phoneNumber);
  });

  it('anonymous users can link (and unlink) phone number', async () => {
    const { user } = await firebase.auth().signInAnonymously();
    const { uid: anonId } = user!;

    const cr = await user!.linkWithPhoneNumber(PHONE_A.phoneNumber, verifier);
    const linkResult = await cr.confirm(await code(cr));
    expect(linkResult.operationType).to.eq('link');
    expect(linkResult.user!.uid).to.eq(user!.uid);
    expect(linkResult.user!.phoneNumber).to.eq(PHONE_A.phoneNumber);

    await user!.unlink('phone');
    expect(firebase.auth().currentUser!.uid).to.eq(anonId);
    // Is anonymous stays false even after unlinking
    expect(firebase.auth().currentUser!.isAnonymous).to.be.false;
    expect(firebase.auth().currentUser!.phoneNumber).to.be.null;
  });

  it('anonymous users can upgrade using phone number', async () => {
    const { user } = await firebase.auth().signInAnonymously();
    const { uid: anonId } = user!;

    const provider = new firebase.auth.PhoneAuthProvider();
    const verificationId = await provider.verifyPhoneNumber(
      PHONE_B.phoneNumber,
      verifier
    );

    await user!.updatePhoneNumber(
      firebase.auth.PhoneAuthProvider.credential(
        verificationId,
        await code(verificationId)
      )
    );
    expect(user!.phoneNumber).to.eq(PHONE_B.phoneNumber);

    await firebase.auth().signOut();
    resetVerifier();

    const cr = await firebase
      .auth()
      .signInWithPhoneNumber(PHONE_B.phoneNumber, verifier);
    const { user: secondSignIn } = await cr.confirm(await code(cr));
    expect(secondSignIn!.uid).to.eq(anonId);
    expect(secondSignIn!.isAnonymous).to.be.false;
    expect(secondSignIn!.providerData[0]!.phoneNumber).to.eq(
      PHONE_B.phoneNumber
    );
    expect(secondSignIn!.providerData[0]!.providerId).to.eq('phone');
  });

  context('with already-created user', () => {
    let signUpCred: UserCredential;

    beforeEach(async () => {
      const cr = await firebase
        .auth()
        .signInWithPhoneNumber(PHONE_A.phoneNumber, verifier);
      signUpCred = await cr.confirm(await code(cr));
      resetVerifier();
      await firebase.auth().signOut();
    });

    it('allows the user to sign in again', async () => {
      const cr = await firebase
        .auth()
        .signInWithPhoneNumber(PHONE_A.phoneNumber, verifier);
      const signInCred = await cr.confirm(await code(cr));

      expect(signInCred.user!.uid).to.eq(signUpCred.user!.uid);
    });

    it('allows the user to update their phone number', async () => {
      let cr = await firebase
        .auth()
        .signInWithPhoneNumber(PHONE_A.phoneNumber, verifier);
      const { user } = await cr.confirm(await code(cr));

      resetVerifier();

      const provider = new firebase.auth.PhoneAuthProvider();
      const verificationId = await provider.verifyPhoneNumber(
        PHONE_B.phoneNumber,
        verifier
      );

      await user!.updatePhoneNumber(
        firebase.auth.PhoneAuthProvider.credential(
          verificationId,
          await code(verificationId)
        )
      );
      expect(user!.phoneNumber).to.eq(PHONE_B.phoneNumber);

      await firebase.auth().signOut();
      resetVerifier();

      cr = await firebase
        .auth()
        .signInWithPhoneNumber(PHONE_B.phoneNumber, verifier);
      const { user: secondSignIn } = await cr.confirm(await code(cr));
      expect(secondSignIn!.uid).to.eq(user!.uid);
    });

    it('allows the user to reauthenticate with phone number', async () => {
      let cr = await firebase
        .auth()
        .signInWithPhoneNumber(PHONE_A.phoneNumber, verifier);
      const { user } = await cr.confirm(await code(cr));
      const oldToken = await user!.getIdToken();

      resetVerifier();

      // Wait a bit to ensure the sign in time is different in the token
      await new Promise((resolve): void => {
        setTimeout(resolve, 1500);
      });

      cr = await user!.reauthenticateWithPhoneNumber(
        PHONE_A.phoneNumber,
        verifier
      );
      await cr.confirm(await code(cr));

      expect(await user!.getIdToken()).not.to.eq(oldToken);
    });

    it('prevents reauthentication with wrong phone number', async () => {
      let cr = await firebase
        .auth()
        .signInWithPhoneNumber(PHONE_A.phoneNumber, verifier);
      const { user } = await cr.confirm(await code(cr));

      resetVerifier();

      cr = await user!.reauthenticateWithPhoneNumber(
        PHONE_B.phoneNumber,
        verifier
      );
      await expect(cr.confirm(await code(cr))).to.be.rejectedWith(
        FirebaseError,
        'auth/user-mismatch'
      );

      // We need to manually delete PHONE_B number since a failed
      // reauthenticateWithPhoneNumber does not trigger a state change
      resetVerifier();
      cr = await firebase
        .auth()
        .signInWithPhoneNumber(PHONE_B.phoneNumber, verifier);
      const { user: otherUser } = await cr.confirm(await code(cr));
      await otherUser!.delete();
    });
  });
});
