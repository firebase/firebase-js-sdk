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
  updatePhoneNumber
} from '@firebase/auth-exp';
import {
  Auth,
  OperationType,
  ProviderId,
  UserCredential
} from '@firebase/auth-types-exp';
import { FirebaseError } from '@firebase/util';

import {
  cleanUpTestInstance,
  getTestInstance
} from '../../helpers/integration/helpers';

use(chaiAsPromised);

// NOTE: These tests don't use a real phone number. In order to run these tests
// you must whitelist the following phone numbers as "testing" numbers in the
// auth console
// https://console.firebase.google.com/u/0/project/_/authentication/providers
//   • +1 (555) 555-1000, SMS code 123456
//   • +1 (555) 555-2000, SMS code 654321

const PHONE_A = {
  number: '+15555551000',
  code: '123456'
};

const PHONE_B = {
  number: '+15555552000',
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
    verifier = new RecaptchaVerifier(fakeRecaptchaContainer, undefined, auth);
  });

  afterEach(async () => {
    await cleanUpTestInstance(auth);
    document.body.removeChild(fakeRecaptchaContainer);
  });

  it('allows user to sign up', async () => {
    const cr = await signInWithPhoneNumber(auth, PHONE_A.number, verifier);
    const userCred = await cr.confirm(PHONE_A.code);

    expect(auth.currentUser).to.eq(userCred.user);
    expect(userCred.operationType).to.eq(OperationType.SIGN_IN);

    const user = userCred.user;
    expect(user.isAnonymous).to.be.false;
    expect(user.uid).to.be.a('string');
    expect(user.phoneNumber).to.eq(PHONE_A.number);
  });

  it('anonymous users can link (and unlink) phone number', async () => {
    const { user } = await signInAnonymously(auth);
    const { uid: anonId } = user;

    const cr = await linkWithPhoneNumber(user, PHONE_A.number, verifier);
    const linkResult = await cr.confirm(PHONE_A.code);
    expect(linkResult.operationType).to.eq(OperationType.LINK);
    expect(linkResult.user.uid).to.eq(user.uid);
    expect(linkResult.user.phoneNumber).to.eq(PHONE_A.number);

    await unlink(user, ProviderId.PHONE);
    expect(auth.currentUser!.uid).to.eq(anonId);
    expect(auth.currentUser!.isAnonymous).to.be.true;
    expect(auth.currentUser!.phoneNumber).to.be.null;
  });

  context('with already-created user', () => {
    let signUpCred: UserCredential;

    function resetVerifier(): void {
      verifier.clear();
      verifier = new RecaptchaVerifier(fakeRecaptchaContainer, undefined, auth);
    }

    beforeEach(async () => {
      const cr = await signInWithPhoneNumber(auth, PHONE_A.number, verifier);
      signUpCred = await cr.confirm(PHONE_A.code);
      resetVerifier();
      await auth.signOut();
    });

    it('allows the user to sign in again', async () => {
      const cr = await signInWithPhoneNumber(auth, PHONE_A.number, verifier);
      const signInCred = await cr.confirm(PHONE_A.code);

      expect(signInCred.user.uid).to.eq(signUpCred.user.uid);
    });

    it('allows the user to update their phone number', async () => {
      let cr = await signInWithPhoneNumber(auth, PHONE_A.number, verifier);
      const { user } = await cr.confirm(PHONE_A.code);

      resetVerifier();

      const provider = new PhoneAuthProvider(auth);
      const verificationId = await provider.verifyPhoneNumber(
        PHONE_B.number,
        verifier
      );

      await updatePhoneNumber(
        user,
        PhoneAuthProvider.credential(verificationId, PHONE_B.code)
      );
      expect(user.phoneNumber).to.eq(PHONE_B.number);

      await auth.signOut();
      resetVerifier();

      cr = await signInWithPhoneNumber(auth, PHONE_B.number, verifier);
      const { user: secondSignIn } = await cr.confirm(PHONE_B.code);
      expect(secondSignIn.uid).to.eq(user.uid);
    });

    it('allows the user to reauthenticate with phone number', async () => {
      let cr = await signInWithPhoneNumber(auth, PHONE_A.number, verifier);
      const { user } = await cr.confirm(PHONE_A.code);
      const oldToken = user.refreshToken;

      resetVerifier();

      cr = await reauthenticateWithPhoneNumber(user, PHONE_A.number, verifier);
      await cr.confirm(PHONE_A.code);

      expect(user.refreshToken).not.to.eq(oldToken);
    });

    it('prevents reauthentication with wrong phone number', async () => {
      let cr = await signInWithPhoneNumber(auth, PHONE_A.number, verifier);
      const { user } = await cr.confirm(PHONE_A.code);

      resetVerifier();

      cr = await reauthenticateWithPhoneNumber(user, PHONE_B.number, verifier);
      await expect(cr.confirm(PHONE_B.code)).to.be.rejectedWith(
        FirebaseError,
        'auth/user-mismatch'
      );

      // We need to manually delete PHONE_B number since a failed
      // reauthenticateWithPhoneNumber does not trigger a state change
      resetVerifier();
      cr = await signInWithPhoneNumber(auth, PHONE_B.number, verifier);
      const { user: otherUser } = await cr.confirm(PHONE_B.code);
      await otherUser.delete();
    });
  });
});
