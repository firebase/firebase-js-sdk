/**
 * @license
 * Copyright 2023 Google LLC
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
import { Auth, validatePassword } from '@firebase/auth';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  cleanUpTestInstance,
  generateValidPassword,
  getTestInstance
} from '../../helpers/integration/helpers';
import { getEmulatorUrl } from '../../helpers/integration/settings';
import { PasswordPolicyCustomStrengthOptions } from '../../../src/model/password_policy';

use(chaiAsPromised);

describe('Integration test: password validation', () => {
  let auth: Auth;

  const TEST_TENANT_ID = 'passpol-tenant-d7hha';
  const EXPECTED_TENANT_CUSTOM_STRENGTH_OPTIONS: PasswordPolicyCustomStrengthOptions =
    {
      minPasswordLength: 8,
      maxPasswordLength: 24,
      containsLowercaseLetter: true,
      containsUppercaseLetter: true,
      containsNumericCharacter: true,
      containsNonAlphanumericCharacter: true
    };

  beforeEach(function () {
    auth = getTestInstance();

    if (getEmulatorUrl()) {
      this.skip();
    }
  });

  afterEach(async () => {
    await cleanUpTestInstance(auth);
  });

  context('validatePassword', () => {
    // Password will always be invalid since the minimum min length is 6.
    const INVALID_PASSWORD = 'a';
    const TENANT_PARTIALLY_INVALID_PASSWORD = 'Password0123';

    /*it('considers valid passwords valid against the policy configured for the project', async () => {
      const password = await generateValidPassword(auth);
      expect((await validatePassword(auth, password)).isValid).to.be.true;
    });

    it('considers invalid passwords invalid against the policy configured for the project', async () => {
      // Even if there is no policy configured for the project, a minimum length of 6 will always be enforced.
      expect((await validatePassword(auth, INVALID_PASSWORD)).isValid).to.be
        .false;
    });

    it('considers valid passwords valid against the policy configured for the tenant', async () => {
      auth.tenantId = TEST_TENANT_ID;
      const password = await generateValidPassword(auth);
      const status = await validatePassword(auth, password);

      expect(status.isValid).to.be.true;
      expect(status.meetsMinPasswordLength).to.be.true;
      expect(status.meetsMaxPasswordLength).to.be.true;
      expect(status.containsLowercaseLetter).to.be.true;
      expect(status.containsUppercaseLetter).to.be.true;
      expect(status.containsNumericCharacter).to.be.true;
      expect(status.containsNonAlphanumericCharacter).to.be.true;
    });

    it('considers invalid passwords invalid against the policy configured for the tenant', async () => {
      auth.tenantId = TEST_TENANT_ID;
      let status = await validatePassword(auth, INVALID_PASSWORD);

      expect(status.isValid).to.be.false;
      expect(status.meetsMinPasswordLength).to.be.false;
      expect(status.meetsMaxPasswordLength).to.be.true;
      expect(status.containsLowercaseLetter).to.be.true;
      expect(status.containsUppercaseLetter).to.be.false;
      expect(status.containsNumericCharacter).to.be.false;
      expect(status.containsNonAlphanumericCharacter).to.be.false;

      status = await validatePassword(auth, TENANT_PARTIALLY_INVALID_PASSWORD);

      expect(status.isValid).to.be.false;
      expect(status.meetsMinPasswordLength).to.be.true;
      expect(status.meetsMaxPasswordLength).to.be.true;
      expect(status.containsLowercaseLetter).to.be.true;
      expect(status.containsUppercaseLetter).to.be.true;
      expect(status.containsNumericCharacter).to.be.true;
      expect(status.containsNonAlphanumericCharacter).to.be.false;
    });

    it('includes the password policy strength options in the returned status', async () => {
      auth.tenantId = TEST_TENANT_ID;
      const status = await validatePassword(auth, INVALID_PASSWORD);
      expect(status.passwordPolicy.customStrengthOptions).to.eql(
        EXPECTED_TENANT_CUSTOM_STRENGTH_OPTIONS
      );
    });*/
  });
});
