/**
 * @license
 * Copyright 2022 Google LLC
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
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
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

use(chaiAsPromised);
use(sinonChai);

let auth: Auth;
let totpSecret: TotpSecret;
let displayName: string;
let totpTimestamp: Date;
let emulatorUrl: string | null;
let mfaUser: MultiFactorUser | null;

describe(' Integration tests: Mfa enrollement using totp', () => {
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

  it('should not enroll if incorrect totp supplied', async function () {
    if (emulatorUrl) {
      this.skip();
    }

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
    ).to.be.rejectedWith('auth/invalid-verification-code');
  });

  it('should enroll using correct otp', async function () {
    if (emulatorUrl) {
      this.skip();
    }

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

    await expect(mfaUser.enroll(multiFactorAssertion, displayName)).to.be
      .fulfilled;
  });
});

describe('Integration tests: sign-in for mfa-enrolled users', () => {
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

  it('should not allow sign-in with incorrect totp', async function () {
    let resolver: any;
    if (emulatorUrl) {
      this.skip();
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);

      throw new Error('Signin should not have been successful');
    } catch (error) {
      expect(error).to.be.an.instanceOf(FirebaseError);
      expect((error as any).code).to.eql('auth/multi-factor-auth-required');

      resolver = getMultiFactorResolver(auth, error as any);
      expect(resolver.hints).to.have.length(1);

      const assertion = TotpMultiFactorGenerator.assertionForSignIn(
        resolver.hints[0].uid,
        incorrectTotpCode
      );

      await expect(resolver.resolveSignIn(assertion)).to.be.rejectedWith(
        'auth/invalid-verification-code'
      );
    }
  });

  it('should allow sign-in with for correct totp and unenroll successfully', async function () {
    let resolver: any;
    if (emulatorUrl) {
      this.skip();
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);

      throw new Error('Signin should not have been successful');
    } catch (error) {
      expect(error).to.be.an.instanceOf(FirebaseError);
      expect((error as any).code).to.eql('auth/multi-factor-auth-required');

      resolver = getMultiFactorResolver(auth, error as any);
      expect(resolver.hints).to.have.length(1);

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

      await expect(mfaUser.unenroll(resolver.hints[0].uid)).to.be.fulfilled;
      await expect(signInWithEmailAndPassword(auth, email, password)).to.be
        .fulfilled;
    }
  });
});
