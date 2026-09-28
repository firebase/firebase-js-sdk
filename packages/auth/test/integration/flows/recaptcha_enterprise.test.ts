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

// eslint-disable-next-line import/no-extraneous-dependencies
import {
  linkWithPhoneNumber,
  PhoneAuthProvider,
  reauthenticateWithPhoneNumber,
  signInAnonymously,
  signInWithPhoneNumber,
  unlink,
  updatePhoneNumber,
  Auth,
  OperationType,
  ProviderId
} from '@firebase/auth';
import {
  cleanUpTestInstance,
  getTestInstance
} from '../../helpers/integration/helpers';

import { getEmulatorUrl } from '../../helpers/integration/settings';
let auth: Auth;
let emulatorUrl: string | null;

// NOTE: These happy test cases don't use a real phone number. In order to run these tests
// you must allowlist the following phone number as "testing" numbers in the Auth console.
// https://console.firebase.google.com/u/0/project/_/authentication/providers
//   • +1 (555) 555-1000, SMS code 123456

const FICTIONAL_PHONE = {
  phoneNumber: '+15555551000',
  code: '123456'
};

// This phone number is not allowlisted. It is used in error test cases to catch errors, as
// using fictional phone number always receives success response from the server.
// Note: Don't use this for happy cases because we want to avoid sending actual SMS message.
const NONFICTIONAL_PHONE = {
  phoneNumber: '+15555553000'
};

// These tests are written when reCAPTCHA Enterprise is set to ENFORCE. In order to run these tests
// you must enable reCAPTCHA Enterprise in Cloud Console and set enforcement state for PHONE_PROVIDER
// to ENFORCE.
// The CI project has reCAPTCHA bot-score and toll fraud protection enabled.
describe.runIf(!getEmulatorUrl())(
  'Integration test: phone auth with reCAPTCHA Enterprise ENFORCE mode',
  () => {
    beforeEach(() => {
      emulatorUrl = getEmulatorUrl();
      if (!emulatorUrl) {
        auth = getTestInstance();
        // Sets to false to generate the real reCAPTCHA Enterprise token
        auth.settings.appVerificationDisabledForTesting = false;
      }
    });

    afterEach(async () => {
      if (!emulatorUrl) {
        await cleanUpTestInstance(auth);
      }
    });

    it('allows user to sign in with phone number', async () => {
      // This generates real recaptcha token and use it for verification
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        FICTIONAL_PHONE.phoneNumber
      );
      expect(confirmationResult.verificationId).not.toBeNull();

      const userCred = await confirmationResult.confirm('123456');
      expect(auth.currentUser).toBe(userCred.user);
      expect(userCred.operationType).toBe(OperationType.SIGN_IN);

      const user = userCred.user;
      expect(user.isAnonymous).toBe(false);
      expect(user.uid).to.be.a('string');
      expect(user.phoneNumber).toBe(FICTIONAL_PHONE.phoneNumber);
    });

    // eslint-disable-next-line no-restricted-properties
    it.skip('throws error if recaptcha token is invalid', async () => {
      // Test is ignored for now as it fails with auth/too-many-requests.
      // TODO: Increase quota or remove this test
      // Simulates a fake token by setting this to true
      auth.settings.appVerificationDisabledForTesting = true;

      // Use unallowlisted phone number to trigger real reCAPTCHA Enterprise verification
      // Since it will throw an error, no SMS will be sent.
      await expect(
        signInWithPhoneNumber(auth, NONFICTIONAL_PHONE.phoneNumber)
      ).rejects.toThrow('auth/invalid-recaptcha-token');
    });

    it('anonymous users can upgrade using phone number', async () => {
      const { user } = await signInAnonymously(auth);
      const { uid: anonId } = user;

      const provider = new PhoneAuthProvider(auth);
      const verificationId = await provider.verifyPhoneNumber(
        FICTIONAL_PHONE.phoneNumber
      );

      await updatePhoneNumber(
        user,
        PhoneAuthProvider.credential(verificationId, FICTIONAL_PHONE.code)
      );
      expect(user.phoneNumber).toBe(FICTIONAL_PHONE.phoneNumber);

      await auth.signOut();

      const cr = await signInWithPhoneNumber(auth, FICTIONAL_PHONE.phoneNumber);
      const { user: secondSignIn } = await cr.confirm(FICTIONAL_PHONE.code);

      expect(secondSignIn.uid).toBe(anonId);
      expect(secondSignIn.isAnonymous).toBe(false);
      expect(secondSignIn.providerData[0].phoneNumber).toBe(
        FICTIONAL_PHONE.phoneNumber
      );
      expect(secondSignIn.providerData[0].providerId).toBe('phone');
    });

    it('anonymous users can link (and unlink) phone number', async () => {
      const { user } = await signInAnonymously(auth);
      const { uid: anonId } = user;

      const confirmationResult = await linkWithPhoneNumber(
        user,
        FICTIONAL_PHONE.phoneNumber
      );
      const linkResult = await confirmationResult.confirm(FICTIONAL_PHONE.code);
      expect(linkResult.operationType).toBe(OperationType.LINK);
      expect(linkResult.user.uid).toBe(user.uid);
      expect(linkResult.user.phoneNumber).toBe(FICTIONAL_PHONE.phoneNumber);

      await unlink(user, ProviderId.PHONE);
      expect(auth.currentUser!.uid).toBe(anonId);
      // Is anonymous stays false even after unlinking
      expect(auth.currentUser!.isAnonymous).toBe(false);
      expect(auth.currentUser!.phoneNumber).toBeNull();
    });

    it('allows the user to reauthenticate with phone number', async () => {
      // Create a phone user first
      let confirmationResult = await signInWithPhoneNumber(
        auth,
        FICTIONAL_PHONE.phoneNumber
      );
      const { user } = await confirmationResult.confirm(FICTIONAL_PHONE.code);
      const oldToken = await user.getIdToken();

      // Wait a bit to ensure the sign in time is different in the token
      await new Promise((resolve): void => {
        setTimeout(resolve, 1500);
      });

      confirmationResult = await reauthenticateWithPhoneNumber(
        user,
        FICTIONAL_PHONE.phoneNumber
      );
      await confirmationResult.confirm(FICTIONAL_PHONE.code);

      expect(await user.getIdToken()).not.toBe(oldToken);
    });
  }
);
