/**
 * @license
 * Copyright 2026 Google LLC
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
  initializeTestInstance
} from '../../helpers/helpers';
import { getPhoneVerificationCodes } from '../../../../auth/test/helpers/integration/emulator_rest_helpers';
import {
  ConfirmationResult,
  RecaptchaVerifier,
  UserCredential
} from '@firebase/auth-types';
const PHONE_A = {
  phoneNumber: '+15555551000',
  code: '123456'
};

const PHONE_B = {
  phoneNumber: '+15555552000',
  code: '654321'
};

describe.skipIf(typeof document === 'undefined')(
  'Integration test: phone auth',
  () => {
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

      expect(firebase.auth().currentUser).toBe(userCred.user);
      expect(userCred.operationType).toBe('signIn');

      const user = userCred.user;
      expect(user!.isAnonymous).toBe(false);
      expect(typeof user!.uid).toBe('string');
      expect(user!.phoneNumber).toBe(PHONE_A.phoneNumber);
    });

    it('anonymous users can link (and unlink) phone number', async () => {
      const { user } = await firebase.auth().signInAnonymously();
      const { uid: anonId } = user!;

      const cr = await user!.linkWithPhoneNumber(PHONE_A.phoneNumber, verifier);
      const linkResult = await cr.confirm(await code(cr));
      expect(linkResult.operationType).toBe('link');
      expect(linkResult.user!.uid).toBe(user!.uid);
      expect(linkResult.user!.phoneNumber).toBe(PHONE_A.phoneNumber);

      await user!.unlink('phone');
      expect(firebase.auth().currentUser!.uid).toBe(anonId);
      // Is anonymous stays false even after unlinking
      expect(firebase.auth().currentUser!.isAnonymous).toBe(false);
      expect(firebase.auth().currentUser!.phoneNumber).toBeNull();
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
      expect(user!.phoneNumber).toBe(PHONE_B.phoneNumber);

      await firebase.auth().signOut();
      resetVerifier();

      const cr = await firebase
        .auth()
        .signInWithPhoneNumber(PHONE_B.phoneNumber, verifier);
      const { user: secondSignIn } = await cr.confirm(await code(cr));
      expect(secondSignIn!.uid).toBe(anonId);
      expect(secondSignIn!.isAnonymous).toBe(false);
      expect(secondSignIn!.providerData[0]!.phoneNumber).toBe(
        PHONE_B.phoneNumber
      );
      expect(secondSignIn!.providerData[0]!.providerId).toBe('phone');
    });

    describe('with already-created user', () => {
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

        expect(signInCred.user!.uid).toBe(signUpCred.user!.uid);
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
        expect(user!.phoneNumber).toBe(PHONE_B.phoneNumber);

        await firebase.auth().signOut();
        resetVerifier();

        cr = await firebase
          .auth()
          .signInWithPhoneNumber(PHONE_B.phoneNumber, verifier);
        const { user: secondSignIn } = await cr.confirm(await code(cr));
        expect(secondSignIn!.uid).toBe(user!.uid);
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

        expect(await user!.getIdToken()).not.toBe(oldToken);
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
        await expect(cr.confirm(await code(cr))).rejects.toThrow(
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
  }
);
