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
import {
  cleanUpTestInstance,
  generateValidPassword,
  getTestInstance
} from '../../helpers/integration/helpers';
import { getEmulatorUrl } from '../../helpers/integration/settings';
import { PasswordPolicyCustomStrengthOptions } from '../../../src/model/password_policy';
describe.runIf(!getEmulatorUrl())(
  'Integration test: password validation',
  () => {
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

    beforeEach(() => {
      auth = getTestInstance();
    });

    afterEach(async () => {
      await cleanUpTestInstance(auth);
    });

    describe('validatePassword', () => {
      // Password will always be invalid since the minimum min length is 6.
      const INVALID_PASSWORD = 'a';
      const TENANT_PARTIALLY_INVALID_PASSWORD = 'Password0123';

      it('considers valid passwords valid against the policy configured for the project', async () => {
        const password = await generateValidPassword(auth);
        expect((await validatePassword(auth, password)).isValid).toBe(true);
      });

      it('considers invalid passwords invalid against the policy configured for the project', async () => {
        // Even if there is no policy configured for the project, a minimum length of 6 will always be enforced.
        expect((await validatePassword(auth, INVALID_PASSWORD)).isValid).toBe(
          false
        );
      });

      it('considers valid passwords valid against the policy configured for the tenant', async () => {
        auth.tenantId = TEST_TENANT_ID;
        const password = await generateValidPassword(auth);
        const status = await validatePassword(auth, password);

        expect(status.isValid).toBe(true);
        expect(status.meetsMinPasswordLength).toBe(true);
        expect(status.meetsMaxPasswordLength).toBe(true);
        expect(status.containsLowercaseLetter).toBe(true);
        expect(status.containsUppercaseLetter).toBe(true);
        expect(status.containsNumericCharacter).toBe(true);
        expect(status.containsNonAlphanumericCharacter).toBe(true);
      });

      it('considers invalid passwords invalid against the policy configured for the tenant', async () => {
        auth.tenantId = TEST_TENANT_ID;
        let status = await validatePassword(auth, INVALID_PASSWORD);

        expect(status.isValid).toBe(false);
        expect(status.meetsMinPasswordLength).toBe(false);
        expect(status.meetsMaxPasswordLength).toBe(true);
        expect(status.containsLowercaseLetter).toBe(true);
        expect(status.containsUppercaseLetter).toBe(false);
        expect(status.containsNumericCharacter).toBe(false);
        expect(status.containsNonAlphanumericCharacter).toBe(false);

        status = await validatePassword(
          auth,
          TENANT_PARTIALLY_INVALID_PASSWORD
        );

        expect(status.isValid).toBe(false);
        expect(status.meetsMinPasswordLength).toBe(true);
        expect(status.meetsMaxPasswordLength).toBe(true);
        expect(status.containsLowercaseLetter).toBe(true);
        expect(status.containsUppercaseLetter).toBe(true);
        expect(status.containsNumericCharacter).toBe(true);
        expect(status.containsNonAlphanumericCharacter).toBe(false);
      });

      it('includes the password policy strength options in the returned status', async () => {
        auth.tenantId = TEST_TENANT_ID;
        const status = await validatePassword(auth, INVALID_PASSWORD);
        expect(status.passwordPolicy.customStrengthOptions).toEqual(
          EXPECTED_TENANT_CUSTOM_STRENGTH_OPTIONS
        );
      });
    });
  }
);
