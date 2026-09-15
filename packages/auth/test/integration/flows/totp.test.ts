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
  Auth,
  multiFactor,
  MultiFactorUser,
  signInWithEmailAndPassword,
  getMultiFactorResolver
} from '@firebase/auth';
import { FirebaseError } from '@firebase/app';
import {
  cleanUpTestInstance,
  getTestInstance,
  getTotpCode,
  email,
  password,
  incorrectTotpCode
} from '../../helpers/integration/helpers';

import {
  TotpMultiFactorGenerator,
  TotpSecret
} from '../../../src/mfa/assertions/totp';
import { getEmulatorUrl } from '../../helpers/integration/settings';
let auth: Auth;
let totpSecret: TotpSecret;
let displayName: string;
let totpTimestamp: Date;
let emulatorUrl: string | null;
let mfaUser: MultiFactorUser | null;

/**
 * TOTP tests disabled until they can be rewritten without requiring a
 * permanent account.
 */

// eslint-disable-next-line no-restricted-properties
describe.skip(' Integration tests: Mfa enrollment using totp', () => {
  beforeEach(async () => {
    emulatorUrl = getEmulatorUrl();
    if (!emulatorUrl) {
      mfaUser = null;
      auth = getTestInstance();
      displayName = 'totp-integration-test';
    }
  });

  afterEach(async () => {
    if (!emulatorUrl) {
      if (mfaUser && mfaUser.enrolledFactors.length > 0) {
        for (let i = 0; i < mfaUser.enrolledFactors.length; i++) {
          await mfaUser.unenroll(mfaUser.enrolledFactors[i]);
        }
      }
      await cleanUpTestInstance(auth);
    }
  });

  it('should not enroll if incorrect totp supplied', async () => {
    const cr = await signInWithEmailAndPassword(auth, email, password);
    mfaUser = multiFactor(cr.user);
    const session = await mfaUser.getSession();
    totpSecret = await TotpMultiFactorGenerator.generateSecret(session);

    const multiFactorAssertion =
      TotpMultiFactorGenerator.assertionForEnrollment(
        totpSecret,
        incorrectTotpCode
      );

    await expect(
      mfaUser.enroll(multiFactorAssertion, displayName)
    ).rejects.toThrow('auth/invalid-verification-code');
  });

  it('should enroll using correct otp', async () => {
    const cr = await signInWithEmailAndPassword(auth, email, password);
    mfaUser = multiFactor(cr.user);
    const session = await mfaUser.getSession();
    totpSecret = await TotpMultiFactorGenerator.generateSecret(session);
    totpTimestamp = new Date();
    const totpVerificationCode = getTotpCode(
      totpSecret.secretKey,
      totpSecret.codeIntervalSeconds,
      totpSecret.codeLength,
      totpTimestamp
    );

    const multiFactorAssertion =
      TotpMultiFactorGenerator.assertionForEnrollment(
        totpSecret,
        totpVerificationCode
      );

    await expect(
      mfaUser.enroll(multiFactorAssertion, displayName)
    ).resolves.toBeDefined();
  });
});

// eslint-disable-next-line no-restricted-properties
describe.skip('Integration tests: sign-in for mfa-enrolled users', () => {
  beforeEach(async () => {
    emulatorUrl = getEmulatorUrl();
    mfaUser = null;

    if (!emulatorUrl) {
      auth = getTestInstance();
      displayName = 'totp-integration-test';

      const cr = await signInWithEmailAndPassword(auth, email, password);
      mfaUser = multiFactor(cr.user);
      const session = await mfaUser.getSession();
      totpSecret = await TotpMultiFactorGenerator.generateSecret(session);
      totpTimestamp = new Date();
      const totpVerificationCode = getTotpCode(
        totpSecret.secretKey,
        totpSecret.codeIntervalSeconds,
        totpSecret.codeLength,
        totpTimestamp
      );

      const multiFactorAssertion =
        TotpMultiFactorGenerator.assertionForEnrollment(
          totpSecret,
          totpVerificationCode
        );

      await mfaUser.enroll(multiFactorAssertion, displayName);
    }
  });

  afterEach(async () => {
    if (!emulatorUrl) {
      if (mfaUser && mfaUser.enrolledFactors.length > 0) {
        for (let i = 0; i < mfaUser.enrolledFactors.length; i++) {
          await mfaUser.unenroll(mfaUser.enrolledFactors[i]);
        }
      }
      await cleanUpTestInstance(auth);
    }
  });

  it('should not allow sign-in with incorrect totp', async () => {
    let resolver: any;
    try {
      await signInWithEmailAndPassword(auth, email, password);

      throw new Error('Signin should not have been successful');
    } catch (error) {
      expect(error).toBeInstanceOf(FirebaseError);
      expect((error as any).code).toEqual('auth/multi-factor-auth-required');

      resolver = getMultiFactorResolver(auth, error as any);
      expect(resolver.hints).toHaveLength(1);

      const assertion = TotpMultiFactorGenerator.assertionForSignIn(
        resolver.hints[0].uid,
        incorrectTotpCode
      );

      await expect(resolver.resolveSignIn(assertion)).rejects.toThrow(
        'auth/invalid-verification-code'
      );
    }
  });

  it('should allow sign-in with for correct totp and unenroll successfully', async () => {
    let resolver: any;
    try {
      await signInWithEmailAndPassword(auth, email, password);

      throw new Error('Signin should not have been successful');
    } catch (error) {
      expect(error).toBeInstanceOf(FirebaseError);
      expect((error as any).code).toEqual('auth/multi-factor-auth-required');

      resolver = getMultiFactorResolver(auth, error as any);
      expect(resolver.hints).toHaveLength(1);

      totpTimestamp.setSeconds(totpTimestamp.getSeconds() + 30);

      const totpVerificationCode = getTotpCode(
        totpSecret.secretKey,
        totpSecret.codeIntervalSeconds,
        totpSecret.codeLength,
        totpTimestamp
      );

      const assertion = TotpMultiFactorGenerator.assertionForSignIn(
        resolver.hints[0].uid,
        totpVerificationCode
      );
      const userCredential = await resolver.resolveSignIn(assertion);
      mfaUser = multiFactor(userCredential.user);

      await expect(
        mfaUser.unenroll(resolver.hints[0].uid)
      ).resolves.toBeDefined();
      await expect(
        signInWithEmailAndPassword(auth, email, password)
      ).resolves.toBeDefined();
    }
  });
});
